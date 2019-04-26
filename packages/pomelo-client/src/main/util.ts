import * as cp from "child_process";

const childs = new Set();
let hadHook = false;

function gracefull(proc: cp.ChildProcess) {
  // save child ref
  childs.add(proc);

  proc.once("exit", () => {
    childs.delete(proc);
  });
  // only hook once
  /* istanbul ignore else */
  if (!hadHook) {
    hadHook = true;
    let signal: any;
    [ "SIGINT", "SIGQUIT", "SIGTERM" ].forEach((event) => {
      process.once(event as any, () => {
        signal = event;
        process.exit(0);
      });
    });

    process.once("exit", () => {
      // had test at my-helper.test.js, but coffee can't collect coverage info.
      for (const child of childs) {
        child.kill(signal);
      }
    });
  }
}

export function forkNode(modulePath: string, args: any[] = [], options: cp.ForkOptions = {}) {
  // options.stdio = options.stdio || "inherit";
  const proc = cp.fork(modulePath, args, options);
  gracefull(proc);
  return proc;
}
