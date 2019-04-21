import { ILoggerLike } from "pomelo-util";

export enum EMode {
  PAC = "PAC",
  GLOBAL = "GLOBAL",
  MANUAL = "MANUAL",
}

export interface IBaseOptions {
  logger: ILoggerLike;
}

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export interface IUpdateCacheMapData {
  version: string;
  platform: NodeJS.Platform;
  name: string;
  raw: any;
}
