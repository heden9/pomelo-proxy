import { SocksV5PacketBase } from "./base";
import { createModel } from "./helper";
import { EPacketModelType, EPacketType, ESocksAuthStatus, ESocksModel, ISocksAuthRequestModel, ISocksAuthRequestOptions, ISocksAuthResponseOptions } from "./type";

export class SocksAuthRequest extends SocksV5PacketBase<ISocksAuthRequestOptions> {
  public static models = [
    ...SocksV5PacketBase.models,
    createModel<ISocksAuthRequestModel>(
      ESocksModel.userNameLen,
      {
        for: ESocksModel.userName,
      },
    ),
    createModel<ISocksAuthRequestModel>(
      ESocksModel.userName,
      {
        forceCheck: true,
        type: EPacketModelType.string,
      },
    ),
    createModel<ISocksAuthRequestModel>(
      ESocksModel.passwordLen,
      {
        for: ESocksModel.password,
      },
    ),
    createModel<ISocksAuthRequestModel>(
      ESocksModel.password,
      {
        forceCheck: true,
        type: EPacketModelType.string,
      },
    ),
  ];

  static get displayName() {
    return EPacketType.AUTH_REQUEST;
  }

  public packetLength() {
    if (this._buffer === null || this._buffer.length < 2) {
      return 0;
    }
    const userNameLen = this._buffer[1];
    if (!userNameLen) {
      return 0;
    }
    const passwordIndex = 2 + userNameLen - 1;
    const passwordLen = this._buffer[passwordIndex];
    if (!passwordLen) {
      return 0;
    }
    return 2 + userNameLen + 1 + passwordLen;
  }
}

export class SocksAuthResponse extends SocksV5PacketBase<ISocksAuthResponseOptions> {
  public static models = [
    ...SocksV5PacketBase.models,
    createModel<ISocksAuthResponseOptions>(
      ESocksModel.status,
      {
        check: ESocksAuthStatus,
      },
    ),
  ];

  static get displayName() {
    return EPacketType.AUTH_RESPONSE;
  }

  public packetLength() {
    if (this._buffer === null || this._buffer.length < 2) {
      return 0;
    }
    return 2;
  }
}
