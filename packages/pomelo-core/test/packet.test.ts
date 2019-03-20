import { TEST_CONFIG } from "./fixtures/config";
import { PacketTestUtil } from "./fixtures/helper";

describe("packet.test.js", () => {
  new PacketTestUtil(TEST_CONFIG).run();
});

