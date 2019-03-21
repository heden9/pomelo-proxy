import {
  EPacketType,
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
  | TSocksHandshakeResponseOptionsOrBuffer)
  & IEncoderPacketOptions;

export type TEncoderTaskQueue = [TEncoderCreatePacketOptions, IEncoderCallback];
