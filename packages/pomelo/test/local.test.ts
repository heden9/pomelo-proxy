import { selectPort } from "pomelo-util";
import * as assert from "power-assert";
import { SSLocal, SSServer } from "../src";
import { BASE_SS_SERVER_OPTIONS } from "./fixtures/constant";
import { requestSocks } from "./fixtures/helper";


describe("local.test.ts", () => {
  let server: SSServer;
  let local: SSLocal;
  let serverPort: number;
  let localPort: number;
  before(async () => {
    serverPort = await selectPort();
    server = new SSServer({
      ...BASE_SS_SERVER_OPTIONS,
      port: serverPort,
    });
    return server.start();
  });
  after(() => {
    return server.close();
  });
  beforeEach(async () => {
    localPort = await selectPort();
    local = new SSLocal({
      ...BASE_SS_SERVER_OPTIONS,
      port: localPort,
      serverHost: "127.0.0.1",
      serverPort,
    });
    return local.start();
  });
  afterEach(() => {
    return local.close();
  });
  it("should proxy twice ok", async () => {
    const { stdout: stdout1 } = await requestSocks("www.baidu.com", localPort);
    const { stdout: stdout2 } = await requestSocks("www.baidu.com", localPort);
    assert.ok(stdout1.indexOf("<!DOCTYPE html>") !== -1);
    assert.ok(stdout2.indexOf("<!DOCTYPE html>") !== -1);
  });
});
