import { createLoggers, createPrefixLogger } from "pomelo-util";
import SDKBase from "sdk-base";

const $LOGGERS = Symbol("SocksBase#loggers");
const $LOGGER = Symbol("SocksBase#logger");
type TLoggers = ReturnType<typeof createLoggers>;
type TLogger = ReturnType<typeof createPrefixLogger>;
export class SocksBase extends SDKBase {
  public get loggers(): TLoggers {
    if (!this[$LOGGERS]) {
      this[$LOGGERS] = createLoggers();
    }
    return this[$LOGGERS];
  }

  public get logger(): TLogger {
    if (!this[$LOGGER]) {
      this[$LOGGER] = createPrefixLogger(this.loggers.logger, this._loggerPrefix);
    }
    return this[$LOGGER];
  }

  protected get _loggerPrefix() {
    return `[pomelo-core][${this.constructor.name}]`;
  }

  protected get _loggerOptions() {
    return {};
  }

  private [$LOGGERS]: TLoggers;
  private [$LOGGER]: TLogger;
  public close() {
    for (const logger of this.loggers.values()) {
      logger.close();
    }
  }
}
