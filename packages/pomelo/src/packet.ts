import * as net from "net";
import { ESocksAddressLength, ESocksAddressType, ISocksBaseOptions, SocksConnectBase, SocksV5PacketBase, WithBuffer } from "pomelo-core/build/protocol/packet";

export interface ISSLocalRequestOptions extends ISocksBaseOptions {
  address: string;
  port: number;
}

export interface ISSLocalRequestModel extends ISocksBaseOptions {
  address: string;
  port: number;
  addressType: ESocksAddressType;
}

export type TSSLocalRequestOptionsOrBuffer = WithBuffer<ISSLocalRequestOptions>;

export class SSLocalRequest extends SocksV5PacketBase<ISSLocalRequestModel> {
  public static get displayName() {
    return "SS_LOCAL_REQUEST";
  }

  public static models = SocksConnectBase.models.slice(-3);
  constructor(optionsOrBuffer: ISSLocalRequestOptions) {
    if (optionsOrBuffer instanceof Buffer) {
      super(optionsOrBuffer);
    } else {
      let addressType = ESocksAddressType.domain;
      if (net.isIPv4(optionsOrBuffer.address)) {
        addressType = ESocksAddressType.IPv4;
      } else if (net.isIPv6(optionsOrBuffer.address)) {
        addressType = ESocksAddressType.IPv6;
      }
      super({ ...optionsOrBuffer, addressType });
    }
  }

  public packetLength() {
    if (this._buffer === null || this._buffer.length < 0) {
      return 0;
    }
    let length = 1;
    switch (this._buffer[0]) {
      case ESocksAddressType.IPv4:
        length += ESocksAddressLength.IPv4;
        break;
      case ESocksAddressType.IPv6:
        length += ESocksAddressLength.IPv6;
        break;
      case ESocksAddressType.domain:
        if (this._buffer.length < 2) {
          return 0;
        } else {
          length += 1 + this._buffer[1];
        }
        break;
      default:
        return 0;
      }
    return length + 2;
  }
}
