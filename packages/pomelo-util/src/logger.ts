import { EggLoggers, EggLoggersOptions } from "egg-logger";
import * as path from "path";

export interface ILoggerLike {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

export type TLoggerMethod = keyof ILoggerLike;

export class PrefixLogger {
  public static config: EggLoggersOptions = {
    appLogName: `pomelo-web.log`,
    type: "application",
    buffer: true,
    consoleLevel: "INFO",
    dir: path.join(process.env.HOME as string, ".pomelo", "logs"),
    encoding: "utf8",
    level: "INFO",
    outputJSON: false,
    coreLogName: "egg-web.log",
    agentLogName: "egg-agent.log",
    errorLogName: "common-error.log",
  };

  public static createLoggers(options: Partial<EggLoggersOptions> = {}) {
    if (process.env.NODE_ENV === "unittest") {
      options.level = "WARN";
      options.consoleLevel = "WARN";
    }
    const loggers = new EggLoggers({
      logger: {
        ...PrefixLogger.config,
        ...options,
      },
    } as any);
    return loggers;
  }

  protected _logger: ILoggerLike;
  protected _prefix: string;
  constructor(logger: ILoggerLike, prefix: string) {
    this._logger = logger;
    this._prefix = prefix;
  }

  public debug(...args: any[]) {
    this._call("debug", args);
  }

  public info(...args: any[]) {
    this._call("info", args);
  }

  public warn(...args: any[]) {
    this._call("warn", args);
  }

  public error(...args: any[]) {
    this._call("error", args);
  }

  private _call(method: TLoggerMethod, args: any[]) {
    // add `[${pathName}]` in log
    if (this._prefix && typeof args[0] === "string") {
      args[0] = `${this._prefix} ${args[0]}`;
    }
    this._logger[method](...args);
  }
}

export function createLoggers(options: Partial<EggLoggersOptions> = {}) {
  if (process.env.NODE_ENV === "unittest") {
    options.level = "WARN";
    options.consoleLevel = "WARN";
  }
  const loggers = new EggLoggers({
    logger: {
      ...PrefixLogger.config,
      ...options,
    },
  } as any);
  return loggers;
}

export function createPrefixLogger(logger: ILoggerLike, prefix: string) {
  // 无中括号包裹
  if (!(/^\[.+\]$/.test(prefix))) {
    prefix = `[${prefix}]`;
  }
  return new PrefixLogger(logger, prefix);
}
