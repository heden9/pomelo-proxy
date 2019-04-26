import { ChildProcess } from "child_process";
import { ISSLocalOptions } from "pomelo";
import { terminate } from "pomelo-util";
import { BaseManager } from "./base-manager";
import { IBaseOptions } from "./type";
import { forkNode } from "./util";


/**
 * 新开进程来跑 ss-local-server，防止主进程被拖垮
 */
// const count = 0;
// const COUNT_LIMIT = -1;
export class LocalManager extends BaseManager<IBaseOptions> {
  protected get _loggerPrefix() {
    return "[pomelo][local-manager]";
  }

  private get _scriptPath() {
    return this._store.ssLocalScriptInfo.path;
  }

  // tslint:disable-next-line:variable-name
  private static proc: ReturnType<typeof forkNode> | null;
  private static retryCount = 0;
  private static retryLimit = 2;
  public async instance() {
    if (LocalManager.proc) {
      throw new Error(`already has on ss-local process(${LocalManager.proc.pid})`);
    }
    // TODO: register service
    // const options: ISSLocalOptions = {
    //   algorithm: "rc4",
    //   password: "welcome",
    //   port: this._store.localSocksPort,
    //   serverHost: "127.0.0.1",
    //   serverPort: 9000,
    // };
    // FIXME: dont commit
    const options: ISSLocalOptions = {
      algorithm: "aes-256-cfb",
      host: this._store.localSocksHost,
      password: "E8c7Nt",
      port: this._store.localSocksPort,
      serverHost: "45.77.20.146",
      serverPort: 1025,
    };
    const scriptPath = this._scriptPath;
    this.logger.info("Run fork %s %s %j", process.execPath, scriptPath, options);
    LocalManager.proc = forkNode(
      scriptPath,
      [JSON.stringify(options)],
    );
    this._procCommonWrapper(LocalManager.proc);

    const { event, args } = await this.awaitFirst(LocalManager.proc, ["error", "message"]);
    if (!(event === "message" && args[0].status === "READY")) {
      throw new Error("start-local failed");
    }
    return LocalManager.proc;
  }

  public async close() {
    if (!LocalManager.proc) {
      return;
    }
    this.logger.info("close local-process: %d with timeout: %dms", LocalManager.proc.pid, 8000);
    await terminate(LocalManager.proc, 8000);
    LocalManager.proc = null;
  }

  private _procCommonWrapper(proc: ChildProcess) {
    if (proc.stderr) {
      proc.stderr.on("data", (text) => {
        this.logger.error(text.toString());
      });
    }

    if (proc.stdout) {
      proc.stdout.on("data", (text) => {
        this.logger.warn(text.toString());
      });
    }

    proc.once("exit", async () => {
      this.logger.warn("process:%s exit", proc.pid);
      if (LocalManager.retryCount > LocalManager.retryLimit) {
        return;
      }
      const subProc = await this.instance();
      LocalManager.retryCount ++;
      this.logger.info("reload:%s", subProc.pid);
    });
  }
}
