import * as net from "net";
import { logClassDecorator } from "pomelo-util";
import pump from "pump";
import { ISocksConnectionBaseOptions, SocksConnectionBase } from "./base/connection";
import {
  EPacketType,
  ESocksAuthStatus,
  ESocksMethods,
  ESocksReply,
  ISocksAuthRequestOptions,
  ISocksBaseOptions,
  ISocksConnectRequestOptions,
  ISocksHandshakeRequestOptions,
  SocksAuthRequest,
  SocksConnectRequest,
  SocksHandshakeRequest,
} from "./protocol/packet";
import { IDecodeEventInfo } from "./protocol/type";
import { ERRORS } from "./type";

const debug = require("debug")("pomelo-core:connection");

export type TAuthenticate = (
  userName: string,
  password: string,
  socket: net.Socket,
  callback: () => void,
) => Promise<boolean> | boolean;

export interface ISocksConnectionOptions extends ISocksConnectionBaseOptions {
  connectTimeout?: number;
  authenticate?: TAuthenticate;
}

@logClassDecorator(debug)
export class SocksConnection extends SocksConnectionBase<ISocksConnectionOptions> {
  private _destination: net.Socket | null = null;
  private readonly _connectTimeout: number;
  constructor(socket: net.Socket, options: ISocksConnectionOptions = {}) {
    super(socket, options);

    this._connectTimeout = options.connectTimeout || 3 * 1000;
    this._PacketClass.push(SocksHandshakeRequest);
  }

  /**
   * @abstract
   * @param info
   */
  protected _handleResponse(info: IDecodeEventInfo) {
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
        this.close(ERRORS.SOCKS_UNKNOWN_RES_TYPE, `info${JSON.stringify(info.data)}`);
        break;
    }
  }

  protected _beforeClose() {
    if (this._destination) {
      this._destination.destroy();
    }
  }

  protected _createProxy(data: ISocksConnectRequestOptions) {
    const destination = net.createConnection(data.port, data.address, () => {
      debug("createProxy, start, success!");
      destination.setTimeout(0);
      pump(destination, this._socket, destination);
    });
    return destination;
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
    // this.emit("request", data);
    this._sendSocksConnect(data, ESocksReply.SUCCEEDED);

    this._isEstablished = true;
    this.ready(true);
    this.emit("established", this._socket);
    // remove
    this._removeInternalHandlers();

    this._destination = this._createProxy(data);
    this._socketBaseWrapper(this._destination, this._connectTimeout);
  }

  private _handleSocksHandshake(data: ISocksHandshakeRequestOptions) {
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
      this.close(ERRORS.SOCKS_HANDSHAKE_REJECTED, "no-accept handshake methods");
    }
  }

  private async _handleSocksAuth(data: ISocksAuthRequestOptions) {
    const authenticate = this._options.authenticate as TAuthenticate;
    // tslint:disable-next-line:no-empty
    const isValid = await authenticate(data.userName, data.password, this._socket, () => {});
    const status = isValid ? ESocksAuthStatus.SUCCEEDED : ESocksAuthStatus.UNASSIGNED;
    this._sendSocksAuth(data, status);

    if (!isValid) {
      await this.close(ERRORS.SOCKS_AUTH_REJECTED, `invalid userName/password(${data.userName}:${data.password})`);
    }
  }
}
