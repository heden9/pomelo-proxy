import * as crypto from "crypto";
import * as net from "net";
import {
  ISocksConnectionBaseOptions,
  SocksConnectionBase,
} from "pomelo-core/build/base/connection";
import { IDecodeEventInfo } from "pomelo-core/build/protocol/type";
import { logClassDecorator, unpump } from "pomelo-util";
import pump from "pump";
import { Duplex } from "stream";
import { ISSLocalRequestModel, SSLocalRequest } from "./packet";

const debug = require("debug")("pomelo:ss-server-conn");

export interface ISSServerConnectionOptions
  extends ISocksConnectionBaseOptions {
  cipher: Duplex;
  decipher: Duplex;
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
  private readonly _connectTimeout: number;
  constructor(socket: net.Socket, options: ISSServerConnectionOptions) {
    super(socket, options);

    this._connectTimeout = options.connectTimeout || 3 * 1000;
    this._PacketClass.push(SSLocalRequest);
  }

  protected _beforeClose() {
    this._cipher.destroy();
    this._decipher.destroy();
  }

  protected async _handleResponse(info: IDecodeEventInfo) {
    unpump(...this._pipeline);
    const buf = await this.await(this._decoder, "end");
    this._destination = this._createProxy(info.data);
    this._socketBaseWrapper(this._destination, this._connectTimeout);
    this._destination.write(buf);
  }

  private _createProxy(data: ISSLocalRequestModel) {
    const destination = net.createConnection(
      data.port,
      data.address,
      async () => {
        destination.setTimeout(0);
        debug("createProxy, start [%s:%s] with [%s:%s]", data.address, data.port, this._socket.remoteAddress, this._socket.remotePort);
        console.log("[pomelo-ss-server] [%s:%s] connect to [%s:%s]", this._socket.remoteAddress, this._socket.remotePort, data.address, data.port);
        pump(
          this._socket,
          this._decipher,
          destination,
          this._cipher,
          this._socket,
        );
      },
    );
    return destination;
  }
}
