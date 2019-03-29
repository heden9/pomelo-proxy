import { Duplex } from "stream";

const awaitEvent = require("await-event");

export function unpump(stream1: NodeJS.ReadableStream, stream2: Duplex, stream3: NodeJS.WritableStream) {
  stream1.unpipe(stream2);
  stream2.unpipe(stream3);
  // return Promise.all([
  //   // awaitEvent(stream2, "unpipe"),
  //   awaitEvent(stream3, "unpipe"),
  //   awaitEvent(stream3, "unpipe"),
  // ]);
}
