import assert from "power-assert";
import { ITestConfig } from "./config";

export class PacketTestUtil {
  private _dataSource: ITestConfig[];
  constructor(dataSource: ITestConfig[]) {
    this._dataSource = dataSource;
  }

  public run() {
    this._dataSource.forEach((source) => {
      Object.keys(source.data).forEach((key) => {
        const { buffer, json, only } = source.data[key];
        const itFn = only ? it.only : it;
        itFn(`${source.class.name} ${key} toBuffer`, async () => {
          const packet = new source.class(json);
          const _buf = packet.toBuffer();
          assert.deepEqual(_buf, buffer);
        });
        itFn(`${source.class.name} ${key} toJSON`, async () => {
          const packet = new source.class(buffer);
          const _json = packet.toJSON();
          assert.deepEqual(_json, json);
        });
      });
    });
  }
}
