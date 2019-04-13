import { createPrefixLogger } from "../../../pomelo-util/build";
import { UserDefaultStore } from "./store";
import { IBaseOptions } from "./type";

const $LOGGER = Symbol("main#logger");
export class BaseManager<T extends IBaseOptions> {
  public get logger() {
    if (!this[$LOGGER]) {
      this[$LOGGER] = createPrefixLogger(this._options.logger, this._loggerPrefix);
    }
    return this[$LOGGER];
  }

  protected get _loggerPrefix() {
    return "[pomelo][base-manager]";
  }

  protected _options: T;
  protected _store: UserDefaultStore;
  private [$LOGGER]: ReturnType<typeof createPrefixLogger>;
  constructor(store: UserDefaultStore, options: T) {
    this._store = store;
    this._options = options;
  }
}

export type TBaseManagerClass<T extends BaseManager<IBaseOptions>> = new (store: UserDefaultStore, options: IBaseOptions) => T;
