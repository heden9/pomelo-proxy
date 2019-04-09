import * as fs from "fs";
import GenPAC from "genpac";
import * as http from "http";
import * as path from "path";
import SDKBase from "sdk-base";
import { promisify } from "util";

interface IPacManagerOptions {
  pacPort: number;
  socksHost: string;
  socksPort: number;
}

const debug = require("debug")("pomelo-client");
const mkdir = promisify(fs.mkdir);
const pomeloPath = path.join(process.env.HOME as string, ".pomelo");
const pacPath = path.join(pomeloPath, "proxy.pac");

export class PacManager extends SDKBase {
  private get _address() {
    return `${this._options.socksHost}:${this._options.socksPort}`;
  }

  private get _PROXY() {
    return `SOCKS5 ${this._address}; SOCKS ${this._address}; DIRECT`;
  }
  private _options: IPacManagerOptions;
  private _genPAC: GenPAC;
  private _server: http.Server | null = null;

  constructor(options: IPacManagerOptions) {
    super(options);
    this._options = options;
    this._genPAC = new GenPAC({
      output: pacPath,
      proxy: this._PROXY,
    });
  }

  public start() {
    this._generatePAC();
    this._server = http.createServer((req, res) => {
      debug("on connect", pacPath);
      fs.createReadStream(pacPath).pipe(res);
    }).listen(this._options.pacPort);
    return this.awaitFirst(this._server, ["error", "listening"]);
  }

  public close() {
    if (this._server) {
      this._server.close();
      return this.await(this._server, "close");
    }
    return Promise.resolve();
  }

  public address() {
    return `http://127.0.0.1:${this._options.pacPort}`;
  }

  private async _generatePAC() {
    debug("generatePAC", fs.existsSync(pomeloPath));
    if (!fs.existsSync(pomeloPath)) {
      await mkdir(pomeloPath);
    }
    this._genPAC.generate();
  }
}
