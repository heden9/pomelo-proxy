import * as net from "net";
import { SocksClient } from ".";
import { SocksConnectResponse, SocksHandshakeResponse } from "./protocol/packet";

const server = net.createServer((socket) => {
  const handshakeRes = new SocksHandshakeResponse({
    method: 0,
    version: 5,
  }).toBuffer();
  const connectRes = new SocksConnectResponse({
    address: "www.baidu.com",
    port: 90,
    reply: 1,
    version: 5,
  }).toBuffer();
  let i = 0;
  socket.on("data", (s) => {
    console.log(s);
    if (i === 0) {
      socket.write(handshakeRes);
    } else if (i === 1) {
      socket.write(connectRes);
    }
    i += 1;
  });
  // server.close();
}).listen(80);

SocksClient.createConnection(
{
  command: "connect",
  destination: {
    address: "www.baidu.com",
    port: 90,
  },
  proxy: {
    host: "127.0.0.1",
    port:  80,
    type: 5,
  },
},
(err, info) => {
  if (err) {
    return;
  }
  console.log(info);
});

