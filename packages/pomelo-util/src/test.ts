import * as net from "net";
import * as assert from "power-assert";

export function assertByKey(source: any, target: any) {
  Object.keys(source).forEach((key) => {
    assert.deepEqual(source[key], target[key]);
  });
}

export function selectPort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer().listen(0, () => {
      resolve((server.address() as net.AddressInfo).port);
      server.close();
    });
  });
}
