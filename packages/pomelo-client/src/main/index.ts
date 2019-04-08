import { app, Tray } from "electron";
import { Instance } from "./instance";
import { Menu } from "./menu";

const debug = require("debug")("pomelo-client");

function createWindow() {
  const menu = new Menu();
  const tray = new Tray(menu.icon());
  function switchTray() {
    debug("switchTray");
    tray.setImage(menu.icon());
    tray.setContextMenu(menu.create());
  }
  menu.on("ready", async () => {
    await Instance.create();
    switchTray();
  });
  menu.on("close", async () => {
    await Instance.close();
    switchTray();
  });
  tray.setContextMenu(menu.create());
}

app.on("ready", createWindow);

// TODO:
// - 1.PAC mode
// - 2.auto set
