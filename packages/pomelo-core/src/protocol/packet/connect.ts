import * as ip from "ip";
import * as net from "net";
import { SocksV5PacketBase } from "./base";
import { createModel } from "./helper";
import {
  EPacketModelType,
  EPacketType,
  ESocksAddressLength,
  ESocksAddressType,
  ESocksCommand,
  ESocksModel,
  ESocksReply,
  ISocksBaseOptions,
  Omit,
} from "./type";

interface ISocksConnectBaseModel extends ISocksBaseOptions {
  address: string;
  port: number;
  reserved: number;
  addressType: ESocksAddressType;
  command: number;
}

type TSocksConnectBaseOptions = Omit<ISocksConnectBaseModel, "addressType" | "reserved">;

export type TSocksConnectRequestOptions = TSocksConnectBaseOptions & {
  command: ESocksCommand;
};

export type TSocksConnectResponseOptions = Omit<TSocksConnectBaseOptions, "command"> & {
  reply: ESocksReply;
};

/**
 * socks连接基础包
 *
 * @export
 * @class SocksConnectBase
 * @extends {SocksV5PacketBase<ISocksConnectBaseModel>}
 */
class SocksConnectBase extends SocksV5PacketBase<ISocksConnectBaseModel> {

  public static models = [
    ...SocksV5PacketBase.models,
    createModel<ISocksConnectBaseModel>(
      ESocksModel.command,
      {
        check: ESocksCommand,
      },
    ),
    createModel<ISocksConnectBaseModel>(
      ESocksModel.reserved,
      {
        check: [0],
      },
    ),
    createModel<ISocksConnectBaseModel>(
      ESocksModel.addressType,
      {
        check: ESocksAddressType,
      },
    ),
    createModel<ISocksConnectBaseModel>(
      ESocksModel.address,
      {
        write(buffer, options) {
          switch (options.addressType) {
            case ESocksAddressType.IPv4:
              buffer.writeBuffer(ip.toBuffer(options.address));
              break;
            case ESocksAddressType.IPv6:
              buffer.writeBuffer(ip.toBuffer(options.address));
              break;
            case ESocksAddressType.domain:
              buffer.writeUInt8(options.address.length);
              buffer.writeString(options.address);
              break;
          }
        },
        read(buffer, obj, model, validate) {
          let val;
          switch (obj.addressType) {
            case ESocksAddressType.IPv4:
              val = ip.fromLong(buffer.readUInt32BE());
              break;
            case ESocksAddressType.IPv6:
              val = ip.toString(buffer.readBuffer(16));
              break;
            case ESocksAddressType.domain:
              const domainLength = buffer.readUInt8();
              val = buffer.readString(domainLength);
              break;
          }
          validate(val, model);
          obj[ESocksModel.address] = val;
        },
      },
    ),
    createModel<ISocksConnectBaseModel>(
      ESocksModel.port,
      EPacketModelType.int16,
      {
        forceCheck: true,
      },
    ),
  ];

  constructor(optionsOrBuffer: TSocksConnectBaseOptions | Buffer) {
    if (optionsOrBuffer instanceof Buffer) {
      super(optionsOrBuffer);
    } else {
      let addressType = ESocksAddressType.domain;
      if (net.isIPv4(optionsOrBuffer.address)) {
        addressType = ESocksAddressType.IPv4;
      } else if (net.isIPv6(optionsOrBuffer.address)) {
        addressType = ESocksAddressType.IPv6;
      }
      super({
        ...optionsOrBuffer,
        addressType,
        reserved: 0x00,
      });
    }
  }

  public packetLength() {
    if (this._buffer === null || this._buffer.length < 4) {
      return 0;
    }
    let length = 4;
    switch (this._buffer[3]) {
      case ESocksAddressType.IPv4:
        length += ESocksAddressLength.IPv4;
        break;
      case ESocksAddressType.IPv6:
        length += ESocksAddressLength.IPv6;
        break;
      case ESocksAddressType.domain:
        if (this._buffer.length < 5) {
          return 0;
        } else {
          length += 1 + this._buffer[4];
        }
        break;
      default:
        return 0;
    }
    return length + 2;
  }
}

/**
 * socks连接请求包
 *
 * @export
 * @class SocksConnectRequest
 * @extends {SocksConnectBase<ISocksConnectRequestOptions>}
 */
export class SocksConnectRequest extends SocksConnectBase {
  public static get displayName() {
    return EPacketType.CONNECT_REQUEST;
  }

  constructor(optionsOrBuffer: TSocksConnectRequestOptions | Buffer) {
    super(optionsOrBuffer);
  }
}

/**
 * socks连接响应包
 *
 * @export
 * @class SocksConnectResponse
 * @extends {SocksConnectBase<ISocksConnectBaseModel>}
 */
export class SocksConnectResponse extends SocksConnectBase {
  public static get displayName() {
    return EPacketType.CONNECT_RESPONSE;
  }

  constructor(optionsOrBuffer: TSocksConnectResponseOptions | Buffer) {
    if (optionsOrBuffer instanceof Buffer) {
      super(optionsOrBuffer);
    } else {
      super({ ...optionsOrBuffer, command: optionsOrBuffer.reply });
    }
  }

  public toJSON(): ISocksConnectBaseModel & { reply: ESocksReply } {
    const obj = super.toJSON();
    return Object.assign(obj, {
      reply: obj.command,
    });
  }
}

