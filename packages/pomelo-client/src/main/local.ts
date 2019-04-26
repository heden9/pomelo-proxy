import { ISSLocalOptions } from "pomelo";
import { terminate } from "pomelo-util";
import { BaseManager } from "./base-manager";
import { IBaseOptions } from "./type";
import { forkNode } from "./util";


/**
 * 新开进程来跑 ss-local-server，防止主进程被拖垮
 */
let count = 0;
const COUNT_LIMIT = -1;
export class LocalManager extends BaseManager<IBaseOptions> {
  protected get _loggerPrefix() {
    return "[pomelo][local-manager]";
  }

  private get _scriptPath() {
    return this._store.ssLocalScriptInfo.path;
  }

  // tslint:disable-next-line:variable-name
  private static __cache: ReturnType<typeof forkNode> | null;
  public async instance() {
    if (!LocalManager.__cache) {
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
      LocalManager.__cache = forkNode(
        scriptPath,
        [JSON.stringify(options)],
      );

      if (LocalManager.__cache.proc.stderr) {
        LocalManager.__cache.proc.stderr.on("data", (text) => {
          this.logger.error(text.toString());
        });
      }

      if (LocalManager.__cache.proc.stdout) {
        LocalManager.__cache.proc.stdout.on("data", (text) => {
          this.logger.warn(text.toString());
        });
      }
      // TODO: 熔断

      LocalManager.__cache.proc.once("error", (ex) => {
        // 一般认为是启动错误
        this.logger.error(ex);
        LocalManager.__cache = null;
      });

      LocalManager.__cache.catch((ex) => {
        this.logger.error(ex);
      }).then(() => {
        this.logger.warn("process:%s exit", (LocalManager.__cache as any).proc.pid);
        LocalManager.__cache = null;
        if (count > COUNT_LIMIT) {
          return;
        }
        process.nextTick(() => {
          this.instance();
          count ++;
          this.logger.info("reload:%s", (LocalManager.__cache as any).proc.pid);
        });
      });
    }
  }

  public async close() {
    if (!LocalManager.__cache) {
      return;
    }
    this.logger.info("close local-process: %d with timeout: %dms", LocalManager.__cache.proc.pid, 8000);
    await terminate(LocalManager.__cache.proc, 8000);
    LocalManager.__cache = null;
  }
}
