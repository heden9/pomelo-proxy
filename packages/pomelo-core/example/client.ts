import { SocksClient } from "../src";

SocksClient.createConnection(
{
  command: "connect",
  destination: {
    address: "www.baidu.com",
    port: 90,
  },
  proxy: {
    host: "127.0.0.1",
    password: "hd",
    port:  80,
    type: 5,
    userName: "hd",
  },
},
(err, info) => {
  if (err) {
    return;
  }
  console.log(info);
});

