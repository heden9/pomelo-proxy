import * as ip from "ip";
import * as net from "net";
import { SocksPacketBase } from "./base";
import { createModel } from "./helper";
import {
  EPacketModelType,
  ESocksAddressType,
  ESocksCommand,
  ESocksModel,
  ESocksReply,
  ESocksVersion,
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
 * socks连接请求基础包
 *
 * @export
 * @class SocksConnectBase
 * @extends {SocksPacketBase<ISocksConnectBaseModel>}
 */
class SocksConnectBase extends SocksPacketBase<ISocksConnectBaseModel> {
  public static models = [
    ...SocksPacketBase.models,
    createModel<ISocksConnectBaseModel>(
      ESocksModel.command,
    ),
    createModel<ISocksConnectBaseModel>(
      ESocksModel.reserved,
    ),
    createModel<ISocksConnectBaseModel>(
      ESocksModel.addressType,
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
        read(buffer, obj) {
          switch (obj.addressType) {
            case ESocksAddressType.IPv4:
              obj[ESocksModel.address] = ip.fromLong(buffer.readUInt32BE());
              break;
            case ESocksAddressType.IPv6:
              obj[ESocksModel.address] = ip.toString(buffer.readBuffer(16));
              break;
            case ESocksAddressType.domain:
              const domainLength = buffer.readUInt8();
              obj[ESocksModel.address] = buffer.readString(domainLength);
              break;
          }
        },
      },
    ),
    createModel<ISocksConnectBaseModel>(
      ESocksModel.port,
      EPacketModelType.int16,
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
}

/**
 * socks连接请求包
 *
 * @export
 * @class SocksConnectRequest
 * @extends {SocksConnectBase<ISocksConnectRequestOptions>}
 */
export class SocksConnectRequest extends SocksConnectBase {
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

const request = new SocksConnectRequest({
  address: "FF01::1101",
  command: ESocksCommand.connect,
  port: 90,
  version: ESocksVersion.v5,
});
const response = new SocksConnectResponse({
  address: "FF01::1101",
  port: 90,
  reply: ESocksReply.SUCCEEDED,
  version: ESocksVersion.v5,
});
const buff1 = request.toBuffer();
const req = new SocksConnectRequest(buff1);
req.toJSON();
const buff2 = response.toBuffer();
const res = new SocksConnectResponse(buff2);
const a = res.toJSON();
