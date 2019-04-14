import { createPrefixLogger } from "pomelo-util";
import SDKBase from "sdk-base";
import { UserDefaultStore } from "./store";
import { IBaseOptions } from "./type";

const $LOGGER = Symbol("main#logger");
export class BaseManager<T extends IBaseOptions> extends SDKBase {
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
    super();
    this._store = store;
    this._options = options;
  }
}

export type TBaseManagerClass<T extends BaseManager<IBaseOptions>> = new (store: UserDefaultStore, options: IBaseOptions) => T;
