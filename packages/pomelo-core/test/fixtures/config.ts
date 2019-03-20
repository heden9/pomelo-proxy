import {
  ISocksPacketClass,
  SocksConnectRequest,
  SocksConnectResponse,
  SocksHandshakeRequest,
  SocksHandshakeResponse,
} from "../../src/protocol/packet";
import { ESocksMethods } from "../../src/protocol/packet/type";

interface ITestPacketConfig {
  only?: boolean;
  buffer: Buffer;
  json: {};
}

interface ITestPacketConfigMap {
  [key: string]: ITestPacketConfig;
}

export interface ITestConfig {
  class: ISocksPacketClass;
  data: ITestPacketConfigMap;
}

const SOCKS_CONNECT_REQ: ITestPacketConfigMap = {
  IPv4: {
    buffer: Buffer.from([0x05, 0x01, 0x00, 0x01, 0x7f, 0x00, 0x00, 0x01, 0x00, 0x50]),
    json: {
      address: "127.0.0.1",
      addressType: 1,
      command: 1,
      port: 80,
      reserved: 0,
      version: 5,
    },
  },
  IPv6: {
    buffer: Buffer.from([0x05, 0x01, 0x00, 0x04, 0xff, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11, 0x01, 0x00, 0x50]),
    json: {
      address: "ff01::1101",
      addressType: 4,
      command: 1,
      port: 80,
      reserved: 0,
      version: 5,
    },
  },
  DOMAIN: {
    buffer: Buffer.from([0x05, 0x01, 0x00, 0x03, 0x0d, 0x77, 0x77, 0x77, 0x2e, 0x62, 0x61, 0x69, 0x64, 0x75, 0x2e, 0x63, 0x6f, 0x6d, 0x00, 0x50]),
    json: {
      address: "www.baidu.com",
      addressType: 3,
      command: 1,
      port: 80,
      reserved: 0,
      version: 5,
    },
  },
};

const SOCKS_CONNECT_RES: ITestPacketConfigMap = {
  BASIC: {
    buffer: Buffer.from([0x05, 0x01, 0x00, 0x01, 0x7f, 0x00, 0x00, 0x01, 0x00, 0x50]),
    json: {
      address: "127.0.0.1",
      addressType: 1,
      command: 1,
      port: 80,
      reply: 1,
      reserved: 0,
      version: 5,
    },
  },
};

const SOCKS_HANDSHAKE_RES: ITestPacketConfigMap = {
  BASIC: {
    buffer: Buffer.from([0x05, 0x00]),
    json: {
      method: ESocksMethods.NO_AUTH,
      version: 5,
    },
  },
};

const SOCKS_HANDSHAKE_REQ: ITestPacketConfigMap = {
  ANY_METHODS: {
    buffer: Buffer.from([0x05, 0x02, 0x00, 0x02]),
    json: {
      methods: [
        ESocksMethods.NO_AUTH,
        ESocksMethods.USER_PASS,
      ],
      nmMethods: 2,
      version: 5,
    },
  },
  SINGLE_METHOD: {
    buffer: Buffer.from([0x05, 0x01, 0x00]),
    json: {
      methods: [
        ESocksMethods.NO_AUTH,
      ],
      nmMethods: 1,
      version: 5,
    },
  },
};

export const TEST_CONFIG: ITestConfig[] = [
{
  class: SocksConnectRequest,
  data: SOCKS_CONNECT_REQ,
},
{
  class: SocksConnectResponse,
  data: SOCKS_CONNECT_RES,
},
{
  class: SocksHandshakeRequest,
  data: SOCKS_HANDSHAKE_REQ,
},
{
  class: SocksHandshakeResponse,
  data: SOCKS_HANDSHAKE_RES,
}];

