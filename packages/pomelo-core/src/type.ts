export class SocksClientError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export enum ERRORS {
  SOCKS_CLIENT_ERROR = "SOCKS_CLIENT_ERROR",
  SOCKET_CLOSED = "SOCKET_CLOSED",
  SOCKS_UNKNOWN_AUTH_TYPE = "SOCKS_UNKNOWN_AUTH_TYPE",
  SOCKS_CONNECTION_REJECTED = "SOCKS_CONNECTION_REJECTED",
}

export type TDecodeEvent = "decode";
export type TSocksCommandOption = "connect" | "bind" | "associate";
