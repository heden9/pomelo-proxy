import awaitEvent from "await-event";
import * as assert from "power-assert";
import pump from "pump";
import * as protocol from "../src/protocol";
import { EPacketType, SocksAuthRequest } from "../src/protocol/packet";
import { SOCKS_AUTH_REQ } from "./fixtures/config";


describe("decoder.test.ts", () => {
  const authReq = SOCKS_AUTH_REQ.BASIC.json;
  it("groupMode, check done ok", async () => {
    const encoder = protocol.encoder();
    const decoder = protocol.decoder({
      PacketClass: [SocksAuthRequest],
    });
    pump(encoder, decoder);
    const count = 2;
    const promise = awaitEvent(decoder, "decode");
    for (let i = 0; i < count; i++) {
      encoder.writePacket({
        type: EPacketType.AUTH_REQUEST,
        ...authReq,
      });
    }

    const res = await promise;
    assert.deepEqual(res.data, authReq);
    assert.ok(decoder.isDone);

    encoder.destroy();
    decoder.destroy();
  });
  it("buffer concat ok", async () => {
    const encoder = protocol.encoder();
    const decoder = protocol.decoder({
      PacketClass: SocksAuthRequest,
    });
    pump(encoder, decoder);
    const authReqBuffer = new SocksAuthRequest(authReq).toBuffer();
    const sep = 5;
    const slice1 = authReqBuffer.slice(0, sep);
    const slice2 = authReqBuffer.slice(sep, authReqBuffer.length);
    const promise = awaitEvent(decoder, "decode");
    encoder.write(slice1);
    encoder.write(slice2);

    const res = await promise;
    assert.ok(!decoder.isDone);
    assert.deepEqual(res.data, authReq);

    encoder.destroy();
    decoder.destroy();
  });
});
