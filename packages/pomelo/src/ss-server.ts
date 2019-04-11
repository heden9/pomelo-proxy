import * as crypto from "crypto";
import * as net from "net";
import { ISocksServerOptions, SocksServer } from "pomelo-core";
import { logClassDecorator } from "pomelo-util";
import { Encrypt } from "./encrypt";
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
    // fix: should create encrypt each connection
    const encrypt = new Encrypt(this._algorithm, this._password);
    return new SSServerConnection(socket, {
      cipher: encrypt.createCipheriv(),
      decipher: encrypt.createDecipheriv(),
    });
  }
}
