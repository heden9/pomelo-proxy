import { Socket } from "net";
import pump from "pump";
import { SocksBase } from "./base";
import * as protocol from "./protocol";
import { ISocksDecoder } from "./protocol/decoder";
import { ISocksEncoder } from "./protocol/encoder";
import {
  EPacketType,
  ESocksAuthStatus,
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
import { ERRORS, SocksClientError, TSocksCommandOption } from "./type";

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

interface ISocksClientEstablishedEvent {}

type TSocksClientCallback = (err: any, info: any) => void;

const debug = require("debug")("pomelo-core:client");
interface ISocksClient {
  on(event: "connect", listener: VoidFunction): void;
  on(
    event: "established",
    listener: (info: ISocksClientEstablishedEvent) => void,
  ): this;
  once(
    event: "established",
    listener: (info: ISocksClientEstablishedEvent) => void,
  ): this;
  emit(event: "established", info: ISocksClientEstablishedEvent): boolean;
}

export class SocksClient extends SocksBase implements ISocksClient {
  public static async createConnection(
    options: ISocksClientOptions,
    callback?: TSocksClientCallback,
  ): Promise<ISocksClientEstablishedEvent | undefined> {
    const client = new SocksClient(options);
    client.connect();
    let info;
    let err = null;
    try {
      info = (await client.awaitFirst(["established", "error"])).args;
    } catch (ex) {
      err = ex;
    }
    debug("createConnection, %s info: %o", err ? `error: ${err.message}` : "success!", info);
    client.removeAllListeners();
    if (typeof callback === "function") {
      callback(err, info);
      return;
    }
    return err ? Promise.reject(err) : info;
  }

  public finalErrorData: any;

  private get _protocol() {
    return this._options.protocol;
  }

  private _options: Required<ISocksClientOptions>;
  private _socket: Socket = new Socket();
  private _encoder: ISocksEncoder;
  private _decoder: ISocksDecoder;
  private _PacketClass: ISocksPacketClass[] = [SocksHandshakeResponse];

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

    // this._decoder.once(SocksHandshakeResponse.displayName, this._handleSocksHandshake);
    // this._decoder.once(SocksConnectResponse.displayName, this._handleSocksConnect);
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
        throw new SocksClientError(
          ERRORS.SOCKS_CLIENT_ERROR + `, invalid connect options`,
        );
      }
      // setNoDelay
      this._socket.setNoDelay(this._options.setNoDelay);
    }
  }

  private _removeInternalSocketHandlers() {
    // Pauses data flow of the socket (this is internally resumed after 'established' is emitted)
    this._encoder.unpipe(this._socket).unpipe(this._decoder);
    this._encoder.destroy();
    this._decoder.destroy();
    this._socket.pause();
    this._socket.removeListener("error", this._onError);
    this._socket.removeListener("close", this._onClose);
    this._socket.removeListener("connect", this._onConnect);
  }

  private _closeSocket(err: string) {
    if (this.finalErrorData) {
      return;
    }
    this.finalErrorData = err;

    debug("closeSocket");
    // Destroy Socket
    this._socket.destroy();

    // Remove internal listeners
    this._removeInternalSocketHandlers();

    // Fire 'error' event.
    this.emit("error", new SocksClientError(err));
  }

  private _sendSocks5Handshake() {
    // TODO: methods
    this._encoder.writePacket({
      methods: [ESocksMethods.NO_AUTH, ESocksMethods.USER_PASS],
      type: EPacketType.HANDSHAKE_REQUEST,
      version: ESocksVersion.v5,
    });
  }

  private _sendSocksConnect(data: ISocksBaseOptions) {
    debug("sendSocksConnect, start");
    this._encoder.writePacket({
      address: this._options.destination.address,
      command: ESocksCommand[this._options.command],
      port: this._options.destination.port,
      type: EPacketType.CONNECT_REQUEST,
      version: data.version,
    });
  }

  private _sendSocksAuth(data: ISocksBaseOptions) {
    debug("sendSocksAuth, start");
    this._encoder.writePacket({
      password: this._options.proxy.password || "",
      type: EPacketType.AUTH_REQUEST,
      userName: this._options.proxy.userName || "",
      version: data.version,
    });
  }

  private _handleSocksHandshake(data: ISocksHandshakeResponseOptions)  {
    debug("handleSocksHandshake, start, data: %o", data);
    switch (data.method) {
      case ESocksMethods.NO_AUTH:
        // TODO: push check
        debug("handleSocksHandshake, NO_AUTH");
        this._PacketClass.push(SocksConnectResponse);
        this._sendSocksConnect(data);
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
        this._removeInternalSocketHandlers();
        this.emit("established", { socket: this._socket });
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
    this._sendSocksConnect(data);
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
