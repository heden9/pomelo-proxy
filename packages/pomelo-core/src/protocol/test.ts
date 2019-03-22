import * as net from "net";
import pump from "pump";
import * as Protocol from ".";
import { SocksConnectRequest } from "./packet";
import { EPacketType, ESocksCommand, ESocksVersion } from "./packet/type";


const socket = net.connect(12200);
const encoder = Protocol.encoder();
const decoder = Protocol.decoder({
  PacketClass: SocksConnectRequest,
});

socket.once("connect", () => {
  console.log("connected");
});
socket.once("close", () => {
  console.log("close");
});
socket.once("error", (err) => {
  console.log(err);
});

// 监听 response / heartbeat_acl
decoder.on(SocksConnectRequest.displayName, (res) => {
  console.log(res);
});

net.createServer((server) => {
  pump(
    encoder,
    server,
    socket,
    decoder,
  );

  encoder.writePacket({
    address: "FF01::1101",
    command: ESocksCommand.connect,
    port: 90,
    type: EPacketType.CONNECT_REQUEST,
    version: ESocksVersion.v5,
  });
  server.end();
}).listen(12200);
