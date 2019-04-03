import * as crypto from "crypto";
import * as net from "net";

import { ISocksServerOptions, logClassDecorator, SocksServer } from "pomelo-core";
import { SSServerConnection } from "./ss-server-connection";

const debug = require("debug")("pomelo:ss-server");

export interface ISSServerOptions extends ISocksServerOptions {
  password: string;
  algorithm: string; // TODO: enum
}

@logClassDecorator(debug)
export class SSServer extends SocksServer {
  protected _password: string;
  protected _algorithm: string;
  constructor(options: ISSServerOptions) {
    super(options);

    this._password = options.password;
    this._algorithm = options.algorithm;
  }

  protected _createConnection(socket: net.Socket) {
    return new SSServerConnection(socket, {
      cipher: crypto.createCipheriv(this._algorithm, this._password, null),
      decipher: crypto.createDecipheriv(this._algorithm, this._password, null),
    });
  }
}
