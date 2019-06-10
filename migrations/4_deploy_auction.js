// Dutch Auction smart contract
const Auction = artifacts.require("./DutchAuction");

// features and roles
const FEATURE_ADD = 0x00000001;
const FEATURE_BUY = 0x00000002;

// common external addresses
const JOHN_ADDR = "0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6";
const ROMAN_ADDR = "0xEE169DCC689D0C358F68Ce95DEf41646039aC190";
const BASIL_ADDR = "0x5F185Da55f7BBD9217E3b3CeE06b180721FA6d34";

// Dutch Auction smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy auction] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy auction] coverage network - skipping the migration script");
		return;
	}

	// deploy DutchAuction
	await deployer.deploy(Auction);

	// for test networks enable all the features automatically
	if(network !== "mainnet") {
		const auction = await Auction.deployed();
		await auction.updateFeatures(FEATURE_ADD | FEATURE_BUY);

		// update tax rate and beneficiary
		await auction.setFeeAndBeneficiary(1, 20, BASIL_ADDR, ROMAN_ADDR);
	}
};
