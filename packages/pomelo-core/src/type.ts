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
  SOCKS_CONNECTION_REJECTED = "SOCKS_CONNECTION_REJECTED",
  SOCKS_AUTH_REJECTED = "SOCKS_AUTH_REJECTED",

  SOCKET_CLOSED = "SOCKET_CLOSED",
  SOCKET_CONNECT_TIMEOUT = "SOCKET_CONNECT_TIMEOUT",
}

export type TSocksCommandOption = "connect" | "bind" | "associate";
