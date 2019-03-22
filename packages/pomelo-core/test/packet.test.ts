import { TEST_CONFIG } from "./fixtures/config";
import { TestUtil } from "./fixtures/helper";

describe("packet.test.ts", () => {
  new TestUtil(TEST_CONFIG).runPacket();
});

