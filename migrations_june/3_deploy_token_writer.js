// TokenWriter smart contract
const TokenWriter = artifacts.require("./TokenWriter");

// TokenReader smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy token writer] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy token writer] coverage network - skipping the migration script");
		return;
	}

	// deploy token writer
	await deployer.deploy(TokenWriter);
};
