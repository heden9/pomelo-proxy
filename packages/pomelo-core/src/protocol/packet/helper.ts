import { EPacketModelType, IPacketModel, TCreateModelOptions } from "./type";

export function createModel<T>(
  key: keyof T,
  options?: TCreateModelOptions<T>,
): IPacketModel<T>;

export function createModel<T>(
  key: keyof T,
  type: EPacketModelType,
  options?: TCreateModelOptions<T>,
): IPacketModel<T> & { type: EPacketModelType };

export function createModel<T>(
  key: keyof T,
  type?: EPacketModelType | TCreateModelOptions<T>,
  options?: TCreateModelOptions<T>,
): IPacketModel<T> {
  // tslint:disable-next-line:no-parameter-reassignment
  options = {
    type: EPacketModelType.int8,
    ...options,
  };
  if (typeof type === "object") {
    return {
      key,
      ...options,
      ...type,
    };
  }
  return {
    key,
    ...options,
    type: type || EPacketModelType.int8,
  };
}

export class ProtocolError extends Error {
  constructor(
    message: string,
    public options?: any,
    public model?: any,
  ) {
    super(message);
  }
}
