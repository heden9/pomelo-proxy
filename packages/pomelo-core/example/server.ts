import { SocksServer } from "../src";

const server = new SocksServer({
  killTimeout: 30000,
  port: 80,
  async authenticate(userName, password) {
    return userName === "hd" && password === "hd";
  },
});
server.start();
