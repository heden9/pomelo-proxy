import * as childProcess from "child_process";
import * as net from "net";
import * as assert from "power-assert";
import * as util from "util";

const exec = util.promisify(childProcess.exec);

export function requestSocks(domain: string, port: number) {
  return exec(`curl http://${domain} --socks5 127.0.0.1:${port}`);
}
