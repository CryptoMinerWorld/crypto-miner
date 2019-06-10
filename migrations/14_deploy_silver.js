// Token smart contract
const Token = artifacts.require("./SilverERC20");

// Token smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy silver] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy silver] coverage network - skipping the migration script");
		return;
	}

	// deploy token
	await deployer.deploy(Token);
};
