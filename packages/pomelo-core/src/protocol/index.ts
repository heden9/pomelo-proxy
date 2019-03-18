import { IProtocolDecoderOptions, ProtocolDecoder } from "./decoder";
import { IProtocolEncoderOptions, ProtocolEncoder } from "./encoder";

export function encoder(options?: IProtocolEncoderOptions) {
  return new ProtocolEncoder(options);
}

export function decoder(options: IProtocolDecoderOptions) {
  return new ProtocolDecoder(options);
}
