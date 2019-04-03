import { SSServer } from "../src";

const ssserver = new SSServer({
  algorithm: "rc4",
  password: "welcome",
  port: 9000,
});

ssserver.start();
