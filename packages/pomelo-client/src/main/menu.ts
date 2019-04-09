import { Menu as ElectronMenu, MenuItem, MenuItemConstructorOptions } from "electron";
import * as path from "path";
import SDKBase from "sdk-base";
import { EMode } from "./type";

export class MainMenu extends SDKBase {
  private _label: string = "pomelo-proxy";
  private _isOpen: boolean = false;
  private get _menu(): MenuItemConstructorOptions[] {
    return [
      {
        label: `${this._label}: ${this._isOpen ? "on" : "off"}`,
        enabled: false,
      },
      {
        label: `${this._isOpen ? "关闭" : "打开"} ${this._label}`,
        click: this._switchStatus,
      },
      { type: "separator" },
      {
        label: "PAC自动模式",
        type: "radio",
        id: EMode.PAC,
        click: this._switchMode,
      },
      {
        label: "全局模式",
        type: "radio",
        id: EMode.GLOBAL,
        click: this._switchMode,
      },
      {
        label: "代理设置",
        submenu: [{ role: "minimize" }, { role: "close" }],
      },
      { type: "separator" },
      {
        role: "quit",
        label: "退出",
      },
    ];
  }

  public create() {
    return ElectronMenu.buildFromTemplate(this._menu);
  }

  public icon() {
    return this._isOpen
      ? path.join(__static, "/pomeloTemplate.png")
      : path.join(__static, "/pomelo.png");
  }

  private _switchStatus = () => {
    this._isOpen = !this._isOpen;
    this.emit("switch-status", this._isOpen);
    if (this._isOpen) {
      this.emit("ready");
    } else {
      this.emit("close");
    }
  }

  private _switchMode = (item: MenuItem) => {
    this.emit("switch-mode", (item as any).id);
  }
}
