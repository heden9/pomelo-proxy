import * as cp from "child_process";

const debug = require("debug")("pomelo-util:forkNode");
const childs = new Set();
let hadHook = false;

function gracefull(proc: cp.ChildProcess) {
  // save child ref
  childs.add(proc);

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
        debug("kill child %s with %s", child.pid, signal);
        child.kill(signal);
      }
    });
  }
}

interface IForkNodeResult<T = any> extends Promise<T> {
  proc: cp.ChildProcess;
}

export function forkNode(modulePath: string, args: any[] = [], options: cp.ForkOptions = {}) {
  options.stdio = options.stdio || "inherit";
  debug("Run fork `%s %s %s`", process.execPath, modulePath, args.join(" "));
  const proc = cp.spawn(modulePath, args, options);
  gracefull(proc);

  const promise = new Promise((resolve, reject) => {
    proc.once("exit", (code: number) => {
      childs.delete(proc);
      if (code !== 0) {
        const err = new Error(
          modulePath + " " + args + " exit with code " + code,
        );
        (err as any).code = code;
        reject(err);
      } else {
        resolve();
      }
    });
  }) as IForkNodeResult;
  promise.proc = proc;
  return promise;
}
