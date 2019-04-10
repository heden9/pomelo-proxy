"use strict";

import awaitEvent from "await-event";
import * as cp from "child_process";
const sleep = require("mz-modules/sleep");
const pstree = require("ps-tree");

export async function terminate(subProcess: cp.ChildProcess, timeout: number) {
  const pid = subProcess.pid;
  const childPids = await getChildPids(pid);
  await Promise.all([
    killProcess(subProcess, timeout),
    killChildren(childPids, timeout),
  ]);
}

// kill process, if SIGTERM not work, try SIGKILL
async function killProcess(subProcess: cp.ChildProcess, timeout: number) {
  subProcess.kill("SIGTERM");
  await Promise.race([awaitEvent(subProcess, "exit"), sleep(timeout)]);
}

// kill all children processes, if SIGTERM not work, try SIGKILL
function* killChildren(children: number[], timeout: number) {
  if (!children.length) {
    return;
  }
  kill(children, "SIGTERM");

  const start = Date.now();
  // if timeout is 1000, it will check twice.
  const checkInterval = 400;
  let unterminated: number[] = [];

  while (Date.now() - start < timeout - checkInterval) {
    yield sleep(checkInterval);
    unterminated = getUnterminatedProcesses(children);
    if (!unterminated.length) {
      return;
    }
  }
  kill(unterminated, "SIGKILL");
}

function getChildPids(pid: number): Promise<number[]> {
  return new Promise((resolve) => {
    pstree(pid, (err: Error | null, children: any[]) => {
      // if get children error, just ignore it
      if (err) {
        children = [];
      }
      resolve(children.map((_children) => parseInt(_children.PID)));
    });
  });
}

function kill(pids: number[], signal: string) {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch (_) {
      // ignore
    }
  }
}

function getUnterminatedProcesses(pids: number[]) {
  return pids.filter((pid) => {
    try {
      // success means it's still alive
      process.kill(pid, 0);
      return true;
    } catch (err) {
      // error means it's dead
      return false;
    }
  });
}
