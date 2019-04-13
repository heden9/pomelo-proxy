import * as fs from "fs";
import GenPAC from "genpac";
import * as http from "http";
import * as path from "path";
import SDKBase from "sdk-base";
import { promisify } from "util";
import { UserDefaultStore } from "./store";

const debug = require("debug")("pomelo-client");
const mkdir = promisify(fs.mkdir);
const pomeloPath = path.join(process.env.HOME as string, ".pomelo");
const pacPath = path.join(pomeloPath, "proxy.pac");

export class PacManager extends SDKBase {
  private get _address() {
    return `${this._store.localSocksHost}:${this._store.localSocksPort}`;
  }

  private get _PROXY() {
    return `SOCKS5 ${this._address}; SOCKS ${this._address}; DIRECT`;
  }

  private _store: UserDefaultStore;
  private _genPAC: GenPAC;
  private _server: http.Server | null = null;

  constructor(store: UserDefaultStore) {
    super();
    this._store = store;
    this._genPAC = new GenPAC({
      output: pacPath,
      proxy: this._PROXY,
    });
  }

  public async start() {
    await this._generatePAC();
    this._server = http.createServer((req, res) => {
      debug("on connect", pacPath);
      fs.createReadStream(pacPath).pipe(res);
    }).listen(this._store.pacServerPort);
    await this.awaitFirst(this._server, ["error", "listening"]);
  }

  public close() {
    if (this._server) {
      this._server.close();
      return this.await(this._server, "close");
    }
    return Promise.resolve();
  }

  public address() {
    return `http://127.0.0.1:${this._store.pacServerPort}`;
  }

  private async _generatePAC() {
    debug("generatePAC", fs.existsSync(pomeloPath));
    if (!fs.existsSync(pomeloPath)) {
      await mkdir(pomeloPath);
    }
    this._genPAC.generate();
  }
}
