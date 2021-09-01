const { ethers } = require("hardhat");

const proposalNames = ["first", "second", "third"];
const proposalBytes = proposalNames.map((el) =>
  ethers.utils.formatBytes32String(el)
);

async function main() {
  // local deployment:
  // const [owner, admin] = await hre.ethers.getSigners();

  // await hre.run('compile');

  const Ballot = await ethers.getContractFactory("RiggedBallot");
  const ballot = await Ballot.deploy(proposalBytes);

  await ballot.deployed();

  console.log("Ballot deployed to:", ballot.address);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { proposalNames, proposalBytes };
