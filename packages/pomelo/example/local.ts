import { SSLocal } from "../src";

const sslocal = new SSLocal({
  algorithm: "rc4",
  password: "welcome",
  port: 3000,
  serverHost: "127.0.0.1",
  serverPort: 9000,
});

sslocal.start();
