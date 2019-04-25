import appConfigFn from "application-config";
import * as path from "path";

const appConfig = appConfigFn("pomelo");

function isProduction() {
  if (!process.versions.electron) {
    // Node.js process
    return false;
  }
  if (process.platform === "darwin") {
    return !/\/Electron\.app\//.test(process.execPath);
  }
  if (process.platform === "win32") {
    return !/\\electron\.exe$/.test(process.execPath);
  }
  if (process.platform === "linux") {
    return !/\/electron$/.test(process.execPath);
  }
  return false;
}

function getConfigPath() {
  return path.dirname(appConfig.filePath);
}

const IS_PRODUCTION = isProduction();

export default {
  CONFIG_PATH: getConfigPath(),
  IS_PRODUCTION,
};
