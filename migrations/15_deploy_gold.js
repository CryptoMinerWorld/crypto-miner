// Token smart contract
const Token = artifacts.require("./GoldERC20");

// Token smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy gold] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy gold] coverage network - skipping the migration script");
		return;
	}

	// deploy token
	await deployer.deploy(Token);
};
