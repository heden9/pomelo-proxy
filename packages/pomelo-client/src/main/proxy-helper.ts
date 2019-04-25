import { exec } from "child_process";
import { promisify } from "util";

const platform = process.platform;
const promisifyExec = promisify(exec);

// TODO: sys select
// TODO: 网线、网桥设备代理设置
export class ProxyHelper {
  public static async enableAutoMode(pacUrl: string) {
    switch (platform) {
      case "darwin":
        return promisifyExec(`networksetup -setautoproxyurl wi-fi ${pacUrl}`);

      default:
        return Promise.resolve();
    }
  }

  public static async enableGlobalMode(host: string, port: number) {
    switch (platform) {
      case "darwin":
        return promisifyExec(`networksetup -setsocksfirewallproxy wi-fi ${host} ${port}`);

      default:
        return Promise.resolve();
    }
  }

  public static disableAll() {
    switch (platform) {
      case "darwin":
        return Promise.all([
          // TODO: clear
          promisifyExec(`networksetup -setautoproxystate wi-fi off`),
          promisifyExec(`networksetup -setsocksfirewallproxystate wi-fi off`),
        ]);
      default:
        return Promise.resolve();
    }
  }
}
