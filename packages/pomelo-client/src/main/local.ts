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

import * as path from "path";
import { ISSLocalOptions } from "pomelo";
import { forkNode, terminate } from "pomelo-util";
import { BaseManager } from "./base-manager";
import { IBaseOptions } from "./type";

/**
 * 新开进程来跑 ss-local-server，防止主进程被拖垮
 */
export class LocalManager extends BaseManager<IBaseOptions> {
  protected get _loggerPrefix() {
    return "[pomelo][local-manager]";
  }
  // tslint:disable-next-line:variable-name
  private static __cache: ReturnType<typeof forkNode> | null;
  public instance() {
    if (!LocalManager.__cache) {
      // TODO: register service
      const options: ISSLocalOptions = {
        algorithm: "rc4",
        password: "welcome",
        port: this._store.localSocksPort,
        serverHost: "127.0.0.1",
        serverPort: 9000,
      };
      const scriptPath = path.join(__dirname, "./start-local");
      this.logger.info("forkNode %s with %j", scriptPath, options);
      LocalManager.__cache = forkNode(
        scriptPath,
        [JSON.stringify(options)],
      );
      // TODO: 熔断
      LocalManager.__cache.catch(() => {
        this.logger.warn("process:%s exit", (LocalManager.__cache as any).proc.pid);
        LocalManager.__cache = null;
        this.instance();
        this.logger.info("reload:%s", (LocalManager.__cache as any).proc.pid);
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
