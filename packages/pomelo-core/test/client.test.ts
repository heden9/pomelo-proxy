
import * as assert from "power-assert";
import { SocksClient, SocksServer } from "../src";
import { ESocksVersion } from "../src/protocol/packet";
import { proxyOk, selectPort } from "./fixtures/helper";


describe("client.test.ts", () => {
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

    it("should ready when established", async () => {
      const client = new SocksClient({
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
      client.connect();
      await client.ready();
      assert.ok(client.isEstablished);
      assert.ok(!client.isClosed);
      await client.close();
    });

    it("establish fail without userName/password", async () => {
      const client = new SocksClient({
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
      client.connect();
      try {
        await client.ready();
        assert.ok(false);
      } catch (ex) {
        assert.equal(ex.name, "SOCKS_AUTH_REJECTED");
        assert.equal(ex.message, "UNASSIGNED");
      }
      assert.ok(client.isClosed);
      assert.ok(!client.isEstablished);
    });

    it("close after established", async () => {
      const client = new SocksClient({
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
      const promise = client.await("error");
      client.connect();
      await client.ready();
      assert.ok(client.isEstablished);
      assert.ok(!client.isClosed);
      await server.close();
      try {
        await promise;
        assert.ok(false);
      } catch  (ex) {
        assert.equal(ex.name, "SOCKET_CLOSED");
      }
      assert.ok(client.isClosed);
      assert.ok(client.isEstablished);
    });
  });
});
