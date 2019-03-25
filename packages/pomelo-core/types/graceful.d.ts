declare module "graceful" {
  import * as net from "net";
  interface IGracefulOptions {
    killTimeout: number;
    server: net.Server[];
    error: () => void;
  }

  function graceful(options: IGracefulOptions): void;
  export = graceful;
}
