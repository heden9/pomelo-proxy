import { TEST_CONFIG } from "./fixtures/config";
import { TestUtil } from "./fixtures/helper";

describe("encoder.test.ts", () => {
  new TestUtil(TEST_CONFIG).runEncoder();
});

