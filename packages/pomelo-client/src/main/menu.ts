import { Menu as ElectronMenu, MenuItem, MenuItemConstructorOptions } from "electron";
import SDKBase from "sdk-base";
import { EUserDefault, UserDefaultStore } from "./store";
import { EMode } from "./type";

// const debug = require("debug")("pomelo-client:main-menu");

export class MainMenu extends SDKBase {
  private _label: string = "pomelo";
  private _store: UserDefaultStore;

  private get _menu(): MenuItemConstructorOptions[] {
    const { on, mode } = this._store;
    return [
      {
        enabled: false,
        label: `${this._label}: ${on ? "on" : "off"}`,
      },
      {
        click: this._switchStatus,
        label: `${on ? "关闭" : "打开"} ${this._label}`,
      },
      { type: "separator" },
      {
        checked: mode === EMode.PAC,
        click: this._switchMode,
        id: EMode.PAC,
        label: "PAC自动模式",
        type: "radio",
      },
      {
        checked: mode === EMode.GLOBAL,
        click: this._switchMode,
        id: EMode.GLOBAL,
        label: "全局模式",
        type: "radio",
      },
      {
        checked: mode === EMode.MANUAL,
        click: this._switchMode,
        id: EMode.MANUAL,
        label: "手动模式",
        type: "radio",
      },
      { type: "separator" },
      // {
      //   label: `服务器 - `,
      //   submenu: [
      //     { type: "separator" },
      //     {
      //       label: "",
      //     },
      //   ],
      // },
      {
        label: "退出",
        role: "quit",
        accelerator: "CmdOrCtrl+Q",
      },
    ];
  }

  constructor(store: UserDefaultStore) {
    super();
    this._store = store;

    process.nextTick(() => {
      this._emitStatusEvent();
    });
  }

  public create() {
    return ElectronMenu.buildFromTemplate(this._menu);
  }

  private _emitStatusEvent() {
    const on = this._store.on;
    this.emit("switch-status", on);
    if (on) {
      this.emit("on");
    } else {
      this.emit("off");
    }
  }

  private _emitModeEvent() {
    this.emit("mode", this._store.mode);
  }

  private _switchStatus = () => {
    this._store.set(EUserDefault.POMELO_ON, "boolean", (!this._store.on) as any);
    this._emitStatusEvent();
  }

  private _switchMode = (item: MenuItem) => {
    this._store.set(EUserDefault.POMELO_RUNNING_MODE, "string", (item as any).id);
    this._emitModeEvent();
  }
}
