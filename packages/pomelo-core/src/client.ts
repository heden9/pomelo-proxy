import { Socket } from "net";
import pump from "pump";
import { SocksBase } from "./base";
import { unpump } from "./helper";
import * as protocol from "./protocol";
import { ISocksDecoder } from "./protocol/decoder";
import { ISocksEncoder } from "./protocol/encoder";
import {
  EPacketType,
  ESocksAuthStatus,
  ESocksAuthVersion,
  ESocksCommand,
  ESocksMethods,
  ESocksReply,
  ESocksVersion,
  ISocksAuthResponseOptions,
  ISocksBaseOptions,
  ISocksConnectResponseJsonModel,
  ISocksHandshakeResponseOptions,
  ISocksPacketClass,
  SocksAuthResponse,
  SocksConnectResponse,
  SocksHandshakeResponse,
} from "./protocol/packet";
import { IDecodeEventInfo, ISocksProtocol } from "./protocol/type";
import { ERRORS, SocksError, TSocksCommandOption } from "./type";

export interface ISocksClientOptions {
  proxy: {
    type: ESocksVersion;
    port: number;
    host?: string;
    address?: string;
    userName?: string;
    password?: string;
  };
  destination: {
    address: string; // ipv4 | ipv6 | domain
    port: number;
  };
  command: TSocksCommandOption;
  setNoDelay?: boolean;
  protocol?: ISocksProtocol;
}

export interface ISocksClientEstablishedEvent {
  socket: Socket;
  instance: SocksClient;
}

type TSocksClientCallback = (err: any, info: any) => void;

const debug = require("debug")("pomelo-core:client");
interface ISocksClient {
  isClosed: boolean;
  connect(existingSocket?: Socket): void;
  close(): Promise<void>;
  on(event: "connect" | "close", listener: VoidFunction): this;
  on(event: "established", listener: (info: ISocksClientEstablishedEvent) => void): this;

  once(event: "connect" | "close", listener: VoidFunction): this;
  once(event: "established", listener: (info: ISocksClientEstablishedEvent) => void): this;

}

export class SocksClient extends SocksBase implements ISocksClient {
  public static async createConnection(
    options: ISocksClientOptions,
    callback?: TSocksClientCallback,
  ): Promise<ISocksClientEstablishedEvent> {
    const client = new SocksClient(options);
    client.connect();
    let info;
    let err = null;
    try {
      info = (await client.awaitFirst(["established", "error"])).args[0];
    } catch (ex) {
      err = ex;
    }
    debug("createConnection, %s info: %o", err ? `error: ${err.message}` : "success!", info);
    client.removeAllListeners();
    if (typeof callback === "function") {
      callback(err, info);
      return info;
    }
    return err ? Promise.reject(err) : info;
  }

  public get isClosed() {
    return this._isClosed;
  }

  private get _protocol() {
    return this._options.protocol;
  }

  private _options: Required<ISocksClientOptions>;
  private _socket: Socket = new Socket();
  private _encoder: ISocksEncoder;
  private _decoder: ISocksDecoder;
  private _PacketClass: ISocksPacketClass[] = [SocksHandshakeResponse];
  private _isClosed: boolean = false;
  constructor(options: ISocksClientOptions) {
    super(options);

    this._options = {
      protocol,
      setNoDelay: true,
      ...options,
    };

    this._encoder = this._protocol.encoder();
    this._decoder = this._protocol.decoder({
      PacketClass: this._PacketClass,
    });

    this._decoder.on("decode", this._handleSocksResponse);
  }

  public connect(existingSocket?: Socket) {
    if (existingSocket) {
      this._socket = existingSocket;
    }

    pump(this._encoder, this._socket, this._decoder);
    this._socket.once("close", this._onClose);
    this._socket.once("error", this._onError);
    this._socket.once("connect", this._onConnect);

    if (existingSocket) {
      this._socket.emit("connect");
    } else {
      // connect
      if (this._options.proxy.port) {
        if (this._options.proxy.host) {
          this._socket.connect(
            this._options.proxy.port,
            this._options.proxy.host,
          );
        } else {
          this._socket.connect(this._options.proxy.port);
        }
      } else if (this._options.proxy.address) {
        this._socket.connect(this._options.proxy.address);
      } else {
        throw new SocksError(
          ERRORS.SOCKS_CLIENT_ERROR + `, invalid connect options`,
        );
      }
      // setNoDelay
      this._socket.setNoDelay(this._options.setNoDelay);
    }
  }

  public async close() {
    if (this._isClosed) {
      return;
    }
    this._closeSocket();
    await this.await(this._socket, "close");
    this.emit("close");
    this.removeAllListeners();
  }

  private _removeInternalHandlers() {
    debug("removeInternalSocketHandlers");
    unpump(this._encoder, this._socket, this._decoder);
  }

  private _closeSocket(err?: string) {
    if (this._isClosed) {
      return;
    }
    debug("closeSocket, err: %s", err);
    this._isClosed = true;

    // Destroy Socket
    this._socket.destroy();
    this._encoder.destroy();
    this._decoder.destroy();

    // Remove internal listeners
    this._removeInternalHandlers();

    this._socket.removeListener("error", this._onError);
    this._socket.removeListener("close", this._onClose);
    this._socket.removeListener("connect", this._onConnect);
    // Fire 'error' event.
    if (err) {
      this.emit("error", new SocksError(err));
    }
  }

  private _sendSocks5Handshake() {
    // TODO: methods
    this._encoder.writePacket({
      methods: [ESocksMethods.NO_AUTH, ESocksMethods.USER_PASS],
      type: EPacketType.HANDSHAKE_REQUEST,
      version: ESocksVersion.v5,
    });
  }

  private _sendSocksConnect() {
    debug("sendSocksConnect, start");
    this._encoder.writePacket({
      address: this._options.destination.address,
      command: ESocksCommand[this._options.command],
      port: this._options.destination.port,
      type: EPacketType.CONNECT_REQUEST,
      version: ESocksVersion.v5,
    });
  }

  private _sendSocksAuth(data: ISocksBaseOptions) {
    debug("sendSocksAuth, start");
    this._encoder.writePacket({
      password: this._options.proxy.password || "",
      type: EPacketType.AUTH_REQUEST,
      userName: this._options.proxy.userName || "",
      version: ESocksAuthVersion.v1,
    });
  }

  private _handleSocksHandshake(data: ISocksHandshakeResponseOptions)  {
    debug("handleSocksHandshake, start, data: %o", data);
    switch (data.method) {
      case ESocksMethods.NO_AUTH:
        // TODO: push check
        debug("handleSocksHandshake, NO_AUTH");
        this._PacketClass.push(SocksConnectResponse);
        this._sendSocksConnect();
        break;
      case ESocksMethods.USER_PASS:
        debug("handleSocksHandshake, USER_PASS");
        this._PacketClass.push(SocksAuthResponse, SocksConnectResponse);
        this._sendSocksAuth(data);
        break;
      default:
        this._closeSocket(ERRORS.SOCKS_UNKNOWN_AUTH_TYPE);
        break;
    }
  }

  private _handleSocksConnect(data: ISocksConnectResponseJsonModel) {
    debug("handleSocksConnect, start, data: %o", data);
    if (data.reply !== ESocksReply.SUCCEEDED) {
      this._closeSocket(
        `${ERRORS.SOCKS_CONNECTION_REJECTED} - ${
          ESocksReply[data.reply]
        }`,
      );
      return;
    }
    switch (ESocksCommand[this._options.command]) {
      case ESocksCommand.connect:
        this._removeInternalHandlers();
        this.emit("established", { socket: this._socket, instance: this });
        break;

      default:
        break;
    }
  }

  private _handleSocksAuth(data: ISocksAuthResponseOptions) {
    debug("handleSocksAuth, start, data: %o", data);
    if (data.status !== ESocksAuthStatus.SUCCEEDED) {
      this._closeSocket(
        `${ERRORS.SOCKS_CONNECTION_REJECTED} - ${
          ESocksAuthStatus[data.status]
        }`,
      );
      return;
    }
    this._sendSocksConnect();
  }

  private _handleSocksResponse = (info: IDecodeEventInfo) => {
    debug("handleSocksResponse, start, info: %o", info);
    switch (info.type) {
      case EPacketType.CONNECT_RESPONSE:
        this._handleSocksConnect(info.data);
        break;
      case EPacketType.HANDSHAKE_RESPONSE:
        this._handleSocksHandshake(info.data);
        break;
      case EPacketType.AUTH_RESPONSE:
        this._handleSocksAuth(info.data);
        break;
      default:
        break;
    }
  }

  private _onClose = () => {
    debug("onClose");
    this._closeSocket(ERRORS.SOCKET_CLOSED);
  }

  private _onError = (err: Error) => {
    debug("onError");
    this._closeSocket(err.message);
  }

  private _onConnect = () => {
    debug("onConnect");
    switch (this._options.proxy.type) {
      case ESocksVersion.v5:
        this._sendSocks5Handshake();
        break;
      case ESocksVersion.v4:
        // TODO:
        break;
      default:
        break;
    }
  }
}
