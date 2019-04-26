import { SSLocal } from "pomelo";

const gracefulExit = require("graceful-process");
const options = JSON.parse(process.argv[2]);

const sslocal = new SSLocal(options);
sslocal
  .start()
  .then(() => {
    (process as any).send({ status: "READY" });
  })
  .catch((ex: Error) => {
    // loggers.logger.error(ex);
    console.error(ex);
    process.exit(1);
    // setTimeout(() => {
    //   process.exitCode = 1;
    //   process.kill(process.pid);
    // }, 1000);
  });

gracefulExit({
  beforeExit: () => sslocal.close(),
  label: "ss-local",
  logger: console,
});
