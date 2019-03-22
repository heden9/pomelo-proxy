import {
  EPacketType,
  TSocksAuthRequestOptionsOrBuffer,
  TSocksAuthResponseOptionsOrBuffer,
  TSocksConnectRequestOptionsOrBuffer,
  TSocksConnectResponseOptionsOrBuffer,
  TSocksHandshakeRequestOptionsOrBuffer,
  TSocksHandshakeResponseOptionsOrBuffer,
} from "./packet/type";

export interface IEncoderPacketOptions {
  type: EPacketType;
}

export type IEncoderCallback = (err: any, data?: any) => void;

export type TEncoderCreatePacketOptions = ( TSocksConnectRequestOptionsOrBuffer
  | TSocksConnectResponseOptionsOrBuffer
  | TSocksHandshakeRequestOptionsOrBuffer
  | TSocksHandshakeResponseOptionsOrBuffer
  | TSocksAuthResponseOptionsOrBuffer
  | TSocksAuthRequestOptionsOrBuffer)
  & IEncoderPacketOptions;

export type TEncoderTaskQueue = [TEncoderCreatePacketOptions, IEncoderCallback];

export type TDecodeEvent = "decode";

export interface IDecodeEventInfo {
  data: any;
  type: EPacketType;
}

export type TDecodeListener = (info: IDecodeEventInfo) => void;
