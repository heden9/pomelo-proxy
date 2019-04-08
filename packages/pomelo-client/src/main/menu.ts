import { Menu as ElectronMenu, MenuItemConstructorOptions } from "electron";
import * as path from "path";
import SDKBase from "sdk-base";

export class Menu extends SDKBase {
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
        click: this.switch,
      },
      { type: "separator" },
      {
        label: "PAC自动模式",
        type: "radio",
      },
      {
        label: "白名单模式",
        type: "radio",
      },
      {
        label: "全局模式",
        type: "radio",
      },
      {
        label: "ACL模式",
        submenu: [{ role: "minimize" }, { role: "close" }],
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

  public switch = () => {
    this._isOpen = !this._isOpen;
    this.emit("switch", this._isOpen);
    if (this._isOpen) {
      this.emit("ready");
    } else {
      this.emit("close");
    }
  }
}
