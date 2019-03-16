import { SmartBuffer } from "smart-buffer";
import { Writable } from "stream";

import { ERRORS } from "./constant";
import { ProtocolError } from "./helper";

export interface IProtocolDecoderOptions {

}

export class ProtocolDecoder extends Writable {
  private _buf: Buffer | null;
  private _options: IProtocolDecoderOptions;
  constructor(options?: Partial<IProtocolDecoderOptions>) {
    super(options);
    this._buf = null;
    this._options = {
      ...options,
    };
  }

  public _write(chunk: Buffer, encoding: string, callback: (error?: Error | null) => void) {
    this._buf = this._buf ? Buffer.concat([this._buf, chunk]) : chunk;

    try {
      let unfinished = false;
      do {
        unfinished = this._decode();
      } while (unfinished);
      callback();
    } catch (err) {
      callback(new ProtocolError(ERRORS.PROTOCOL_DECODE_ERROR));
    }
  }

  private _decode(): boolean {
    return false;
  }
}
