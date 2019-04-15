import { ILoggerLike } from "pomelo-util";

export enum EMode {
  PAC = "PAC",
  GLOBAL = "GLOBAL",
  MANUAL = "MANUAL",
}

export interface IBaseOptions {
  logger: ILoggerLike;
}
