import { autobind } from "core-decorators";
import { Socket } from "net";
import { logClassDecorator, unpump } from "pomelo-util";
import pump from "pump";
import { SocksBase } from "./base/base";
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
  timeout?: number;
}

export interface ISocksClientEstablishedEvent {
  socket: Socket;
  instance: SocksClient;
}

type TSocksClientCallback = (err: any, info: any) => void;

const debug = require("debug")("pomelo-core:client");
interface ISocksClient {
  isClosed: boolean;
  isEstablished: boolean;
  connect(existingSocket?: Socket): void;
  close(): Promise<void>;
  on(event: "close", listener: VoidFunction): this;
  on(event: "established", listener: (info: ISocksClientEstablishedEvent) => void): this;

  once(event: "close", listener: VoidFunction): this;
  once(event: "established", listener: (info: ISocksClientEstablishedEvent) => void): this;
}

@logClassDecorator(debug)
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
    debug("createConnection, %s", err ? `error: ${err.message}` : "success!");
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

  public get isEstablished() {
    return this._isEstablished;
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
  private _isEstablished: boolean = false;
  constructor(options: ISocksClientOptions) {
    super(options);

    this._options = {
      protocol,
      setNoDelay: true,
      timeout: 3000,
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

    this.once("established", () => {
      this._isEstablished = true;
      this.ready(true);
      console.log("[pomelo-core:client] client is established with %s:%s", this._socket.remoteAddress, this._socket.remotePort);
    });
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
        throw new SocksError(ERRORS.SOCKS_CLIENT_ERROR, `invalid connect options`);
      }
      // setNoDelay
      this._socket.setNoDelay(this._options.setNoDelay);
      // setTimeout
      this._socket.setTimeout(this._options.timeout, () => {
        this.close(ERRORS.SOCKET_CONNECT_TIMEOUT, `connect timeout(${this._options.timeout}ms)`);
      });
    }
  }

  public close(err?: Error, force?: boolean): Promise<void>;
  public close(err?: string, message?: string | boolean, force?: boolean): Promise<void>;
  public async close(err?: Error | string, messageOrForce?: string | boolean, force?: boolean) {
    if (this._isClosed) {
      return;
    }

    if (typeof messageOrForce === "boolean") {
      force = messageOrForce;
      messageOrForce = "";
    }
    if (typeof err === "string") {
      err = new SocksError(err, messageOrForce);
    }

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
      // emit error after established
      if (this._isEstablished) {
        this.emit("error", err);
      } else {
        this.ready(err);
      }
      debug("closeSocket, err[%s:%s]", err.name, err.message);
    }

    if (!force) {
      await this.await(this._socket, "close");
    }
    this.emit("close");
    this.removeAllListeners();
  }

  private _removeInternalHandlers() {
    unpump(this._encoder, this._socket, this._decoder);
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
    this._encoder.writePacket({
      address: this._options.destination.address,
      command: ESocksCommand[this._options.command],
      port: this._options.destination.port,
      type: EPacketType.CONNECT_REQUEST,
      version: ESocksVersion.v5,
    });
  }

  private _sendSocksAuth(data: ISocksBaseOptions) {
    this._encoder.writePacket({
      password: this._options.proxy.password || "",
      type: EPacketType.AUTH_REQUEST,
      userName: this._options.proxy.userName || "",
      version: ESocksAuthVersion.v1,
    });
  }

  private _handleSocksHandshake(data: ISocksHandshakeResponseOptions)  {
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
        this.close(ERRORS.SOCKS_UNKNOWN_AUTH_TYPE);
        break;
    }
  }

  private _handleSocksConnect(data: ISocksConnectResponseJsonModel) {
    if (data.reply !== ESocksReply.SUCCEEDED) {
      this.close(
        ERRORS.SOCKS_CONNECTION_REJECTED,
        ESocksReply[data.reply],
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
    if (data.status !== ESocksAuthStatus.SUCCEEDED) {
      this.close(
        ERRORS.SOCKS_AUTH_REJECTED,
        ESocksAuthStatus[data.status],
      );
      return;
    }
    this._sendSocksConnect();
  }

  @autobind
  private _handleSocksResponse(info: IDecodeEventInfo) {
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

  @autobind
  private _onClose() {
    this.close(ERRORS.SOCKET_CLOSED, true);
  }

  @autobind
  private _onError(err: Error) {
    this.close(err);
  }

  @autobind
  private _onConnect() {
    this._socket.setTimeout(0);
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
