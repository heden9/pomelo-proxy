import { Duplex } from "stream";

const { getOwnPropertyDescriptors, getOwnKeys } = require('core-decorators/lib/private/utils');

export function unpump(
  stream1: NodeJS.ReadableStream,
  stream2: Duplex,
  stream3: NodeJS.WritableStream,
) {
  stream1.unpipe(stream2);
  stream2.unpipe(stream3);
}

export function logDecorator(log: Function) {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    if (!descriptor) {
      return descriptor;
    }
    const func = descriptor.value;
    descriptor.value = function wrapper(...args: any[]) {
      log(`#${key} called with %o`, args);
      const result = func.call(this, ...args);
      if (result instanceof Promise) {
        return result.then((d) => log(`#${key} returns %o`, d));
      }
      log(`#${key} returns %o`, result);
      return result;
    };
    return descriptor;
  };
}

export function logClassDecorator(log: Function) {
  return function(target: any) {
    const descs = getOwnPropertyDescriptors(target.prototype);
    const keys = getOwnKeys(descs);

    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i];
      const desc = descs[key];

      if (typeof desc.value !== "function" || key === "constructor") {
        continue;
      }

      Object.defineProperty(
        target.prototype,
        key,
        logDecorator(log)(target.prototype, key, desc),
      );
    }
  };
}
