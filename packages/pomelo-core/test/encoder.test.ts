import * as net from "net";
import * as assert from "power-assert";
import pump from "pump";
import * as protocol from "../src/protocol";
import { EPacketType, SocksAuthRequest, SocksAuthResponse } from "../src/protocol/packet";
import { SOCKS_AUTH_REQ, SOCKS_AUTH_RES, TEST_CONFIG } from "./fixtures/config";
import { TestUtil } from "./fixtures/helper";

describe("encoder.test.ts", () => {
  new TestUtil(TEST_CONFIG).runEncoder();

  describe("drain", async () => {
    let server: net.Server;
    let port: number;
    const authReq = {
      type: EPacketType.AUTH_REQUEST,
      ...SOCKS_AUTH_REQ.BASIC.json,
    };
    const authRes = {
      type: EPacketType.AUTH_RESPONSE,
      ...SOCKS_AUTH_RES.BASIC.json,
    };

    before((done) => {
      server = net.createServer();
      server.on("connection", (socket) => {

        const encoder = protocol.encoder();
        const decoder = protocol.decoder({
          PacketClass: [SocksAuthRequest],
        });
        pump(encoder, socket, decoder);

        decoder.on("decode", (req) => {
          encoder.writePacket(authRes);
        });
      });
      server.listen(0, () => {
        port = (server.address() as net.AddressInfo).port;
        done();
      });
    });
    after(() => {
      server.close();
      // FIXME: wait for close
    });
    it("should process drain ok", (done) => {
      const socket = net.connect(port, "127.0.0.1");
      const encoder = protocol.encoder();
      const decoder = protocol.decoder({
        PacketClass: SocksAuthResponse,
      });
      pump(encoder, socket, decoder);

      const count = 6000;
      for (let i = 0; i < count; i++) {
        encoder.writePacket(authReq);
      }

      decoder.once("decode", (res) => {
        assert.deepEqual({ type: res.type, ...res.data }, authRes);

        socket.destroy();
        encoder.destroy();
        decoder.destroy();
        done();
      });
    });
  });
});
