import { EPacketType, ISocksBaseOptions } from "./packet/type";


export interface IEncoderPacketOptions {
  type: EPacketType;
}

export type IEncoderCallback = (err: any, data?: any) => void;
export type TEncoderTaskQueue = [IEncoderPacketOptions, IEncoderCallback];
