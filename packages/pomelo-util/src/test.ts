import * as net from "net";

export function selectPort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer().listen(0, () => {
      resolve((server.address() as net.AddressInfo).port);
      server.close();
    });
  });
}
