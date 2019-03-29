import { SocksClient } from "../src";

SocksClient.createConnection(
{
  command: "connect",
  destination: {
    address: "www.baidu.com",
    port: 80,
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
  const { socket } = info;
  socket.resume();
  socket.on("data", (data: any) => {
    console.log(data.toString());
  });
  socket.write("GET /json HTTP/1.1\nHost: www.baidu.com\n\n");
});

