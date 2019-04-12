import { PrefixLogger } from "pomelo-util";
import SDKBase from "sdk-base";

const $LOGGER = Symbol("SocksBase#logger");
export class SocksBase extends SDKBase {
  protected get _loggerPrefix() {
    return `[pomelo-core][${this.constructor.name}]`;
  }

  protected get _loggerOptions() {
    return {};
  }

  get logger() {
    if (!this[$LOGGER]) {
      this[$LOGGER] = PrefixLogger.createLogger(this._loggerPrefix, this._loggerOptions);
    }
    return this[$LOGGER];
  }

  private [$LOGGER]: ReturnType<typeof PrefixLogger.createLogger>;
}
