import * as AdmZip from "adm-zip";
import axios from "axios";
import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as request from "request";
import * as util from "util";
import { BaseManager } from "./base-manager";
import { IBaseOptions, IUpdateCacheMapData } from "./type";

const semver = require("semver");
const userDataPath = app.getPath("userData");
const rename = util.promisify(fs.rename);
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
      return;
    }

    if (semver.compare(data.version, this._options.appVersion) !== 0) {
      this.emit("app-update", data);
    }
  }

  public async checkComponent() {
    await this._refreshCache();
    const data = this._cache.get("start-local");

    if (!data) {
      return;
    }

    // if (fs.existsSync())
    // TODO: get start-local version
    if (semver.compare(data.version, this._options.appVersion) !== 0) {
      this.emit("component-update", data);
      this.updateComponent(data.raw.browser_download_url);
    }
  }

  public async updateComponent(url: string) {
    const basename = path.basename(url);
    const output = path.join(userDataPath, basename);
    await this._download(url, output);
    await this._unzip(output);
    this.logger.info("download %s to %s, update success", basename, userDataPath);
  }

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
        // TODO: check file exist
        await rename(tmp, output);
        // fs.copyFile
        resolve();
      });
    });
  }

  private async _unzip(input: string) {
    const zip = new AdmZip(input);
    const dir = path.dirname(input);
    const extractAllToAsync = util.promisify(zip.extractAllToAsync);
    try {
      await extractAllToAsync(dir, false);
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
