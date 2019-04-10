const { getOwnPropertyDescriptors, getOwnKeys } = require("core-decorators/lib/private/utils");

type AnyFunction = (...args: any[]) => any;
export const unpump = (...streams: any[]) => {
  const _streams = streams.slice(1, streams.length);
  _streams.reduce(
    (current: NodeJS.ReadableStream, item: NodeJS.WritableStream) => {
      current.unpipe(item);
      return item;
    },
    streams[0],
  );
};

export function logDecorator(log: AnyFunction) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    if (!descriptor) {
      return descriptor;
    }
    const func = descriptor.value;
    descriptor.value = function wrapper(...args: any[]) {
      log(`#${key} called with %o`, args);
      // tslint:disable-next-line:no-invalid-this
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

export function logClassDecorator(log: AnyFunction) {
  return (target: any) => {
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
