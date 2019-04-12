import * as net from "net";
import { ISocksConnectionOptions, SocksConnection } from "pomelo-core";
import { ISocksConnectRequestOptions } from "pomelo-core/build/protocol/packet";
import { logClassDecorator } from "pomelo-util";
import pump from "pump";
import { Duplex } from "stream";
import { SSLocalRequest } from "./packet";

const debug = require("debug")("pomelo:ss-local-conn");

export interface ISSLocalConnectionOptions extends ISocksConnectionOptions {
  port: number;
  host: string;
  cipher: Duplex;
  decipher: Duplex;
}

@logClassDecorator(debug)
export class SSLocalConnection extends SocksConnection {
  protected _cipher: Duplex;
  protected _decipher: Duplex;
  private readonly _remotePort: number;
  private readonly _remoteHost: string;
  constructor(socket: net.Socket, options: ISSLocalConnectionOptions) {
    super(socket, options);
    this._remotePort = options.port;
    this._remoteHost = options.host;

    this._cipher = options.cipher;
    this._decipher = options.decipher;
  }

  protected _beforeClose() {
    this._cipher.destroy();
    this._decipher.destroy();
  }

  protected _createProxy(data: ISocksConnectRequestOptions) {
    const remote = net.createConnection(
      this._remotePort,
      this._remoteHost,
      () => {
        remote.setTimeout(0);
        debug("createProxy, start [%s:%s] with [%s:%s]", remote.remoteAddress, remote.remotePort, data.address, data.port);
        console.log("[pomelo-ss-local] [%s:%s] connect to [%s:%s]",  data.address, data.port, remote.remoteAddress, remote.remotePort);
        // ss-handshake packet
        const req = new SSLocalRequest({
          address: data.address,
          port: data.port,
          version: data.version,
        }).toBuffer();

        this._cipher.write(req);

        pump(
          this._socket,
          this._cipher,
          remote,
          this._decipher,
          this._socket,
        );
      },
    );
    return remote;
  }
}
