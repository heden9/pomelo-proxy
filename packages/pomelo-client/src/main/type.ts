import { ILoggerLike } from "../../../pomelo-util/build";

export enum EMode {
  PAC = "PAC",
  GLOBAL = "GLOBAL",
  MANUAL = "MANUAL",
}

export interface IBaseOptions {
  logger: ILoggerLike;
}
