import * as crypto from "crypto";
import * as net from "net";
import { logClassDecorator, unpump } from "pomelo-core";
import { ISocksConnectionBaseOptions, SocksConnectionBase } from "pomelo-core/build/base/connection";
import { IDecodeEventInfo } from "pomelo-core/build/protocol/type";
import pump = require("pump");
import { ISSLocalRequestModel, SSLocalRequest } from "./packet";

const debug = require("debug")("pomelo:ss-server-conn");

export interface ISSServerConnectionOptions extends ISocksConnectionBaseOptions {
  cipher: crypto.Cipher;
  decipher: crypto.Decipher;
  connectTimeout?: number;
}

@logClassDecorator(debug)
export class SSServerConnection extends SocksConnectionBase<ISSServerConnectionOptions> {
  protected get _pipeline() {
    return [
      this._encoder,
      this._cipher,
      this._socket,
      this._decipher,
      this._decoder,
    ];
  }

  protected get _cipher() {
    return this._options.cipher;
  }

  protected get _decipher() {
    return this._options.decipher;
  }

  private _destination: net.Socket | null = null;
  private _connectTimeout: number;
  constructor(socket: net.Socket, options: ISSServerConnectionOptions) {
    super(socket, options);

    this._connectTimeout = options.connectTimeout || 3 * 1000;
    this._PacketClass.push(SSLocalRequest);
    this._socket.on("data", (b) => {
      console.log(b);
    });
  }

  protected async _handleResponse(info: IDecodeEventInfo) {
    if (info.type !== SSLocalRequest.displayName) {
      this.close("unknown type");
      return;
    }
    unpump(...this._pipeline);
    const buf = await this.await(this._decoder, "end");
    this._destination = this._createProxy(info.data);
    this._destination.setNoDelay(true);
    this._destination.write(buf);
    this._destination.setTimeout(this._connectTimeout, () => {
      this.close("SOCKET_CONNECT_TIMEOUT", `connect timeout(${this._connectTimeout}ms)`);
    });
  }

  private _createProxy(data: ISSLocalRequestModel) {
    const destination = net.createConnection(data.port, data.address, async () => {
      destination.setTimeout(0);
      debug("createProxy, start [%s:%s]", data.address, data.port);
      pump(
        this._socket,
        this._decipher,
        destination,
        this._cipher,
        this._socket,
      );
    });
    return destination;
  }
}
