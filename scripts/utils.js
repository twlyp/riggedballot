function toWei(etherAmount) {
  return ethers.utils.parseEther(String(etherAmount));
}

module.exports = { toWei };
