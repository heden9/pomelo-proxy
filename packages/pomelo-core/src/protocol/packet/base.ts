import { SmartBuffer } from "smart-buffer";
import { createModel, ProtocolError } from "./helper";
import {
  EPacketModelType,
  ERRORS,
  ESocksModel,
  ESocksVersion,
  IPacketMeta,
  IPacketModel,
  ISocksBaseOptions,
  TBufferVal,
  TBufferValBase,
  TValidate,
  WithBuffer,
} from "./type";

const debug = require("debug")("pomelo-core:packet");

type TBufferReader = ((offset?: number) => number) | SmartBuffer["readString"];
type TBufferWriter = (value: any, offset?: number) => SmartBuffer;

export class SocksV5PacketBase<T extends ISocksBaseOptions = ISocksBaseOptions> {

  public get models(): IPacketModel<T>[] {
    return (this.constructor as typeof SocksV5PacketBase).models;
  }
  public static models: IPacketModel<any>[] = [
    createModel(ESocksModel.version, {
      check: ESocksVersion,
    }),
  ];

  public static headLength = 0;
  public meta: Partial<IPacketMeta> = {};
  protected _options: T | null = null;
  protected _buffer: Buffer | null = null;
  private _isValidated: boolean = false;
  constructor(optionsOrBuffer: WithBuffer<T>) {
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
    debug("toBuffer start, options: %o, buffer: %o, models: %o", this._options, this._buffer, this.models);
    this._validateOptions();

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
        if (typeof keyForValue === "string") {
          writeBuff(Buffer.byteLength(keyForValue));
        } else if (Array.isArray(keyForValue)) {
          writeBuff(keyForValue.length);
        } else {
          throw new ProtocolError(
            ERRORS.PACKET_TO_BUFFER_ERROR +
              ", keyForValue expect to be string or array, but got " +
              typeof keyForValue,
            options,
            model,
          );
        }
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

      // support string
      if (typeof value === "number" || typeof value === "string") {
        writeBuff(value);
      } else {
        throw new ProtocolError(
          ERRORS.PACKET_TO_BUFFER_ERROR +
            `, \`${model.key}\` expect to be number, but got ` +
            typeof value,
          model,
        );
      }
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
    const obj = {} as T;
    const sizeMap: Map<keyof T, number> = new Map();
    this.models.forEach((model) => {
      debug("toJSON process loop, model: %o", model);
      this._isValidated = false;
      const [_, readBuffer] = this._selectBufferMethod(buffer, model.type);

      if (typeof model.read === "function") {

        const validate: TValidate<T> = (v1, v2) => {
          this._validateBufferVal(v1, v2, true);
        };
        model.read(buffer, obj, model, validate);
        this._checkValidateCalled();
        return;
      }

      // 尝试读取元素的size
      const size = sizeMap.get(model.key);
      const val: TBufferVal = size === undefined
        ? readBuffer()
        : this._readBufferBatch(readBuffer, size, model);
      // 校验
      this._validateBufferVal(val, model, !!model.for);
      // 如果使用了for，则记为指定元素的长度
      if (model.for) {
        sizeMap.set(model.for, val as number);
      }

      // FIXME: remove any
      obj[model.key] = val as any;
    });
    debug("toJSON end, result: %o", obj);
    return obj;
  }

  private _validateBufferVal = (value: TBufferVal | undefined, model: IPacketModel<T>, forceCheck: boolean) => {
    if (value === null || value === undefined || (model.isArray && !Array.isArray(value))) {
      throw new ProtocolError(
        ERRORS.PACKET_VALIDATE_ERROR
        + ", expect val's type to be number[] or string[] or string or number, but got " + typeof value,
      );
    }

    if (model.check) {
      // TODO: check支持函数
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
    } else if (!(forceCheck || model.forceCheck)) {
      console.warn(`[SocksV5PacketBase] %s's field \`%s\`'s value is %o, expect to set \`check\` attribute `, this.constructor.name, model.key, value);
    }
    this._isValidated = true;
  }

  private _checkValidateCalled() {
    if (!this._isValidated) {
      console.warn(`[SocksV5PacketBase] except \`validate\` to be called in %s's \`read\``, this.constructor.name);
    }
  }

  private _readBufferBatch(readBuffer: TBufferReader, count: number, model: IPacketModel<T>): TBufferValBase[] | string {
    debug("_readBufferBatch, start, count: %s, model: %o", count, model);
    if (model.type === EPacketModelType.string) {
      return readBuffer(count) as string;
    }
    const array: TBufferValBase[] = [];
    for (let index = 0; index < count; index++) {
      const val = readBuffer();
      debug("_readBufferBatch, process loop, val: %s", val);
      array.push(val);
    }
    debug("_readBufferBatch, end, result: %o", array);
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
      case EPacketModelType.string:
        write = buff.writeString;
        read = buff.readString;
        break;
      default:
        write = buff.writeUInt8;
        read = buff.readUInt8;
    }
    return [write.bind(buff), read.bind(buff)];
  }

  private _validateOptions() {
    if (!this._options) {
      throw new ProtocolError(
        ERRORS.PACKET_VALIDATE_ERROR +
        ", _options's type expect to be `T extends ISocksBaseOptions`, but got "
        + typeof this._options,
      );
    }

    for (const model of this.models) {
      if (typeof this._options[model.key] === undefined) {
        throw new ProtocolError(
          ERRORS.PACKET_VALIDATE_ERROR +
          `, expect \`${model.key}\` in options to be ${model.type}, but got undefined`,
        );
      }
    }
  }
}
