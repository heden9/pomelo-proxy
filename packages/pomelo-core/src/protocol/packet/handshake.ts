import { SocksPacketBase } from "./base";
import { createModel } from "./helper";
import {
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

export class SocksHandshakeRequest extends SocksPacketBase<ISocksHandshakeRequestOptions> {
  public static models = [
    ...SocksPacketBase.models,
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
}

export interface ISocksHandshakeResponseOptions extends ISocksBaseOptions {
  method: ESocksMethods;
}

export class SocksHandshakeResponse extends SocksPacketBase<
  ISocksHandshakeResponseOptions
> {
  public static models = [
    ...SocksPacketBase.models,
    createModel<ISocksHandshakeResponseOptions>(ESocksModel.method),
  ];
}

// const request = new SocksHandshakeRequest({
//   methods: [ESocksMethods.USER_PASS, ESocksMethods.NO_AUTH],
//   version: ESocksVersion.v5,
// });
// const buff = request.toBuffer();
// const request2 = new SocksHandshakeRequest(buff);
// request2.toJSON();
