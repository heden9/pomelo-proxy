import {app, Tray} from "electron";
import {logClassDecorator} from "pomelo-util";
import {LocalManager} from "./local";
import {MainMenu} from "./menu";
import {PacManager} from "./pac";
import {ProxyHelper} from "./proxy-helper";
import {UserDefaultStore} from "./store";
import {EMode} from "./type";

const debug = require("debug")("pomelo-client");

// TODO:
// - 1.PAC mode
// - 2.auto set

const $MENU = Symbol("main#menu");
const $TRAY = Symbol("main#tray");

@logClassDecorator(debug)
class Main {
  private get _menu() {
    if (!this[$MENU]) {
      this[$MENU] = new MainMenu(this._store);
    }
    return this[$MENU];
  }

  private get _tray() {
    if (!this[$TRAY]) {
      this[$TRAY] = new Tray(this._store.icon);
    }
    return this[$TRAY];
  }

  private get _contextMenu() {
    return this._menu.create();
  }

  private _pacManager: PacManager;
  private _localManager: LocalManager;
  private _app = app;
  private [$MENU]: MainMenu;
  private [$TRAY]: Tray;
  private readonly _store: UserDefaultStore;

  constructor() {
    this._store = new UserDefaultStore();
    this._localManager = new LocalManager(this._store);
    this._pacManager = new PacManager(this._store);
  }

  public start() {
    this._app.once("ready", this._onReady);
    this._app.once("before-quit", this._onClose);
  }

  public close = () => {
    this._closeProxy();
  }

  private async _closeProxy() {
    await Promise.all([
      this._pacManager.close(),
      ProxyHelper.disableAll(),
    ]);
  }

  private _updateTray() {
    this._tray.setImage(this._store.icon);
    this._tray.setContextMenu(this._contextMenu);
  }

  private async _setupPacProxy() {
    await this._closeProxy();
    await this._pacManager.start();
    await ProxyHelper.enableAutoMode(this._pacManager.address());
  }

  private async _setupGlobalProxy() {
    await this._closeProxy();
    await ProxyHelper.enableGlobalMode(this._store.localSocksHost, this._store.localSocksPort);
  }

  private async _setupProxy() {
    debug("setupProxy", this._store.mode);
    switch (this._store.mode) {
      case EMode.PAC:
        await this._setupPacProxy();
        break;
      case EMode.GLOBAL:
        await this._setupGlobalProxy();
        break;
      case EMode.MANUAL:
        await this._closeProxy();
        break;
      default:
        break;
    }
  }

  private _onClose = async () => {
    debug("close");
    await this._closeProxy();
  }

  private _onReady = () => {
    this._menu.on("on", this._onMenuON);
    this._menu.on("off", this._onMenuOFF);
    this._menu.on("mode", this._onMenuSwitchMode);
    this._tray.setContextMenu(this._contextMenu);
  }

  private _onMenuON = async () => {
    this._localManager.instance();
    await this._setupProxy();
    this._updateTray();
  }

  private _onMenuOFF = async () => {
    await this._closeProxy();
    this._updateTray();
  }

  private _onMenuSwitchMode = async () => {
    if (this._store.on) {
      await this._setupProxy();
    }
  }
}

new Main().start();
