import { autobind } from "core-decorators";
import * as net from "net";
import { unpump } from "pomelo-util";
import pump from "pump";
import * as protocol from "../protocol";
import { ISocksDecoder } from "../protocol/decoder";
import { ISocksEncoder } from "../protocol/encoder";
import { ISocksPacketClass } from "../protocol/packet";
import { IDecodeEventInfo } from "../protocol/type";
import { ERRORS, SocksError } from "../type";
import { SocksBase } from "./base";

export interface ISocksConnectionBaseOptions {
  maxIdleTime?: number;
}

export type ISocksConnectionClass = new (socket: net.Socket, options: ISocksConnectionBaseOptions) => ISocksConnectionBase;

export interface ISocksConnectionBase extends SocksBase {
  remoteAddress: string;
  isClosed: boolean;
  isEstablished: boolean;
  close(): Promise<void>;
  on(event: "close", listener: VoidFunction): this;
  on(event: "established", listener: (socket: net.Socket) => void): this;

  once(event: "close", listener: VoidFunction): this;
  once(event: "established", listener: (socket: net.Socket) => void): this;
}

export abstract class SocksConnectionBase<T extends ISocksConnectionBaseOptions> extends SocksBase implements ISocksConnectionBase {
  public get isClosed() {
    return this._isClosed;
  }

  public get isEstablished() {
    return this._isEstablished;
  }

  protected get _protocol() {
    return protocol;
  }

  protected get _pipeline(): Parameters<typeof pump> {
    return [
      this._encoder,
      this._socket,
      this._decoder,
    ];
  }

  public get remoteAddress() {
    return `${this._socket.remoteAddress}:${this._socket.remotePort}`;
  }

  protected _options: T;

  protected _socket: net.Socket;
  protected _decoder: ISocksDecoder;
  protected _encoder: ISocksEncoder;
  protected _isClosed: boolean = false;
  protected _isEstablished: boolean = false;
  protected _PacketClass: ISocksPacketClass[] = [];
  private _lastActiveTime: number = Date.now();
  // private readonly _timer: NodeJS.Timeout;
  private readonly _maxIdleTime: number;
  protected constructor(socket: net.Socket, options: T) {
    super(options);

    this._options = options;

    this._socket = socket;

    this._maxIdleTime = options.maxIdleTime || 60 * 1000;

    this._decoder = this._protocol.decoder({
      PacketClass: this._PacketClass,
    });
    this._encoder = this._protocol.encoder();

    // pipeline
    pump(...this._pipeline);

    this._socket.once("close", this._handleSocketClose);
    this._socket.once("error", this._handleSocketError);
    this._decoder.on("decode", (info: IDecodeEventInfo) => {
      this._lastActiveTime = Date.now();
      this._handleResponse(info);
    });

    // this._timer = setInterval(
    //   () => {
    //     const now = Date.now();
    //     if (now - this._lastActiveTime >= this._maxIdleTime) {
    //       console.warn(
    //         "[pomelo-core:connection] socket: %s is idle for %s(ms)",
    //         this.remoteAddress,
    //         this._maxIdleTime,
    //       );
    //       // this.close(ERRORS.SOCKET_IDLE_TIMEOUT, `idle timeout(${this._maxIdleTime}ms)`);
    //     }
    //   },
    //   this._maxIdleTime,
    // );
  }

  public close(err?: Error, force?: boolean): Promise<void>;
  public close(err?: string, message?: string | boolean, force?: boolean): Promise<void>;
  public async close(err?: Error | string, messageOrForce?: string | boolean, force?: boolean) {
    if (this._isClosed) {
      return;
    }

    if (typeof messageOrForce === "boolean") {
      force = messageOrForce;
      messageOrForce = "";
    }

    if (typeof err === "string") {
      err = new SocksError(err, messageOrForce);
    }

    this._isClosed = true;
    // clearInterval(this._timer);

    this._socket.destroy();
    this._encoder.destroy();
    this._decoder.destroy();

    this._removeInternalHandlers();
    this._socket.removeListener("error", this._handleSocketError);
    this._socket.removeListener("close", this._handleSocketClose);

    this._beforeClose();

    if (err) {
      // emit error after established
      if (this._isEstablished) {
        // this.emit("error", err);
      } else {
        this.ready(err);
      }
    }

    if (!force) {
      await this.await(this._socket, "close");
    }
    this.emit("close");
    this.removeAllListeners();
  }

  protected abstract _handleResponse(info: IDecodeEventInfo): void;

  // tslint:disable-next-line:no-empty
  protected _beforeClose() {}

  protected _removeInternalHandlers() {
    unpump(...this._pipeline);
  }

  protected _socketBaseWrapper(socket: net.Socket, timeout: number) {
    // socket.setTimeout(timeout, () => {
    //   this.close(ERRORS.SOCKET_CONNECT_TIMEOUT, `connect timeout(${timeout}ms)`);
    // });
    socket.once("error", (ex) => {
      this.close(ERRORS.SOCKET_REMOTE_FAILED, ex.message);
    });
    // socket.once("close", () => {
    //   this.close(ERRORS.SOCKET_REMOTE_CLOSED);
    // });
  }

  @autobind
  private _handleSocketClose() {
    this.close(undefined, true);
  }

  @autobind
  private _handleSocketError(error: any) {
    if (error.code !== "ECONNRESET") {
      console.warn(
        "[pomelo-core:connection] error occured on socket: %s, errName: %s, errMsg: %s",
        this.remoteAddress,
        error.name,
        error.message,
      );
    }
  }
}
