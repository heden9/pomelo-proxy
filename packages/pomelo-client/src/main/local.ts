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
import { forkNode } from "pomelo-util";

/**
 * 新开进程来跑 ss-local-server，防止主进程被拖垮
 */
export class LocalManager {
  public static instance(options: { port: number, host: string }) {
    if (!LocalManager.__cache) {
      LocalManager.__cache = forkNode(
        path.join(__dirname, "./start-local"),
        [JSON.stringify({
          algorithm: "rc4",
          password: "welcome",
          port: options.port,
          serverHost: "127.0.0.1",
          serverPort: 9000,
        })],
      );
    }
  }

  public static close() {
    // TODO: kill
    return LocalManager.__cache;
  }

  private static __cache: Promise<{}> | null;
}
