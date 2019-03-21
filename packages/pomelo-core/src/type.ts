export class SocksClientError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export enum ERRORS {
  SOCKS_CLIENT_ERROR = "SOCKS_CLIENT_ERROR",
  SOCKET_CLOSED = "SOCKET_CLOSED",
}

export type TDecodeEvent = "decode";
export type TSocksCommandOption = "connect" | "bind" | "associate";
