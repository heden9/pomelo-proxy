import { SSLocal } from "pomelo";

export class Instance {
  public static create() {
    if (!Instance.__cache) {
      Instance.__cache = new SSLocal({
        algorithm: "rc4",
        password: "welcome",
        port: 3000,
        serverHost: "127.0.0.1",
        serverPort: 9000,
      });
    }
    return Instance.__cache.start();
  }

  public static close() {
    if (!Instance.__cache) {
      return;
    }
    const promise = Instance.__cache.close();
    Instance.__cache = null;
    return promise;
  }

  private static __cache: SSLocal | null;
}
