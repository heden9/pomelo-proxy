// import axios from "axios";
// import { machineId } from "node-machine-id";
import { BaseManager } from "./base-manager";
import { UserDefaultStore } from "./store";
import { IBaseOptions } from "./type";

export interface IServiceOptions extends IBaseOptions {

}

export class ServiceManager extends BaseManager<IServiceOptions> {
  constructor(store: UserDefaultStore, options: IBaseOptions) {
    super(store, options);
  }

  public async login() {
  }
}
