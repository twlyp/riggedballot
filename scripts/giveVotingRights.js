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

  let tx = await ballot.giveRightToVote(addresses.oliver);
  console.log(tx.hash);
  await tx.wait();

  tx = await ballot.giveRightToVote(addresses.håkon);
  console.log(tx.hash);
  await tx.wait();

  tx = await ballot.giveRightToVote(addresses.martin);
  console.log(tx.hash);
  await tx.wait();

  tx = await ballot.giveRightToVote(addresses.vasilis);
  console.log(tx.hash);
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
