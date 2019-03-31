declare module "await-event" {
  import { EventEmitter } from "events";

  function awaitEvent(
    emitter: EventEmitter,
    event: string | symbol,
  ): Promise<any>;
  export = awaitEvent;
}
