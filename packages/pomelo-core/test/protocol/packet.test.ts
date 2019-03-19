import assert from "power-assert";
import { SocksConnectRequest } from "../../src/protocol/packet";


describe("packet.test.js", () => {
  let packet;
  const TARGET_BUFFER_DOMAIN = Buffer.from([0x05, 0x01, 0x00, 0x03, 0x0d, 0x77, 0x77, 0x77, 0x2e, 0x62, 0x61, 0x69, 0x64, 0x75, 0x2e, 0x63, 0x6f, 0x6d, 0x00, 0x50]);
  const TARGET_BUFFER_IPv4 = Buffer.from([0x05, 0x01, 0x00, 0x01, 0x7f, 0x00, 0x00, 0x01, 0x00, 0x50]);
  const TARGET_BUFFER_IPv6 = Buffer.from([0x05, 0x01, 0x00, 0x04, 0xff, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x11, 0x01, 0x00, 0x50]);

  it("SocksConnectRequest toBuffer domain", () => {
    packet = new SocksConnectRequest({
      address: "www.baidu.com",
      command: 1,
      port: 80,
      version: 5,
    });
    const buf = packet.toBuffer();
    assert.deepEqual(buf, TARGET_BUFFER_DOMAIN);
  });
  it("SocksConnectRequest toBuffer IPv4", () => {
    packet = new SocksConnectRequest({
      address: "127.0.0.1",
      command: 1,
      port: 80,
      version: 5,
    });
    const buf = packet.toBuffer();
    assert.deepEqual(buf, TARGET_BUFFER_IPv4);
  });
  it("SocksConnectRequest toBuffer IPv6", () => {
    packet = new SocksConnectRequest({
      address: "FF01::1101",
      command: 1,
      port: 80,
      version: 5,
    });
    const buf = packet.toBuffer();
    assert.deepEqual(buf, TARGET_BUFFER_IPv6);
  });
});
