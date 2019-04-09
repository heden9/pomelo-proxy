import { app, Tray } from "electron";
import { LocalManager } from "./local";
import { MainMenu } from "./menu";
import { PacManager } from "./pac";
import { ProxyHelper } from "./proxy-helper";
import { EMode } from "./type";

const debug = require("debug")("pomelo-client");

const config = {
  pacPort: 8090,
  socksHost: "127.0.0.1",
  socksPort: 1080,
};
// TODO:
// - 1.PAC mode
// - 2.auto set

class Main {
  private get _app() {
    return app;
  }
  private _pacManager: PacManager;
  constructor() {
    this._pacManager = new PacManager(config);
  }

  public start() {
    this._app.once("ready", this._onReady);
    this._app.once("before-quit", this._onClose);
  }

  public close() {

  }

  private _onClose = async () => {
    debug("close");
    await this._closeProxy();
  }

  private _onReady = () => {
    this._setupPacProxy();
    this._setupInstance();
  }

  private _closeProxy() {
    return Promise.all([
      this._pacManager.close(),
      ProxyHelper.disableAll(),
    ]);
  }

  private async _setupPacProxy() {
    await this._closeProxy();
    await this._pacManager.start();
    ProxyHelper.enableAutoMode(this._pacManager.address());
  }

  private async _setupGlobalProxy() {
    await this._closeProxy();
    ProxyHelper.enableGlobalMode(config.socksHost, config.socksPort);
  }

  private _setupInstance() {
    const menu = new MainMenu();
    const tray = new Tray(menu.icon());
    function switchTray() {
      debug("switchTray");
      tray.setImage(menu.icon());
      tray.setContextMenu(menu.create());
    }
    menu.on("ready", async () => {
      LocalManager.instance({
        host: config.socksHost,
        port: config.socksPort,
      });
      switchTray();
    });
    menu.on("close", async () => {
      await LocalManager.close();
      switchTray();
    });
    menu.on("switch-mode", async (mode: EMode) => {
      debug("switch mode: %s", mode);
      switch (mode) {
        case EMode.PAC:
          this._setupPacProxy();
          break;
        case EMode.GLOBAL:
          this._setupGlobalProxy();
          break;
        default:
          break;
      }
    });
    tray.setContextMenu(menu.create());
  }
}

new Main().start();
