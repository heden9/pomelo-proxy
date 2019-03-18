import { SmartBuffer } from "smart-buffer";
import { createModel, ProtocolError } from "./helper";
import {
  EPacketModelType,
  ERRORS,
  ESocksModel,
  IPacketMeta,
  IPacketModel,
  ISocksBaseOptions,
  TBufferVal,
  TBufferValBase,
} from "./type";

const debug = require("debug")("pomelo-core:packet");

export interface ISocksPacket {
  toBuffer(): Buffer;
  toJSON(): Record<string, any>;
  packetLength(): number;
  setMeta(meta: IPacketMeta): void;
}
export interface ISocksPacketClass {
  displayName: string;
  new (optionsOrBuffer: Buffer | any): ISocksPacket;
}

type TBufferReader = (offset?: number) => number;
type TBufferWriter = (value: number, offset?: number) => SmartBuffer;

export class SocksV5PacketBase<T extends ISocksBaseOptions = ISocksBaseOptions> {
  public get models(): IPacketModel<T>[] {
    return (this.constructor as typeof SocksV5PacketBase).models;
  }

  public static models: IPacketModel<any>[] = [
    createModel(ESocksModel.version),
  ];

  public static headLength = 0;
  public meta: Partial<IPacketMeta> = {};
  protected _options: T | null = null;
  protected _buffer: Buffer | null = null;
  constructor(optionsOrBuffer: T | Buffer) {
    if (optionsOrBuffer instanceof Buffer) {
      this._buffer = optionsOrBuffer;
    } else {
      this._options = optionsOrBuffer;
    }
  }

  public setMeta(meta: IPacketMeta) {
    this.meta = meta;
  }

  public toBuffer() {
    debug("toBuffer start, options: %o, buffer: %o", this._options, this._buffer);
    if (this._options === null) {
      throw new ProtocolError(
        ERRORS.PACKET_TO_BUFFER_ERROR +
        ", _options's type expect to be `T extends ISocksBaseOptions`, but got "
        + typeof this._options,
      );
    }

    const buffer = new SmartBuffer();
    this.models.forEach((model) => {
      debug("toBuffer process loop, model: %o", model);
      const options = this._options as T;
      const value = options[model.key];
      const [writeBuff] = this._selectBufferMethod(buffer, model.type);
      if (typeof model.write === "function") {
        model.write(buffer, options);
        return;
      }

      if (model.for) {
        const keyForValue = options[model.for];
        if (typeof keyForValue !== "string" && !Array.isArray(keyForValue)) {
          throw new ProtocolError(
            ERRORS.PACKET_TO_BUFFER_ERROR +
              ", keyForValue expect to be string or array, but got " +
              typeof keyForValue,
            model,
          );
        }
        writeBuff(keyForValue.length);
        return;
      }

      if (model.isArray) {
        if (!Array.isArray(value)) {
          throw new ProtocolError(
            ERRORS.PACKET_TO_BUFFER_ERROR +
              ", value expect to be array, but got " +
              typeof value,
          );
        }
        value.forEach((val) => writeBuff(val));
        return;
      }

      if (typeof value !== "number") {
        throw new ProtocolError(
          ERRORS.PACKET_TO_BUFFER_ERROR +
            ", value expect to be number, but got " +
            typeof value,
          model,
        );
      }
      writeBuff(value);
    });
    const returnBuffer = buffer.toBuffer();
    debug("toBuffer end, result: %o", returnBuffer);
    return returnBuffer;
  }

  public toJSON() {
    if (this._buffer === null) {
      throw new ProtocolError(
        ERRORS.PACKET_TO_JSON_ERROR +
        ", _buffer's type expect to be buffer, but got "
        + typeof this._buffer,
      );
    }
    debug("toJSON start, options: %o, buffer: %o", this._options, this._buffer);

    const buffer = SmartBuffer.fromBuffer(this._buffer);
    const obj: Partial<T> = {};
    const sizeMap: Map<keyof T, number> = new Map();
    this.models.forEach((model) => {
      debug("toJSON process loop, model: %o", model);
      const [_, readBuffer] = this._selectBufferMethod(buffer, model.type);

      if (typeof model.read === "function") {
        model.read(buffer, obj, model, this._validateBufferVal);
        return;
      }

      // 尝试读取元素的size
      const size = sizeMap.get(model.key);
      const val: TBufferVal = size
        ? this._readBufferBatch(readBuffer, size)
        : readBuffer();
      // 校验
      this._validateBufferVal(val, model);
      // 如果使用了for，则记为指定元素的长度
      if (model.for) {
        sizeMap.set(model.for, val as number);
      }

      // FIXME: remove any
      obj[model.key] = val as any;
    });
    debug("toJSON end, result: %o", obj);
    return obj as T;
  }

  private _validateBufferVal(value: TBufferVal | undefined, model: IPacketModel<T>) {
    if (value == null || (model.isArray && !Array.isArray(value))) {
      throw new ProtocolError(
        ERRORS.PACKET_VALIDATE_ERROR
        + ", expect val's type to be number[] or string[] or string or number, but got " + typeof value,
      );
    }

    if (model.check) {
      const validValSet: TBufferValBase[] = Object.values(model.check);
      const validVal = Array.isArray(value)
        ? value.every((val: string | number) => validValSet.indexOf(val) !== -1)
        : validValSet.indexOf(value) !== -1;

      if (!validVal) {
        throw new ProtocolError(
          ERRORS.PACKET_VALIDATE_ERROR +
          `, invalid ${model.key}, expect ${model.key} in [${validValSet}], but got ${value}`,
        );
      }
    }
  }

  private _readBufferBatch(readBuffer: TBufferReader, count: number): number[] {
    const array: number[] = [];
    for (let index = 0; index < count; index++) {
      const val = readBuffer();
      if (val) {
        array.push();
      }
    }
    return array;
  }

  private _selectBufferMethod(
    buff: SmartBuffer,
    type?: EPacketModelType,
  ): [TBufferWriter, TBufferReader] {
    let write;
    let read;
    switch (type) {
      case EPacketModelType.int8:
        write = buff.writeUInt8;
        read = buff.readUInt8;
        break;
      case EPacketModelType.int16:
        write = buff.writeUInt16BE;
        read = buff.readUInt16BE;
        break;
      default:
        write = buff.writeUInt8;
        read = buff.readUInt8;
    }
    return [write.bind(buff), read.bind(buff)];
  }
}
