import { ISocksDecoderOptions, SocksDecoder } from "./decoder";
import { ISocksEncoderOptions, SocksEncoder } from "./encoder";

export function encoder(options?: ISocksEncoderOptions) {
  return new SocksEncoder(options);
}

export function decoder(options: ISocksDecoderOptions) {
  return new SocksDecoder(options);
}
