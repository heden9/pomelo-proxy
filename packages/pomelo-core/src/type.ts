export class SocksError extends Error {
  public options: any;
  constructor(name: string, message?: string, options?: any) {
    super(message);
    this.name = name;
    this.options = options;
  }
}

export enum ERRORS {
  SOCKS_CLIENT_ERROR = "SOCKS_CLIENT_ERROR",
  SOCKS_UNKNOWN_AUTH_TYPE = "SOCKS_UNKNOWN_AUTH_TYPE",
  SOCKS_UNKNOWN_RES_TYPE = "SOCKS_UNKNOWN_RES_TYPE",
  SOCKS_CONNECTION_REJECTED = "SOCKS_CONNECTION_REJECTED",
  SOCKS_AUTH_REJECTED = "SOCKS_AUTH_REJECTED",
  SOCKS_HANDSHAKE_REJECTED = "SOCKS_HANDSHAKE_REJECTED",

  SOCKET_CLOSED = "SOCKET_CLOSED",
  SOCKET_CONNECT_TIMEOUT = "SOCKET_CONNECT_TIMEOUT",
  SOCKET_IDLE_TIMEOUT = "SOCKET_IDLE_TIMEOUT",
  SOCKET_REMOTE_FAILED = "SOCKET_REMOTE_FAILED",
  SOCKET_REMOTE_CLOSED = "SOCKET_REMOTE_CLOSED"
}

export type TSocksCommandOption = "connect" | "bind" | "associate";
