const hre = require("hardhat");
const { toWei } = require("./utils");

const addresses = require("../addresses.json");
const {
  ALCHEMY_API_KEY,
  ETHERSCAN_API_TOKEN,
  RINKEBY_PRIVATE_KEY,
} = require("../secrets.json");
const {
  abi,
} = require("../artifacts/contracts/RiggedBallot.sol/RiggedBallot.json");

async function main() {
  const provider = ethers.getDefaultProvider("rinkeby", {
    etherscan: ETHERSCAN_API_TOKEN,
    alchemy: ALCHEMY_API_KEY,
  });
  const wallet = new ethers.Wallet(RINKEBY_PRIVATE_KEY, provider);

  const ballot = new ethers.Contract(addresses.contract, abi, wallet);

  //   let tx = await ballot.bribe(addresses.oliver, 2, { value: toWei(0.005) });
  //   console.log(tx.hash);
  //   await tx.wait();

  let tx = await ballot.bribe(addresses.håkon, 2, { value: toWei(0.006) });
  console.log(tx.hash);
  await tx.wait();

  tx = await ballot.bribe(addresses.martin, 2, { value: toWei(0.007) });
  console.log(tx.hash);
  await tx.wait();

  tx = await ballot.bribe(addresses.vasilis, 2, { value: toWei(0.008) });
  console.log(tx.hash);
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
