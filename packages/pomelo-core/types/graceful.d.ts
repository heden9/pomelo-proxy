declare module "graceful" {
  import * as net from "net";
  interface IGracefulOptions {
    killTimeout: number;
    server: net.Server[];
    error: (ex: any) => void;
  }

  function graceful(options: IGracefulOptions): void;
  export = graceful;
}
