import graceful from "graceful";
import * as net from "net";
import { SocksBase } from "./base";
import { ISocksConnection, SocksConnection, TAuthenticate } from "./connection";

const debug = require("debug")("pomelo-core:server");
export interface ISocksServerOptions {
  port: number;
  killTimeout?: number;
  authenticate?: TAuthenticate;
}

export class SocksServer extends SocksBase {
  public get listenPorts() {
    return [ this._publishPort ];
  }

  private _options: {
    port: number;
    killTimeout: number;
    authenticate?: TAuthenticate;
  };
  private _connections: Map<string, ISocksConnection> = new Map();
  private _publishPort: number = 0;
  private _servers: net.Server[] = [];
  private _started = false;
  constructor(options: ISocksServerOptions) {
    super(options);

    this._options = {
      killTimeout: 3000,
      ...options,
    };
    this._publishPort = options.port;
  }

  public async close() {
    debug("close, connections: %o", Array.from(this._connections.values()).map((c) => c.remoteAddress));
    // 1. 关闭 tcp server
    for (const server of this._servers) {
      server.close();
    }
    // 2. 强制关闭连接
    const closeTasks = [];
    for (const connection of this._connections.values()) {
      debug("close loop, instance[%s]", connection.remoteAddress);
      closeTasks.push(connection.close());
    }
    await Promise.all(closeTasks);
    this.emit("close");
    this.removeAllListeners();
    debug("close finished");
  }

  public async start() {
    debug("start, options: %o", this._options);
    if (!this._started) {
      this._started = true;

      for (const port of this.listenPorts) {
        const server = this._createServer(port);
        this._servers.push(server);
      }

      graceful({
        error: this._handleUncaughtError,
        killTimeout: this._options.killTimeout,
        server: this._servers,
      });
      Promise.all(
        this._servers.map((server) => this.awaitFirst(server, [ "listening", "error" ])))
        .then(() => {
          this._servers.forEach((server) => {
            const { port, address } = (server.address() as net.AddressInfo);
            debug("start, serverInstance[%s:%s] is ready", address, port);
          });
          this.emit("listening");
          this.ready(true);
        },    (err) => {
          this.ready(err);
        });
    }
    return this.ready();
  }

  private _handleUncaughtError = (ex: Error) => {
    console.warn("[pomelo-core:server] server is down, cause by uncaughtException in this process %s", process.pid);
    console.warn("[pomelo-core:server] uncaughtException [%s:%s]", ex.name, ex.message || "unknown");
  }

  private _handleConnection = async (socket: net.Socket) => {
    const { port, address } = (socket.address() as net.AddressInfo);
    debug("handleConnection, serverInstance[%s:%s]", address, port);

    const connection = new SocksConnection({ socket, authenticate: this._options.authenticate });
    connection.once("close", () => {
      debug("connection close");
      this._connections.delete(connection.remoteAddress);
    });
    try {
      await connection.awaitFirst(["established", "error"]);
      this._connections.set(connection.remoteAddress, connection);
      debug("handleConnection, create instance[%s]", connection.remoteAddress);
    } catch (ex) {
      console.log(ex);
      // TODO: log error
    }
  }

  private _createServer(port: number) {
    const server = net.createServer();
    server.once("error", (err) => { this.emit("error", err); });
    server.on("connection", this._handleConnection);
    server.listen(port, () => {
      const { port: realPort  } = server.address() as net.AddressInfo;
      if (port === this._publishPort && port === 0) {
        this._publishPort = realPort;
      }
      console.log("[pomelo-core:server] server is running on %s", realPort);
    });
    return server;
  }
}
