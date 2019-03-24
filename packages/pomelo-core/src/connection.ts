import { Socket } from "net";
import pump = require("pump");
import { SocksBase } from "./base";
import * as protocol from "./protocol";
import { ISocksDecoder } from "./protocol/decoder";
import { ISocksEncoder } from "./protocol/encoder";
import {
  EPacketType,
  ESocksAuthStatus,
  ESocksMethods,
  ESocksReply,
  ESocksVersion,
  ISocksAuthRequestOptions,
  ISocksBaseOptions,
  ISocksConnectRequestOptions,
  ISocksHandshakeRequestOptions,
  ISocksPacketClass,
  SocksAuthResponse,
  SocksConnectResponse,
  SocksHandshakeRequest,
} from "./protocol/packet";
import { IDecodeEventInfo, ISocksProtocol } from "./protocol/type";

const debug = require("debug")("pomelo-core:connection");

export type TAuthenticate = (
  userName: string,
  password: string,
  socket: Socket,
  callback: Function,
) => Promise<boolean> | boolean;

export interface ISocksConnectionOptions {
  socket: Socket;
  protocol: ISocksProtocol;
  maxIdleTime: number;
  authenticate?: TAuthenticate;
}

export class SocksConnection extends SocksBase {
  private get _socket() {
    return this._options.socket;
  }

  private get _protocol() {
    return this._options.protocol;
  }

  public remoteAddress: string;
  public isClosed: boolean = false;
  private _options: ISocksConnectionOptions;
  private _decoder: ISocksDecoder;
  private _encoder: ISocksEncoder = this._protocol.encoder();
  private _PacketClass: ISocksPacketClass[] = [SocksHandshakeRequest];
  private _timer: NodeJS.Timeout;
  private _lastActiveTime: number = Date.now();
  constructor(options: ISocksConnectionOptions) {
    super(options);

    this._options = {
      maxIdleTime: 90 * 1000,
      protocol,
      ...options,
    };

    this.remoteAddress = `${this._socket.remoteAddress}:${
      this._socket.remotePort
    }`;

    this._decoder = this._protocol.decoder({
      PacketClass: this._PacketClass,
    });
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
          this.close();
        }
      },
      this._options.maxIdleTime,
    );

    this.ready(true);
  }

  public close(err?: any) {
    if (this.isClosed) {
      return Promise.resolve();
    }

    this._socket.destroy(err);
    return this.await("close");
  }

  private _handleSocketClose = () => {
    debug("handleSocketClose, start,");
    this.isClosed = true;
    clearInterval(this._timer);
    this.emit("close");
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
    this._encoder.writePacket({
      method,
      type: EPacketType.HANDSHAKE_RESPONSE,
      version: data.version,
    });
  }

  private _sendSocksAuth(data: ISocksBaseOptions, status: ESocksAuthStatus) {
    this._encoder.writePacket({
      status,
      type: EPacketType.AUTH_RESPONSE,
      version: data.version,
    });
  }

  private _sendSocksConnect(data: ISocksConnectRequestOptions, reply: ESocksReply) {
    this._encoder.writePacket({
      address: data.address,
      port: data.port,
      reply,
      type: EPacketType.CONNECT_RESPONSE,
      version: data.version,
    });
  }

  private _handleSocksConnect(data: ISocksConnectRequestOptions) {
    // TODO: handle logic
    this._sendSocksConnect(data, ESocksReply.SUCCEEDED);
  }

  private _handleSocksHandshake(data: ISocksHandshakeRequestOptions) {
    let method = ESocksMethods.NO_ACCEPT;
    if (this._options.authenticate && data.methods.indexOf(ESocksMethods.USER_PASS) !== -1) {
      method = ESocksMethods.USER_PASS;
      this._PacketClass.push(SocksAuthResponse, SocksConnectResponse);
    } else if (!this._options.authenticate && data.methods.indexOf(ESocksMethods.NO_AUTH) !== -1) {
      method = ESocksMethods.NO_AUTH;
      this._PacketClass.push(SocksConnectResponse);
    }

    this._sendSocksHandshake(data, method);

    if (method === ESocksMethods.NO_ACCEPT) {
      // TODO: no-accept error msg
      this.close();
    }
  }

  private async _handleSocksAuth(data: ISocksAuthRequestOptions) {
    const authenticate = this._options.authenticate as TAuthenticate;
    const isValid = await authenticate(data.userName, data.password, this._socket, () => {});
    const status = isValid ? ESocksAuthStatus.SUCCEEDED : ESocksAuthStatus.UNASSIGNED;
    this._sendSocksAuth(data, status);

    if (!isValid) {
      // TODO: invalid error msg
      this.close();
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
