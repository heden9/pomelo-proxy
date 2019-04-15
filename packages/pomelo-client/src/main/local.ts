// import { SSLocal } from "pomelo";

// export class LocalManager {
//   public static instance(options: { port: number, host: string }) {
//     if (!LocalManager.__cache) {
//       LocalManager.__cache = new SSLocal({
//         algorithm: "rc4",
//         password: "welcome",
//         port: options.port,
//         serverHost: "127.0.0.1",
//         serverPort: 9000,
//       });
//     }
//     return LocalManager.__cache.start();
//   }

//   public static close() {
//     if (!LocalManager.__cache) {
//       return;
//     }
//     const promise = LocalManager.__cache.close();
//     LocalManager.__cache = null;
//     return promise;
//   }

//   private static __cache: SSLocal | null;
// }

import * as os from "os";
import * as path from "path";
import { ISSLocalOptions } from "pomelo";
import { forkNode, terminate } from "pomelo-util";
import { BaseManager } from "./base-manager";
import { IBaseOptions } from "./type";

const platform = os.platform();
/**
 * 新开进程来跑 ss-local-server，防止主进程被拖垮
 */
let count = 0;
export class LocalManager extends BaseManager<IBaseOptions> {
  protected get _loggerPrefix() {
    return "[pomelo][local-manager]";
  }

  private get _scriptPath() {
    let name = "";
    if (platform === "darwin") {
      name = "macos";
    } else if (platform === "linux") {
      name = "linux";
    }
    return path.join(__static, `start-local-${name}`);
  }

  // tslint:disable-next-line:variable-name
  private static __cache: ReturnType<typeof forkNode> | null;
  public instance() {
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
      this.logger.info("forkNode %s with %j", scriptPath, options);
      LocalManager.__cache = forkNode(
        scriptPath,
        [JSON.stringify(options)],
      );
      // TODO: 熔断

      LocalManager.__cache.proc.once("error", (ex) => {
        // 一般认为是启动错误
        this.logger.error(ex);
        LocalManager.__cache = null;
      });

      LocalManager.__cache.catch(() => {
        this.logger.warn("process:%s exit", (LocalManager.__cache as any).proc.pid);
        LocalManager.__cache = null;
        if (count > 3) {
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
