import * as assert from "power-assert";
import pump from "pump";
import * as protocol from "../src/protocol";
import { EPacketType, SocksAuthRequest } from "../src/protocol/packet";
import { SOCKS_AUTH_REQ } from "./fixtures/config";

describe("decoder.test.ts", () => {
  const authReq = SOCKS_AUTH_REQ.BASIC.json;
  it("groupMode, check done ok", () => {
    const encoder = protocol.encoder();
    const decoder = protocol.decoder({
      PacketClass: [SocksAuthRequest],
    });
    pump(encoder, decoder);
    const count = 2;
    for (let i = 0; i < count; i++) {
      encoder.writePacket({
        type: EPacketType.AUTH_REQUEST,
        ...authReq,
      });
    }

    let counter = 0;
    decoder.on("decode", (res) => {
      counter ++;
      assert.deepEqual(res.data, authReq);
      assert.ok(decoder.isDone);
      assert.equal(counter, count);
    });
  });
  it("buffer concat ok", () => {
    const encoder = protocol.encoder();
    const decoder = protocol.decoder({
      PacketClass: SocksAuthRequest,
    });
    pump(encoder, decoder);
    const authReqBuffer = new SocksAuthRequest(authReq).toBuffer();
    const sep = 5;
    const slice1 = authReqBuffer.slice(sep);
    const slice2 = authReqBuffer.slice(sep + 1, authReqBuffer.length);
    encoder.write(slice1);
    encoder.write(slice2);

    decoder.on("decode", (res) => {
      assert.deepEqual(res.data, authReq);
    });
  });
});
