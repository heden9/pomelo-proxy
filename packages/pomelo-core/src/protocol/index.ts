import { ProtocolDecoder } from "./decoder";
import { ProtocolEncoder } from "./encoder";

export function encoder(options: any) {
  return new ProtocolEncoder({ ...options });
}

export function decoder(options: any) {
  return new ProtocolDecoder({ ...options });
}
