const options = JSON.parse(process.argv[2]);
// find pomelo path
const { SSLocal } = require(options.pomelo);
const sslocal = new SSLocal(options);
sslocal
  .start()
  .then(() => {
    process.send({ status: "READY" });
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
