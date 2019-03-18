import { SocksV5PacketBase } from "./base";
import { createModel } from "./helper";
import {
  EPacketType,
  ESocksMethods,
  ESocksModel,
  ESocksVersion,
  ISocksBaseOptions,
} from "./type";

export interface ISocksHandshakeRequestOptions extends ISocksBaseOptions {
  methods: ESocksMethods[];
}

interface ISocksHandshakeRequestModel extends ISocksHandshakeRequestOptions {
  nmMethods: number;
}

export class SocksHandshakeRequest extends SocksV5PacketBase<ISocksHandshakeRequestOptions> {
  public static models = [
    ...SocksV5PacketBase.models,
    createModel<ISocksHandshakeRequestModel>(
      ESocksModel.nmMethods,
      {
        for: ESocksModel.methods,
      },
    ),
    createModel<ISocksHandshakeRequestModel>(
      ESocksModel.methods,
      {
        isArray: true,
      },
    ),
  ];

  public packetLength() {
    if (this._buffer === null || this._buffer.length < 2) {
      return 0;
    }
    return 2 + this._buffer[1];
  }

  static get displayName() {
    return EPacketType.HANDSHAKE_REQUEST;
  }
}

export interface ISocksHandshakeResponseOptions extends ISocksBaseOptions {
  method: ESocksMethods;
}

export class SocksHandshakeResponse extends SocksV5PacketBase<
  ISocksHandshakeResponseOptions
> {
  public static models = [
    ...SocksV5PacketBase.models,
    createModel<ISocksHandshakeResponseOptions>(ESocksModel.method),
  ];

  static get displayName() {
    return EPacketType.HANDSHAKE_RESPONSE;
  }

  public packetLength() {
    if (this._buffer === null || this._buffer.length < 2) {
      return 0;
    }
    return 2;
  }
}

// const request = new SocksHandshakeRequest({
//   methods: [ESocksMethods.USER_PASS, ESocksMethods.NO_AUTH],
//   version: ESocksVersion.v5,
// });
// const buff = request.toBuffer();
// const request2 = new SocksHandshakeRequest(buff);
// request2.toJSON();
