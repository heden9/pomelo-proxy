import { SmartBuffer } from "smart-buffer";

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export const enum ERRORS {
  PACKET_TO_BUFFER_ERROR = "PACKET_TO_BUFFER_ERROR",
  PACKET_TO_JSON_ERROR = "PACKET_TO_JSON_ERROR",
}

export const enum ESocksModel {
  version = "version",
  nmMethods = "nmMethods",
  methods = "methods",
  method = "method",

  command = "command",
  reserved = "reserved",
  addressType = "addressType",
  address = "address",
  port = "port",
}

export const enum ESocksMethods {
  NO_AUTH = 0x00,
  GSSAPI = 0x01,
  USER_PASS = 0x02,
  NO_ACCEPT = 0xff,
}

export const enum ESocksVersion {
  v4 = 0x04,
  v5 = 0x05,
}

export const enum ESocksCommand {
  connect = 0x01,
  bind = 0x02,
  associate = 0x03,
}

export const enum ESocksReply {
  SUCCEEDED = 0x00,
  GENERAL_SOCKS_SERVER_FAILURE = 0x01,
  CONNECTION_NOT_ALLOWED_BY_RULESET = 0x02,
  NETWORK_UNREACHABLE = 0x03,
  HOST_UNREACHABLE = 0x04,
  CONNECTION_REFUSED = 0x05,
  TTL_EXPIRED = 0x06,
  COMMAND_NOT_SUPPORTED = 0x07,
  ADDRESS_TYPE_NOT_SUPPORTED = 0x08,
  UNASSIGNED = 0xff,
}

export const enum ESocksAddressType {
  IPv4 = 0x01,
  domain = 0x03,
  IPv6 = 0x04,
}

export const enum EPacketModelType {
  int8 = "int8",
  int16 = "int16",
}

export type TPacketModelWrite<T> = (buffer: SmartBuffer, options: T) => void;
export type TPacketModelRead<T> = (buffer: SmartBuffer, obj: Partial<T>) => void;

export interface IPacketModel<T> {
  for?: keyof T;
  read?: TPacketModelRead<T>;
  write?: TPacketModelWrite<T>;
  isArray?: boolean;
  type?: EPacketModelType;
  key: keyof T;
}

export interface ISocksBaseOptions {
  version: ESocksVersion;
}

export type TCreateModelOptions<T> = Omit<IPacketModel<T>, "key">;
