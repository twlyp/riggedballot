const { expect } = require("chai");
const { ethers } = require("hardhat");
const { toWei } = require("../scripts/utils");
const { proposalNames, proposalBytes } = require("../scripts/deploy");

describe("Ballot", async () => {
  let Ballot, ballot, owner, addrs;

  beforeEach(async () => {
    Ballot = await ethers.getContractFactory("RiggedBallot");
    [owner, ...addrs] = await ethers.getSigners();
    ballot = await Ballot.deploy(proposalBytes);
  });

  describe("deployment", () => {
    it("should set the correct chairperson", async function () {
      expect(await ballot.chairperson()).to.equal(owner.address);
    });

    it("should set the correct proposals and they should have no votes", async () => {
      for (let i = 0; i < proposalBytes.length; i++) {
        const proposal = await ballot.proposals(i);

        expect(proposal.name).to.equal(proposalBytes[i]);
        expect(proposal.voteCount).to.equal(0);
      }
    });
  });

  describe("voting rights", () => {
    it("should allow chairperson to give right to vote", async () => {
      await ballot.giveRightToVote(addrs[0].address);
      const voter = await ballot.voters(addrs[0].address);

      expect(voter.weight).to.equal(1);
    });

    it("shouldn't allow normal users to give right to vote", async () => {
      await expect(
        ballot.connect(addrs[0]).giveRightToVote(addrs[1].address)
      ).to.be.revertedWith("Only chairperson can give right to vote.");

      const voter = await ballot.voters(addrs[1].address);

      expect(voter.weight).to.equal(0);
    });

    it("shouldn't give right to vote if the user already voted", async () => {
      await ballot.giveRightToVote(addrs[0].address);
      await ballot.connect(addrs[0]).vote(0);

      await expect(ballot.giveRightToVote(addrs[0].address)).to.be.revertedWith(
        "The voter already voted."
      );
    });

    it("shouldn't give right to vote if user already has right to vote", async () => {
      await ballot.giveRightToVote(addrs[0].address);

      await expect(ballot.giveRightToVote(addrs[0].address)).to.be.revertedWith(
        "the voter already has the right to vote"
      );
    });

    it("should allow authorized users to vote", async () => {
      await ballot.giveRightToVote(addrs[0].address);
      await ballot.connect(addrs[0]).vote(0);
      const voter = await ballot.voters(addrs[0].address);

      expect(voter.vote).to.equal(0);
    });

    it("shouldn't allow unauthorized users to vote", async () => {
      await expect(ballot.connect(addrs[0]).vote(0)).to.be.revertedWith(
        "Has no right to vote"
      );
    });

    it("shouldn't allow users to vote twice", async () => {
      await ballot.giveRightToVote(addrs[0].address);
      await ballot.connect(addrs[0]).vote(0);

      await expect(ballot.connect(addrs[0]).vote(0)).to.be.revertedWith(
        "Already voted."
      );

      const voter = await ballot.voters(addrs[0].address);

      expect(voter.vote).to.equal(0);
    });
  });

  describe("delegation", () => {
    it("should allow voter to delegate", async () => {
      await ballot.giveRightToVote(addrs[0].address);
      await ballot.connect(addrs[0]).delegate(addrs[1].address);

      const voter = await ballot.voters(addrs[1].address);

      expect(voter.weight).to.equal(1);
    });

    it("shouldn't allow user who already voted to delegate", async () => {
      await ballot.giveRightToVote(addrs[0].address);
      await ballot.connect(addrs[0]).vote(0);

      await expect(
        ballot.connect(addrs[0]).delegate(addrs[1].address)
      ).to.be.revertedWith("You already voted.");
    });

    it("shouldn't allow user to delegate themselves", async () => {
      await expect(
        ballot.connect(addrs[0]).delegate(addrs[0].address)
      ).to.be.revertedWith("Self-delegation is disallowed.");
    });

    it("shouldn't allow user to delegate in a loop", async () => {
      await ballot.connect(addrs[0]).delegate(addrs[1].address);
      await expect(
        ballot.connect(addrs[1]).delegate(addrs[0].address)
      ).to.be.revertedWith("Found loop in delegation.");
    });

    it("should weigh the vote in when the delegate votes", async () => {
      await ballot.giveRightToVote(addrs[0].address);
      await ballot.giveRightToVote(addrs[1].address);
      await ballot.connect(addrs[0]).delegate(addrs[1].address);
      await ballot.connect(addrs[1]).vote(0);

      const proposal = await ballot.proposals(0);
      expect(proposal.voteCount).to.equal(2);
    });

    it("should automatically vote if the delegate already voted", async () => {
      await ballot.giveRightToVote(addrs[0].address);
      await ballot.giveRightToVote(addrs[1].address);
      await ballot.connect(addrs[1]).vote(0);
      await ballot.connect(addrs[0]).delegate(addrs[1].address);

      const proposal = await ballot.proposals(0);
      expect(proposal.voteCount).to.equal(2);
    });
  });

  describe("vote count", () => {
    beforeEach(async () => {
      await ballot.giveRightToVote(addrs[0].address);
      await ballot.giveRightToVote(addrs[1].address);
      await ballot.giveRightToVote(addrs[2].address);

      await ballot.connect(addrs[0]).vote(0);
      await ballot.connect(addrs[1]).vote(2);
      await ballot.connect(addrs[2]).vote(2);
    });

    it("should return the winning proposal number", async () => {
      expect(await ballot.winningProposal()).to.equal(2);
    });

    it("should return the winning proposal name", async () => {
      expect(await ballot.winnerName()).to.equal(proposalBytes[2]);
    });
  });

  describe("bribing", () => {
    beforeEach(async () => {
      await ballot.giveRightToVote(addrs[1].address);
    });

    it("should record the bribe", async () => {
      const value = toWei(0.01);
      await ballot.connect(addrs[0]).bribe(addrs[1].address, 1, { value });
      const bribe = await ballot.bribes(addrs[1].address);

      expect(bribe.amount).to.equal(value);
      expect(bribe.proposal).to.equal(1);
    });

    it("should revert if the bribe amount is zero", async () => {
      await expect(
        ballot.connect(addrs[0]).bribe(addrs[1].address, 1, { value: 0 })
      ).to.be.revertedWith("can't bribe without money...");
    });

    it("should revert if the bribe amount is too high", async () => {
      await expect(
        ballot.connect(addrs[0]).bribe(addrs[1].address, 1, { value: toWei(1) })
      ).to.be.revertedWith("maximum bribe is 0.01 ETH");
    });

    it("should revert if the proposal number is invalid", async () => {
      await expect(
        ballot
          .connect(addrs[0])
          .bribe(addrs[1].address, 4, { value: toWei(0.01) })
      ).to.be.revertedWith("this proposal doesn't exist");
    });

    it("should revert if the bribee has no right to vote", async () => {
      await expect(
        ballot
          .connect(addrs[0])
          .bribe(addrs[2].address, 1, { value: toWei(0.005) })
      ).to.be.revertedWith("the bribee has no right to vote");
    });

    it("should revert if the bribee has already voted", async () => {
      await ballot.connect(addrs[1]).vote(0);

      await expect(
        ballot
          .connect(addrs[0])
          .bribe(addrs[1].address, 1, { value: toWei(0.005) })
      ).to.be.revertedWith("the bribee already voted");
    });

    it("should allocate bribe amount to voter after voting the desired proposal", async () => {
      const value = toWei(0.01);

      await ballot.connect(addrs[0]).bribe(addrs[1].address, 1, { value });
      await ballot.connect(addrs[1]).vote(1);

      expect(await ballot.pendingWithdrawals(addrs[1].address)).to.equal(value);
    });

    it("should emit an event to inform the briber that the proposal has been voted", async () => {
      const value = toWei(0.01);
      await ballot.connect(addrs[0]).bribe(addrs[1].address, 1, { value });

      expect(await ballot.connect(addrs[1]).vote(1))
        .to.emit(ballot, "BribeTaken")
        .withArgs(addrs[1].address, 1);
    });

    it("should emit an event to inform the voter that a withdrawal is available", async () => {
      const value = toWei(0.01);
      await ballot.connect(addrs[0]).bribe(addrs[1].address, 1, { value });

      expect(await ballot.connect(addrs[1]).vote(1))
        .to.emit(ballot, "WithdrawalAvailable")
        .withArgs(addrs[1].address, value);
    });
  });

  describe("withdrawal", () => {
    it("should transfer the correct amount to the bribee", async () => {
      const value = toWei(0.005);
      await ballot.giveRightToVote(addrs[0].address);
      await ballot.connect(addrs[1]).bribe(addrs[0].address, 0, { value });
      await ballot.connect(addrs[0]).vote(0);

      await expect(
        await ballot.connect(addrs[0]).withdraw()
      ).to.changeEtherBalance(addrs[0], value);
    });

    it("should revert if there is no pending withdrawal", async () => {
      await expect(ballot.connect(addrs[0]).withdraw()).to.be.revertedWith(
        "you don't have any pending withdrawals"
      );
    });
  });
});
