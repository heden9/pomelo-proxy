import { SmartBuffer } from "smart-buffer";

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type WithBuffer<T> = T | Buffer;

export enum ERRORS {
  PACKET_TO_BUFFER_ERROR = "PACKET_TO_BUFFER_ERROR",
  PACKET_TO_JSON_ERROR = "PACKET_TO_JSON_ERROR",
  PACKET_VALIDATE_ERROR = "PACKET_VALIDATE_ERROR",
  PACKET_READ_BUFFER_BATCH_ERROR = "PACKET_READ_BUFFER_BATCH_ERROR",
}

export enum ESocksModel {
  version = "version",
  nmMethods = "nmMethods",
  methods = "methods",
  method = "method",

  command = "command",
  reserved = "reserved",
  addressType = "addressType",
  address = "address",
  port = "port",

  userNameLen = "userNameLen",
  userName = "userName",
  passwordLen = "passwordLen",
  password = "password",

  status = "status",
}

export enum EPacketType {
  CONNECT_REQUEST = "CONNECT_REQUEST",
  CONNECT_RESPONSE = "CONNECT_RESPONSE",
  HANDSHAKE_REQUEST = "HANDSHAKE_REQUEST",
  HANDSHAKE_RESPONSE = "HANDSHAKE_RESPONSE",
  AUTH_REQUEST = "AUTH_REQUEST",
  AUTH_RESPONSE = "AUTH_RESPONSE",
}

export enum ESocksMethods {
  NO_AUTH = 0x00,
  GSSAPI = 0x01,
  USER_PASS = 0x02,
  NO_ACCEPT = 0xff,
}

export enum ESocksAddressLength {
  IPv4 = 4,
  IPv6 = 16,
}

export enum ESocksAuthVersion {
  v1 = 0x01,
}

export enum ESocksVersion {
  v4 = 0x04,
  v5 = 0x05,
}

export enum ESocksCommand {
  connect = 0x01,
  bind = 0x02,
  associate = 0x03,
}

export enum ESocksReply {
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

export enum ESocksAddressType {
  IPv4 = 0x01,
  domain = 0x03,
  IPv6 = 0x04,
}

export enum ESocksAuthStatus {
  SUCCEEDED = 0x00,
  UNASSIGNED = 0xff,
}

export enum EPacketModelType {
  int8 = "int8",
  int16 = "int16",
  string = "string",
}

export type TBufferValBase = number | string;
export type TBufferVal = TBufferValBase | TBufferValBase[];
export type TValidate<T> = (val: TBufferVal | undefined, model: IPacketModel<T>) => void;
export type TPacketModelWrite<T> = (buffer: SmartBuffer, options: T) => void;
export type TPacketModelRead<T> = (
  buffer: SmartBuffer,
  obj: Partial<T>,
  model: IPacketModel<T>,
  validate: TValidate<T>,
) => void;

export interface IPacketModel<T> {
  for?: keyof T;
  forceCheck?: boolean;
  read?: TPacketModelRead<T>;
  write?: TPacketModelWrite<T>;
  isArray?: boolean;
  type?: EPacketModelType;
  check?: {};
  key: keyof T;
}

export interface ISocksBaseOptions {
  version: number;
}

export type TCreateModelOptions<T> = Omit<IPacketModel<T>, "key">;

export interface IPacketMeta {
  data: Buffer;
  size: number;
  encodeRT: number;
}

// base
export interface ISocksPacket {
  toBuffer(): Buffer;
  toJSON(): any;
  packetLength(): number;
  setMeta(meta: IPacketMeta): void;
}
export interface ISocksPacketClass {
  displayName: string;
  new (optionsOrBuffer: Buffer | any): ISocksPacket;
}

// connectRequest
export interface ISocksConnectBaseModel extends ISocksBaseOptions {
  address: string;
  port: number;
  reserved: number;
  addressType: ESocksAddressType;
  command: number;
}

export interface ISocksConnectBaseOptions extends ISocksBaseOptions {
  address: string;
  port: number;
  command: number;
}

export interface ISocksConnectRequestOptions extends ISocksConnectBaseOptions {
  command: ESocksCommand;
}

export interface ISocksConnectResponseOptions extends ISocksBaseOptions {
  address: string;
  port: number;
  reply: ESocksReply;
}

export interface ISocksConnectResponseJsonModel extends ISocksConnectBaseModel {
  reply: ESocksReply;
}


// handshake
export interface ISocksHandshakeRequestOptions extends ISocksBaseOptions {
  methods: ESocksMethods[];
}

export interface ISocksHandshakeResponseOptions extends ISocksBaseOptions {
  method: ESocksMethods;
}

export interface ISocksHandshakeRequestModel extends ISocksHandshakeRequestOptions {
  nmMethods: number;
}

// auth
export interface ISocksAuthRequestOptions extends ISocksBaseOptions {
  userName: string;
  password: string;
}

export interface ISocksAuthRequestModel extends ISocksAuthRequestOptions {
  userNameLen: string;
  passwordLen: string;
}

export interface ISocksAuthResponseOptions extends ISocksBaseOptions {
  status: ESocksAuthStatus;
}

// options
export type TSocksConnectResponseOptionsOrBuffer = WithBuffer<ISocksConnectResponseOptions>;
export type TSocksConnectRequestOptionsOrBuffer = WithBuffer<ISocksConnectRequestOptions>;
export type TSocksConnectBaseOptionsOrBuffer = WithBuffer<ISocksConnectBaseOptions>;

export type TSocksHandshakeRequestOptionsOrBuffer = WithBuffer<ISocksHandshakeRequestOptions>;
export type TSocksHandshakeResponseOptionsOrBuffer = WithBuffer<ISocksHandshakeResponseOptions>;

export type TSocksAuthRequestOptionsOrBuffer = WithBuffer<ISocksAuthRequestOptions>;
export type TSocksAuthResponseOptionsOrBuffer = WithBuffer<ISocksAuthResponseOptions>;
export interface ISocksConnectRequest extends ISocksPacket {
  // toJSON():
}

// TODO: 收敛各个packet的构造参数
