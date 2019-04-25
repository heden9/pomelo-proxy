import * as AdmZip from "adm-zip";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as request from "request";
import * as util from "util";
import { BaseManager } from "./base-manager";
import { EUserDefault } from "./store";
import { IBaseOptions, IUpdateCacheMapData } from "./type";

const semver = require("semver");
const rename = util.promisify(fs.rename);
const chmod = util.promisify(fs.chmod);

export interface IUpdateManagerOptions extends IBaseOptions {
  appVersion: string;
  platform: NodeJS.Platform;
}

export class UpdateManager extends BaseManager<IUpdateManagerOptions> {
  protected get _loggerPrefix() {
    return "[pomelo][update-manager]";
  }

  public static checkPlatform(fileName: string) {
    const extension = path.extname(fileName).split(".")[1];

    if ((fileName.includes("mac") || fileName.includes("darwin")) && extension === "zip") {
      return "darwin";
    }

    const directCache = ["exe", "rpm", "deb", "AppImage"];
    const index = directCache.indexOf(extension);

    if (index > -1) {
      return directCache[index];
    }

    return false;
  }

  private _cache: Map<string, IUpdateCacheMapData> = new Map();
  private _origin = this._store.pomeloUpdateOrigin;

  public async checkApp() {
    await this._refreshCache();
    const data = this._cache.get("pomelo");

    if (!data) {
      this.logger.warn("app: pomelo check update failed");
      return;
    }

    if (semver.compare(data.version, this._options.appVersion) !== 0) {
      this.emit("app-update", data);
      // TODO: app update logic
    }
  }

  public async checkComponent() {
    await this._refreshCache();
    const data = this._cache.get("start-local");

    if (!data) {
      this.logger.warn("component: ss-local check update failed");
      return;
    }

    const ssLocalScriptInfo = this._store.ssLocalScriptInfo;
    const latestVersion = data.version;
    const localVersion = ssLocalScriptInfo.version;
    this.logger.info("component: ss-local(v%s), latest(v%s)", localVersion, latestVersion);
    // need to update
    if (semver.compare(latestVersion, localVersion) !== 0) {
      this.emit("component-update", data);
      await this.fetchComponent(data);
      // update ss-local-script-version
      this.logger.info("component: ss-local update v%s -> v%s", localVersion, latestVersion);
      this._store.set(EUserDefault.SS_LOCAL_SCRIPT_VERSION, "string", latestVersion);
    } else if (!fs.existsSync(ssLocalScriptInfo.path)) {
      // script not exist
      this.logger.warn("component: ss-local not exist, re download...");
      await this.fetchComponent(data);
      this.logger.info("component: ss-local %s recovery completed", ssLocalScriptInfo.path);
    }
  }

  public async fetchComponent(data: IUpdateCacheMapData) {
    this.emit("download-begin");
    const latestUrl = data.raw.browser_download_url;
    const userDataPath = this._store.userDataPath;
    const basename = path.basename(latestUrl);
    const setupPath = path.join(userDataPath, basename);
    // setup not exist, re download
    if (!fs.existsSync(setupPath)) {
      await this._download(latestUrl, setupPath);
    }
    const ssLocalScriptInfo = this._store.ssLocalScriptInfo;
    await this._unzip(setupPath, ssLocalScriptInfo.path);
    this.emit("download-done");
  }

  /**
   *
   * @param url download_url
   * @param output download_target_url
   */
  private _download(url: string, output: string) {
    return new Promise((resolve, reject) => {
      const inputStream = request.get(url);
      const tmp = path.join(path.dirname(output), `.${path.basename(output, ".zip")}`);
      const outputStream = fs.createWriteStream(tmp);
      let total = 0;
      let transferred = 0;
      let delta = 0;
      const start = Date.now();
      let nextUpdate = start + 1000;
      inputStream.on("response", (res) => {
        total = Number(res.headers["content-length"] || null);
        res.on("data", (data) => {
          transferred += data.length;
          delta += data.length;
          const now = Date.now();
          if (now >= nextUpdate && transferred !== total) {
            nextUpdate = now + 1000;
            this.emit("download-progress", {
              bytesPerSecond: Math.round(transferred / ((now - start) / 1000)),
              delta,
              percent: transferred / total,
              total,
              transferred,
            });
            delta = 0;
          }
          // this.logger.info("progress -- totalSize: %s, downloadSize: %s", totalSize, downloadSize);
        });
      });
      inputStream.pipe(outputStream);
      inputStream.once("error", (ex) => {
        inputStream.removeAllListeners();
        reject(ex);
      });
      outputStream.once("close", async () => {
        const now = Date.now();
        this.emit("download-progress", {
          bytesPerSecond: Math.round(transferred / ((now - start) / 1000)),
          delta,
          percent: transferred / total,
          total,
          transferred,
        });
        await rename(tmp, output);
        resolve();
      });
    });
  }

  private async _unzip(input: string, output: string) {
    const dir = path.dirname(input);
    const zip = new AdmZip(input);
    const entries = zip.getEntries();
    if (!entries.length || !entries[0]) {
      this.logger.warn("%s unzip failed, invalid entries length", input);
      return;
    }
    const innerFileName = entries[0].name;
    const innerFilePath = path.join(dir, innerFileName);
    const extractAllToAsync = util.promisify(zip.extractAllToAsync);
    try {
      await extractAllToAsync(dir, false);
      await chmod(innerFilePath, "755");
      await rename(innerFilePath, output);
    } catch (ex) {
      this.logger.error(ex);
    }
  }

  private async _refreshCache() {
    const { status, data } = await axios.get(this._origin);

    if (status !== 200) {
      this.logger.warn(`GitHub API responded with ${status} for url ${origin}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    const release = data.find((item) => {
      return !item.draft;
    });

    if (!release || !release.assets || !Array.isArray(release.assets)) {
      return;
    }

    for (const asset of release.assets) {
      const extName = path.extname(asset.name);
      const fileName = asset.name.replace(extName, "");
      const fields = fileName.split("-");
      let platform = fields.pop();
      const version = fields.pop();
      const name = fields.join("-");

      if (platform === "mac") {
        platform = "darwin";
      }

      if (platform === this._options.platform) {
        this._cache.set(name, {
          name,
          platform,
          raw: asset,
          version,
        });
      }
    }
  }
}
