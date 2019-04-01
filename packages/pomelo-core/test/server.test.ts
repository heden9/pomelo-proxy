import * as assert from "power-assert";
import { SocksClient, SocksServer } from "../src";
import { ESocksVersion } from "../src/protocol/packet";
import { proxyOk, selectPort } from "./fixtures/helper";

describe("server.test.ts", () => {
  let port: number;
  before(async () => {
    port = await selectPort();
  });
  it("should ready when established", async () => {
    const server = new SocksServer({ port });
    await server.start();
    await server.ready();
    assert.ok(true);
    const info = await SocksClient.createConnection({
      command: "connect",
      destination: {
        address: "www.alipay.com",
        port: 80,
      },
      proxy: {
        port,
        type: ESocksVersion.v5,
      },
    });
    await proxyOk(info);
    await info.instance.close();
    await server.close();
  });
});
