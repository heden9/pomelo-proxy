import * as net from "net";
import pump from "pump";
import { SocksBase } from "./base";
import { unpump } from "./helper";
import * as protocol from "./protocol";
import { ISocksDecoder } from "./protocol/decoder";
import { ISocksEncoder } from "./protocol/encoder";
import {
  EPacketType,
  ESocksAuthStatus,
  ESocksMethods,
  ESocksReply,
  ISocksAuthRequestOptions,
  ISocksBaseOptions,
  ISocksConnectRequestOptions,
  ISocksHandshakeRequestOptions,
  ISocksPacketClass,
  SocksAuthRequest,
  SocksConnectRequest,
  SocksHandshakeRequest,
} from "./protocol/packet";
import { IDecodeEventInfo, ISocksProtocol } from "./protocol/type";
import { SocksError } from "./type";

const debug = require("debug")("pomelo-core:connection");

export type TAuthenticate = (
  userName: string,
  password: string,
  socket: net.Socket,
  callback: Function,
) => Promise<boolean> | boolean;

export interface ISocksConnectionOptions {
  socket: net.Socket;
  protocol: ISocksProtocol;
  maxIdleTime: number;
  authenticate?: TAuthenticate;
}

export interface _ISocksConnectionOptions {
  socket: net.Socket;
  protocol?: ISocksProtocol;
  maxIdleTime?: number;
  authenticate?: TAuthenticate;
}
export interface ISocksConnection {
  remoteAddress: string;
  isClosed: boolean;
  close(): Promise<void>;
  on(event: "close", listener: VoidFunction): this;
  once(event: "close", listener: VoidFunction): this;
}

export class SocksConnection extends SocksBase implements ISocksConnection {
  public get isClosed() {
    return this._isClosed;
  }

  private get _socket() {
    return this._options.socket;
  }

  private get _protocol() {
    return this._options.protocol;
  }

  public remoteAddress: string;

  private _options: ISocksConnectionOptions;
  private _decoder: ISocksDecoder;
  private _encoder: ISocksEncoder;
  private _PacketClass: ISocksPacketClass[] = [SocksHandshakeRequest];
  private _timer: NodeJS.Timeout;
  private _lastActiveTime: number = Date.now();
  private _isClosed: boolean = false;
  private _destination: net.Socket | null = null;
  constructor(options: _ISocksConnectionOptions) {
    super(options);

    this._options = {
      maxIdleTime: 90 * 1000,
      protocol,
      ...options,
    };

    this.remoteAddress = `${this._socket.remoteAddress}:${this._socket.remotePort}`;

    this._decoder = this._protocol.decoder({
      PacketClass: this._PacketClass,
    });
    this._encoder = this._protocol.encoder();
    pump(this._encoder, this._socket, this._decoder);
    this._socket.once("close", this._handleSocketClose);
    this._socket.once("error", this._handleSocketError);
    this._decoder.on("decode", this._handleSocksResponse);

    this._timer = setInterval(
      () => {
        const now = Date.now();
        if (now - this._lastActiveTime >= this._options.maxIdleTime) {
          console.warn(
            "[pomelo-core:connection] socket: %s is idle for %s(ms)",
            this.remoteAddress,
            this._options.maxIdleTime,
          );
          this._closeSocket();
        }
      },
      this._options.maxIdleTime,
    );

    this.ready(true);
  }

  public async close() {
    debug("close");
    if (this._isClosed) {
      return;
    }
    this._closeSocket();
    await this.await(this._socket, "close");
    this.emit("close");
    this.removeAllListeners();
  }

  private _closeSocket(err?: any) {
    debug("closeSocket");
    if (this._isClosed) {
      return;
    }
    this._isClosed = true;
    clearInterval(this._timer);

    this._socket.destroy(err);
    this._encoder.destroy();
    this._decoder.destroy();

    if (this._destination) {
      this._destination.destroy();
    }

    this._removeInternalHandlers();

    this._socket.removeListener("error", this._handleSocketError);
    this._socket.removeListener("close", this._handleSocketClose);
    if (err) {
      this.emit("error", new SocksError(err));
    }
  }

  private _removeInternalHandlers() {
    debug("removeInternalSocketHandlers");
    unpump(this._encoder, this._socket, this._decoder);
  }

  private _handleSocketClose = () => {
    debug("handleSocketClose, start,");
    this._closeSocket();
  }

  private _handleSocketError = (error: any) => {
    debug("handleSocketError, start,");
    if (error.code !== "ECONNRESET") {
      console.warn(
        "[pomelo-core:connection] error occured on socket: %s, errName: %s, errMsg: %s",
        this.remoteAddress,
        error.name,
        error.message,
      );
    }
  }

  private _sendSocksHandshake(data: ISocksBaseOptions, method: ESocksMethods) {
    debug("sendSocksHandshake, start, data: %o, method: %s", data, method);
    this._encoder.writePacket({
      method,
      type: EPacketType.HANDSHAKE_RESPONSE,
      version: data.version,
    });
  }

  private _sendSocksAuth(data: ISocksBaseOptions, status: ESocksAuthStatus) {
    debug("sendSocksAuth, start, data: %o, status: %s", data, status);
    this._encoder.writePacket({
      status,
      type: EPacketType.AUTH_RESPONSE,
      version: data.version,
    });
  }

  private _sendSocksConnect(data: ISocksConnectRequestOptions, reply: ESocksReply) {
    debug("sendSocksConnect, start, data: %o, reply: %s", data, reply);
    this._encoder.writePacket({
      address: data.address,
      port: data.port,
      reply,
      type: EPacketType.CONNECT_RESPONSE,
      version: data.version,
    });
  }

  private _createProxy(data: ISocksConnectRequestOptions) {
    debug("createProxy, start, data: %o", data);
    const destination = net.createConnection(data.port, data.address, () => {
      debug("createProxy, start, success!");
      pump(destination, this._socket, destination);
    });
    this._destination = destination;
  }

  private _handleSocksConnect(data: ISocksConnectRequestOptions) {
    debug("handleSocksConnect, data: %o", data);
    // TODO: handle logic
    // this.emit("request", data);
    this._sendSocksConnect(data, ESocksReply.SUCCEEDED);
    this.emit("connection", this._socket);
    // remove
    this._removeInternalHandlers();
    this._createProxy(data);
  }

  private _handleSocksHandshake(data: ISocksHandshakeRequestOptions) {
    debug("handleSocksHandshake, data: %o", data);
    let method = ESocksMethods.NO_ACCEPT;
    if (this._options.authenticate && data.methods.indexOf(ESocksMethods.USER_PASS) !== -1) {
      method = ESocksMethods.USER_PASS;
      this._PacketClass.push(SocksAuthRequest, SocksConnectRequest);
    } else if (!this._options.authenticate && data.methods.indexOf(ESocksMethods.NO_AUTH) !== -1) {
      method = ESocksMethods.NO_AUTH;
      this._PacketClass.push(SocksConnectRequest);
    }

    this._sendSocksHandshake(data, method);

    if (method === ESocksMethods.NO_ACCEPT) {
      // TODO: no-accept error msg
      this._closeSocket();
    }
  }

  private async _handleSocksAuth(data: ISocksAuthRequestOptions) {
    debug("handleSocksAuth, data: %o", data);
    const authenticate = this._options.authenticate as TAuthenticate;
    const isValid = await authenticate(data.userName, data.password, this._socket, () => {});
    const status = isValid ? ESocksAuthStatus.SUCCEEDED : ESocksAuthStatus.UNASSIGNED;
    this._sendSocksAuth(data, status);

    if (!isValid) {
      // TODO: invalid error msg
      this._closeSocket();
    }
  }

  private _handleSocksResponse = (info: IDecodeEventInfo) => {
    debug("handleSocksResponse, start, info: %o", info);
    this._lastActiveTime = Date.now();
    switch (info.type) {
      case EPacketType.CONNECT_REQUEST:
        this._handleSocksConnect(info.data);
        break;
      case EPacketType.HANDSHAKE_REQUEST:
        this._handleSocksHandshake(info.data);
        break;
      case EPacketType.AUTH_REQUEST:
        this._handleSocksAuth(info.data);
        break;
      default:
        // TODO: throw UNKNOWN type
        break;
    }
  }
}
