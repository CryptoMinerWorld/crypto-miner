// TokenReader smart contract
const TokenReader = artifacts.require("./TokenReader");

// TokenReader smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy token reader] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy token reader] coverage network - skipping the migration script");
		return;
	}

	// deploy token reader
	await deployer.deploy(TokenReader);
};
