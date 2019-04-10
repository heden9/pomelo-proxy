import { Transform, TransformCallback, TransformOptions } from "stream";

import { ERRORS } from "./constant";
import { noop, ProtocolError } from "./helper";
import {
  EPacketType,
  ISocksPacket,
  SocksAuthRequest,
  SocksAuthResponse,
  SocksConnectRequest,
  SocksConnectResponse,
  SocksHandshakeRequest,
  SocksHandshakeResponse,
  TSocksAuthRequestOptionsOrBuffer,
  TSocksAuthResponseOptionsOrBuffer,
  TSocksConnectRequestOptionsOrBuffer,
  TSocksConnectResponseOptionsOrBuffer,
  TSocksHandshakeRequestOptionsOrBuffer,
  TSocksHandshakeResponseOptionsOrBuffer,
} from "./packet";
import {
  IEncoderCallback,
  TEncoderCreatePacketOptions,
  TEncoderTaskQueue,
} from "./type";

export interface ISocksEncoder extends Transform {
  writePacket(
    options: TEncoderCreatePacketOptions,
    callback?: IEncoderCallback,
  ): void;
}

// tslint:disable-next-line:no-empty-interface
export interface ISocksEncoderOptions extends TransformOptions {}

const debug = require("debug")("pomelo-core:encoder");

export class SocksEncoder extends Transform {
  private _limited = false;
  private _queue: TEncoderTaskQueue[] = [];
  private _isDestroy: boolean = false;
  constructor(options?: ISocksEncoderOptions) {
    super(options);

    this.once("close", () => {
      this._queue = [];
    });
    this.on("drain", () => {
      debug("onDrain, start, queue: %o", this._queue);
      this._limited = false;
      do {
        const item = this._queue.shift();
        if (!item) {
          break;
        }

        const [packet, callback] = item;
        debug("onDrain, resume");
        // 对于 rpc 请求，如果已经超时，则不需要再写入了
        // TODO: 超时 continue
        this.writePacket(packet, callback);
      } while (!this._limited);
    });
  }

  public destroy() {
    if (this._isDestroy) {
      return;
    }
    this._isDestroy = true;
    super.destroy();
    debug("destroy");
    this._queue = [];
    this.emit("close");
    this.removeAllListeners();
  }

  // public writeR
  public _transform(
    buf: Buffer,
    encoding: string,
    callback: TransformCallback,
  ) {
    callback(null, buf);
  }

  public writePacket(
    options: TEncoderCreatePacketOptions,
    callback: IEncoderCallback = noop,
  ) {
    if (this._limited) {
      this._queue.push([options, callback]);
    } else {
      let buf;
      const start = Date.now();
      try {
        const packet = this._createPacket(options.type, options);
        buf = packet.toBuffer();
        packet.setMeta({
          data: buf,
          encodeRT: Date.now() - start,
          size: buf.length,
        });
        debug("writePacket, end, packet: %o", packet);
      } catch (err) {
        // TODO:
        console.error(err);
        callback(err, options);
        return;
      }
      // @refer: https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback
      // The return value is true if the internal buffer is less than the highWaterMark configured
      // when the stream was created after admitting chunk. If false is returned, further attempts to
      // write data to the stream should stop until the 'drain' event is emitted.
      this._limited = !this.write(buf, (err) => {
        callback(err, options);
      });
    }
  }

  // private _createPacket(
  //   type: EPacketType,
  //   packet: TSocksConnectRequestOptionsOrBuffer,
  // ): SocksConnectRequest;

  // private _createPacket(
  //   type: EPacketType,
  //   packet: TSocksConnectResponseOptionsOrBuffer,
  // ): SocksConnectResponse;

  // private _createPacket(
  //   type: EPacketType,
  //   packet: TSocksHandshakeRequestOptionsOrBuffer,
  // ): SocksHandshakeRequest;

  // private _createPacket(
  //   type: EPacketType,
  //   packet: TSocksHandshakeResponseOptionsOrBuffer,
  // ): SocksHandshakeResponse;

  // private _createPacket(
  //   type: EPacketType,
  //   packet: TSocksAuthRequestOptionsOrBuffer,
  // ): SocksAuthRequest;

  // private _createPacket(
  //   type: EPacketType,
  //   packet: TSocksAuthResponseOptionsOrBuffer,
  // ): SocksAuthResponse;

  private _createPacket(
    type: EPacketType,
    packet: TEncoderCreatePacketOptions,
  ): ISocksPacket {
    switch (type) {
      case EPacketType.CONNECT_REQUEST:
        return new SocksConnectRequest(
          packet as TSocksConnectRequestOptionsOrBuffer,
        );
      case EPacketType.CONNECT_RESPONSE:
        return new SocksConnectResponse(
          packet as TSocksConnectResponseOptionsOrBuffer,
        );
      case EPacketType.HANDSHAKE_REQUEST:
        return new SocksHandshakeRequest(
          packet as TSocksHandshakeRequestOptionsOrBuffer,
        );
      case EPacketType.HANDSHAKE_RESPONSE:
        return new SocksHandshakeResponse(
          packet as TSocksHandshakeResponseOptionsOrBuffer,
        );
      case EPacketType.AUTH_REQUEST:
        return new SocksAuthRequest(
          packet as TSocksAuthRequestOptionsOrBuffer,
        );
      case EPacketType.AUTH_RESPONSE:
        return new SocksAuthResponse(
          packet as TSocksAuthResponseOptionsOrBuffer,
        );
      default:
        throw new ProtocolError(
          ERRORS.PROTOCOL_DECODE_ERROR +
            `invalid packetType, expect type in [${Object.values(
              EPacketType,
            )}], but got ${type}`,
        );
    }
  }
}
