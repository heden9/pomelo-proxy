import { Writable, WritableOptions } from "stream";

import { ERRORS } from "./constant";
import { ProtocolError } from "./helper";
import { EPacketType, ISocksPacketClass } from "./packet";
import { IDecodeEventInfo } from "./type";

const debug = require("debug")("pomelo-core:decoder");

export interface ISocksDecoderOptions extends WritableOptions {
  PacketClass: ISocksPacketClass | ISocksPacketClass[];
}

export interface ISocksDecoder extends Writable {
  destroy(): void;
  on(event: "decode" | EPacketType, listener: (info: IDecodeEventInfo) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
}

export class SocksDecoder extends Writable {
  private _buf: Buffer | null = null;
  private _PacketClasses: ISocksPacketClass[];
  private _index: number = 0;
  private _groupMode: boolean;
  constructor(options: ISocksDecoderOptions) {
    super(options);

    if (Array.isArray(options.PacketClass)) {
      this._groupMode = true;
      this._PacketClasses = options.PacketClass;
    } else {
      this._groupMode = false;
      this._PacketClasses = [options.PacketClass];
    }
  }

  public get isDone() {
    return !this._activePacketClass;
  }

  private get _activePacketClass(): ISocksPacketClass | undefined {
    return this._PacketClasses[this._index];
  }

  public _write(
    chunk: Buffer,
    encoding: string,
    callback: (error?: Error | null) => void,
  ) {
    debug("write, start, chunk: %o", chunk);
    this._buf = this._buf ? Buffer.concat([this._buf, chunk]) : chunk;

    try {
      let unfinished = false;
      do {
        debug("write, process loop, buf: %o", this._buf);

        if (this.isDone) {
          debug("write, is done");
          this.destroy();
          break;
        }
        unfinished = this._decode();
      } while (unfinished);
      callback();
    } catch (err) {
      console.log(err);
      callback(err);
    }
  }

  public destroy() {
    super.destroy();
    debug("destroy");
    this._buf = null;
    this.emit("close");
    this.removeAllListeners();
  }

  private _nextIndex() {
    if (this._groupMode) {
      this._index ++;
    }
  }

  private _decode(): boolean {
    if (!this._activePacketClass) {
      throw new ProtocolError(
        ERRORS.PROTOCOL_DECODE_ERROR
        + `expect options.PacketClass has a value, but got ${typeof this._activePacketClass}`,
      );
    }
    debug("decode, start, activePacketClass: %o", this._activePacketClass.name);
    if (!this._buf) {
      debug("decode, stop, invalid buffer");
      return false;
    }
    const packet = new this._activePacketClass(this._buf);
    const packetLength = packet.packetLength();
    const restLen = this._buf.length - packetLength;

    debug(
      "decode, bufferLength: %s, packetLength: %s, restLen: %s",
      this._buf.length,
      packetLength,
      restLen,
    );
    if (packetLength === 0 || this._buf.length < packetLength) {
      debug("decode, stop, no enough buffer length");
      return false;
    }

    const obj = packet.toJSON();
    debug("decode, emit: %s, obj: %o", this._activePacketClass.displayName, obj);
    this.emit("decode", { data: obj, type: this._activePacketClass.displayName });
    this.emit(this._activePacketClass.displayName, obj);

    this._nextIndex();
    if (restLen) {
      this._buf = this._buf.slice(packetLength);
      return true;
    }
    this._buf = null;
    return false;
  }
}
