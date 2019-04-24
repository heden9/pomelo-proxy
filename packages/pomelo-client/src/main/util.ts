export function createGetters<T extends (...args: any) => any>(fn: T, args?: Parameters<T>, instance = false): () => ReturnType<T> {
  let value: ReturnType<T>;

  return () => {
    if (value !== undefined) {
      return value;
    }
    if (instance) {
      // TODO: new mode
      // value = new fn(...args);
    } else {
      value = fn.apply(args);
    }
    return value;
  };
}
