import * as crypto from "crypto";
import * as net from "net";

import { ISocksServerOptions, logClassDecorator, SocksServer } from "pomelo-core";
import { SSLocalConnection } from "./ss-local-connection";

const debug = require("debug")("pomelo:ss-local");

export interface ISSLocalOptions extends ISocksServerOptions {
  serverHost: string;
  serverPort: number;
  password: string;
  algorithm: string; // TODO: enum
}

@logClassDecorator(debug)
export class SSLocal extends SocksServer {
  protected _serverHost: string;
  protected _serverPort: number;
  protected _password: string;
  protected _algorithm: string;
  constructor(options: ISSLocalOptions) {
    super(options);

    this._serverHost = options.serverHost;
    this._serverPort = options.serverPort;
    this._password = options.password;
    this._algorithm = options.algorithm;
  }

  protected _createConnection(socket: net.Socket) {
    return new SSLocalConnection(socket, {
      cipher: crypto.createCipheriv(this._algorithm, this._password, null),
      decipher: crypto.createDecipheriv(this._algorithm, this._password, null),
      host: this._serverHost,
      port: this._serverPort,
    });
  }
}
