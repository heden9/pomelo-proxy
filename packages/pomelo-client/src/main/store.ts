import { systemPreferences } from "electron";
import * as path from "path";
import { EMode } from "./type";

export enum EUserDefault {
  POMELO_ON = "pomeloOn",
  POMELO_RUNNING_MODE = "pomeloRunningMode",
  LOCAL_SOCKS5_LISTEN_PORT = "LocalSocks5.ListenPort",
  LOCAL_SOCKS5_LISTEN_HOST = "LocalSocks5.ListenAddress",
  LOCAL_SOCKS5_TIMEOUT = "LocalSocks5.Timeout",
  PAC_SERVER_LISTEN_PORT = "PacServer.ListenPort",
  GFW_LIST_URL = "GFWListURL",
  PROXY_EXCEPTIONS = "ProxyExceptions",
}

// TODO: cahce
export class UserDefaultStore {
  public static initialData = {
    [EUserDefault.POMELO_ON]: true,
    [EUserDefault.POMELO_RUNNING_MODE]: EMode.PAC,
    [EUserDefault.LOCAL_SOCKS5_LISTEN_PORT]: 1086,
    [EUserDefault.LOCAL_SOCKS5_LISTEN_HOST]: "127.0.0.1",
    [EUserDefault.PAC_SERVER_LISTEN_PORT]: 8090,
    [EUserDefault.LOCAL_SOCKS5_TIMEOUT]: 60,
    [EUserDefault.GFW_LIST_URL]: "https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt",
    [EUserDefault.GFW_LIST_URL]: "127.0.0.1, localhost, 192.168.0.0/16, 10.0.0.0/8, FE80::/64, ::1, FD00::/8",
  };

  public get icon() {
    return this.get(EUserDefault.POMELO_ON, "boolean")
      ? path.join(__static, "/pomeloTemplate.png")
      : path.join(__static, "/pomelo.png");
  }

  public get on() {
    return this.get(EUserDefault.POMELO_ON, "boolean");
  }

  public get mode() {
    return this.get(EUserDefault.POMELO_RUNNING_MODE, "string");
  }

  public get localSocksPort() {
    return this.get(EUserDefault.LOCAL_SOCKS5_LISTEN_PORT, "integer");
  }

  public get localSocksHost() {
    return this.get(EUserDefault.LOCAL_SOCKS5_LISTEN_HOST, "string");
  }

  public get pacServerPort() {
    return this.get(EUserDefault.PAC_SERVER_LISTEN_PORT, "integer");
  }

  constructor() {
    this.init();
  }

  public init() {
    systemPreferences.registerDefaults(UserDefaultStore.initialData);
  }

  public get(...args: Parameters<typeof systemPreferences.getUserDefault>) {
    return systemPreferences.getUserDefault(...args);
  }

  public set(...args: Parameters<typeof systemPreferences.setUserDefault>) {
    systemPreferences.setUserDefault(...args);
  }
}
