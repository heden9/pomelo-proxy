import awaitEvent from "await-event";
import * as net from "net";
import * as assert from "power-assert";
import pump from "pump";
import { PassThrough } from "stream";
import * as protocol from "../../src/protocol";
import { ITestConfig } from "./config";

import { ISocksClientEstablishedEvent, SocksClient } from "../../src";

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

export async function proxyOk({ instance, socket }: ISocksClientEstablishedEvent) {
  socket.resume();
  socket.write("GET /json HTTP/1.1\nHost: www.alipay.com\n\n");
  assert.ok(instance instanceof SocksClient);
  const info = await instance.awaitFirst(socket, ["data", "error", "close"]);
  assert.ok(info.args[0].toString().indexOf("Content-Type: text/html") !== -1);
  await instance.close();
}

export class TestUtil {
  private _dataSource: ITestConfig[];
  constructor(dataSource: ITestConfig[]) {
    this._dataSource = dataSource;
  }

  public runPacket() {
    this._processLoop((item, key, source) => {
      const { buffer, json, only } = item;
      const itFn = only ? it.only : it;
      itFn(`${source.class.name} ${key} toBuffer`, async () => {
        const packet = new source.class(json);
        const _buf = packet.toBuffer();
        assert.deepEqual(_buf, buffer);
      });
      itFn(`${source.class.name} ${key} toJSON`, async () => {
        const packet = new source.class(buffer);
        const _json = packet.toJSON();
        assertByKey(_json, json);
      });
    });
  }

  public runEncoder() {
    this._processLoop((item, key, source) => {
      const { json, only } = item;
      const itFn = only ? it.only : it;
      itFn(`encode ${source.class.name} ${key} success`, async () => {
        const socket = new PassThrough();
        const encoder = protocol.encoder();
        const decoder = protocol.decoder({
          PacketClass: source.class,
        });
        pump(encoder, socket, decoder);
        const type = source.class.displayName;
        const promise = awaitEvent(decoder, "decode");
        encoder.writePacket({
          type,
          ...json,
        });
        const result = await promise;
        assertByKey(result.data, json);
        assert.equal(result.type, type);
      });
    });
  }

  private _processLoop(callback: (item: ITestConfig["data"][0], key: string, source: ITestConfig) => void) {
    this._dataSource.forEach((source) => {
      Object.keys(source.data).forEach((key) => {
        const item = source.data[key];
        callback(item, key, source);
      });
    });
  }
}
