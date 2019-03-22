import { Socket } from "net";
import { pipeline } from "stream";
import { SocksBase } from "./base";
import { ISocksDecoder, SocksDecoder } from "./protocol/decoder";
import { ISocksEncoder, SocksEncoder } from "./protocol/encoder";
import {
  EPacketType,
  ESocksCommand,
  ESocksMethods,
  ESocksReply,
  ESocksVersion,
  ISocksConnectResponseJsonModel,
  ISocksHandshakeResponseOptions,
  SocksConnectResponse,
  SocksHandshakeResponse,
} from "./protocol/packet";
import { ERRORS, SocksClientError, TSocksCommandOption } from "./type";

export interface ISocksClientOptions {
  proxy: {
    type: ESocksVersion;
    port: number;
    host?: string;
    address?: string;
    userId?: string;
    password?: string;
  };
  destination: {
    address: string; // ipv4 | ipv6 | domain
    port: number;
  };
  command: TSocksCommandOption;
  setNoDelay?: boolean;
}

interface ISocksClientEstablishedEvent {}

type TSocksClientCallback = (err: any, info: any) => void;

const debug = require("debug")("pomelo-core:socks-client");
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
    debug("createConnection, error: %s, info: %o", err && err.message, info);
    client.removeAllListeners();
    if (typeof callback === "function") {
      callback(err, info);
      return;
    }
    return err ? Promise.reject(err) : info;
  }

  public finalErrorData: any;
  private _options: ISocksClientOptions;
  private _socket: Socket = new Socket();
  private _encoder: ISocksEncoder = new SocksEncoder();
  private _decoder: ISocksDecoder;

  constructor(options: ISocksClientOptions) {
    super(options);

    this._options = {
      setNoDelay: true,
      ...options,
    };

    this._decoder = new SocksDecoder({
      PacketClass: [SocksHandshakeResponse, SocksConnectResponse],
    });

    this._decoder.once(SocksHandshakeResponse.displayName, this._handleSocksHandshake);
    this._decoder.once(SocksConnectResponse.displayName, this._handleSocksConnect);
  }

  public connect(existingSocket?: Socket) {
    if (existingSocket) {
      this._socket = existingSocket;
    }

    pipeline(this._encoder, this._socket, this._decoder);
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
    this._encoder.writePacket({
      methods: [ESocksMethods.NO_AUTH, ESocksMethods.USER_PASS],
      type: EPacketType.HANDSHAKE_REQUEST,
      version: ESocksVersion.v5,
    });
  }

  private _sendSocksConnect(data: ISocksHandshakeResponseOptions) {
    debug("sendSocksConnect, start");
    this._encoder.writePacket({
      address: this._options.destination.address,
      command: ESocksCommand[this._options.command],
      port: this._options.destination.port,
      type: EPacketType.CONNECT_REQUEST,
      version: data.version,
    });
  }

  private _handleSocksHandshake = (data: ISocksHandshakeResponseOptions) => {
    debug("handleSocksHandshake, start, data: %o", data);
    switch (data.method) {
      case ESocksMethods.NO_AUTH:
        this._sendSocksConnect(data);
        break;
      case ESocksMethods.USER_PASS:
        break;
      default:
        this._closeSocket(ERRORS.SOCKS_UNKNOWN_AUTH_TYPE);
        break;
    }
  }

  private _handleSocksConnect = (data: ISocksConnectResponseJsonModel) => {
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
