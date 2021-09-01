const hre = require("hardhat");
const { contract } = require("../addresses.json");

hre
  .run("verify", {
    address: contract,
    constructorArgs: "./scripts/constructorArgs.js",
  })
  .then((res) => {
    console.log(res);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
