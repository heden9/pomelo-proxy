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
import { UserDefaultStore } from "./store";

/**
 * 新开进程来跑 ss-local-server，防止主进程被拖垮
 */
export class LocalManager {
  // tslint:disable-next-line:variable-name
  private static __cache: ReturnType<typeof forkNode> | null;
  private _store: UserDefaultStore;
  constructor(store: UserDefaultStore) {
    this._store = store;
  }
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
      LocalManager.__cache = forkNode(
        path.join(__dirname, "./start-local"),
        [JSON.stringify(options)],
      );
      LocalManager.__cache.catch(() => {
        console.log("[local-manager] process:%s exit", (LocalManager.__cache as any).proc.pid);
        LocalManager.__cache = null;
        this.instance();
        console.log("[local-manager] reload:%s", (LocalManager.__cache as any).proc.pid);
      });
    }
  }

  public async close() {
    if (!LocalManager.__cache) {
      return;
    }
    await terminate(LocalManager.__cache.proc, 8000);
    LocalManager.__cache = null;
  }
}
