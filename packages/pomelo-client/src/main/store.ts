import { app, systemPreferences } from "electron";
import * as path from "path";
import { EMode } from "./type";

export enum EUserDefault {
  POMELO_ON = "pomeloOn",
  POMELO_RUNNING_MODE = "pomeloRunningMode",
  SS_LOCAL_SCRIPT_VERSION = "ssLocalScriptVersion",
  LOCAL_SOCKS5_LISTEN_PORT = "LocalSocks5.ListenPort",
  LOCAL_SOCKS5_LISTEN_HOST = "LocalSocks5.ListenAddress",
  LOCAL_SOCKS5_TIMEOUT = "LocalSocks5.Timeout",
  PAC_SERVER_LISTEN_PORT = "PacServer.ListenPort",
  GFW_LIST_URL = "GFWListURL",
  PROXY_EXCEPTIONS = "ProxyExceptions",
  POMELO_UPDATE_ORIGIN = "pomeloRemoteOrigin",
}

const userDataPath = app.getPath("userData");
const userHomePath = app.getPath("home");
// TODO: cahce
export class UserDefaultStore {
  public static initialData = {
    [EUserDefault.POMELO_ON]: true,
    [EUserDefault.POMELO_RUNNING_MODE]: EMode.PAC,
    [EUserDefault.SS_LOCAL_SCRIPT_VERSION]: "0.0.1",
    [EUserDefault.LOCAL_SOCKS5_LISTEN_PORT]: 1086,
    [EUserDefault.LOCAL_SOCKS5_LISTEN_HOST]: "127.0.0.1",
    [EUserDefault.PAC_SERVER_LISTEN_PORT]: 8090,
    [EUserDefault.LOCAL_SOCKS5_TIMEOUT]: 60,
    [EUserDefault.GFW_LIST_URL]: "https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt",
    [EUserDefault.GFW_LIST_URL]: "127.0.0.1, localhost, 192.168.0.0/16, 10.0.0.0/8, FE80::/64, ::1, FD00::/8",
    [EUserDefault.POMELO_UPDATE_ORIGIN]: "https://api.github.com/repos/w771854332/pomelo-proxy/releases?per_page=100",
  };

  public get icon() {
    return this.get(EUserDefault.POMELO_ON, "boolean")
      ? path.join(__static, "/pomeloTemplate.png")
      : path.join(__static, "/pomelo.png");
  }

  public get userDataPath() {
    return userDataPath;
  }

  public get homePath() {
    return userHomePath;
  }

  public get ssLocalScriptInfo() {
    const version = this.get(EUserDefault.SS_LOCAL_SCRIPT_VERSION, "string");
    const scriptPath = path.join(this.userDataPath, `start-local-${version}`);
    return {
      path: scriptPath,
      version,
    };
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

  public get pomeloUpdateOrigin() {
    return this.get(EUserDefault.POMELO_UPDATE_ORIGIN, "string");
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
