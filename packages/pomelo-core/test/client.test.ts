import { describe } from "mocha";
import * as assert from "power-assert";
import { ISocksClientEstablishedEvent, SocksClient, SocksServer } from "../src";
import { ESocksVersion } from "../src/protocol/packet";
import { selectPort } from "./fixtures/helper";

import awaitEvent from "await-event";

describe("client.test.ts", () => {
  async function proxyOk({ instance, socket }: ISocksClientEstablishedEvent) {
    socket.resume();
    socket.write("GET /json HTTP/1.1\nHost: www.alipay.com\n\n");
    assert.ok(instance instanceof SocksClient);
    const data = await awaitEvent(socket, "data");
    assert.ok(data.toString().indexOf("Content-Type: text/html") !== -1);
    await instance.close();
  }

  describe("no-auth server", () => {
    let server: SocksServer;
    let port: number;
    before(async () => {
      port = await selectPort();
      server = new SocksServer({
        killTimeout: 3000,
        port,
      });
      return server.start();
    });
    after(() => {
      return server.close();
    });
    it("no-auth proxy ok", async () => {
      const { instance, socket } = await SocksClient.createConnection({
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
      await proxyOk({ instance, socket });
    });
    it("auth or no-auth proxy ok", async () => {
      const { instance, socket } = await SocksClient.createConnection({
        command: "connect",
        destination: {
          address: "www.alipay.com",
          port: 80,
        },
        proxy: {
          password: "hd",
          port,
          type: ESocksVersion.v5,
          userName: "hd",
        },
      });
      await proxyOk({ instance, socket });
    });
  });
  describe("auth server", () => {
    let server: SocksServer;
    let port: number;
    before(async () => {
      port = await selectPort();
      server = new SocksServer({
        killTimeout: 3000,
        port,
        authenticate(userName, password) {
          return userName === "hd" && password === "hd";
        },
      });
      return server.start();
    });
    after(() => {
      return server.close();
    });
    it("auth proxy ok", async () => {
      const { instance, socket } = await SocksClient.createConnection({
        command: "connect",
        destination: {
          address: "www.alipay.com",
          port: 80,
        },
        proxy: {
          password: "hd",
          port,
          type: ESocksVersion.v5,
          userName: "hd",
        },
      });
      await proxyOk({ instance, socket });
    });
  });
});
