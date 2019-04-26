

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

const IS_PRODUCTION = isProduction();

export default {
  IS_PRODUCTION,
};
