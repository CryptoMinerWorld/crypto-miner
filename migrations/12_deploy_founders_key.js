// Token smart contract
const Token = artifacts.require("./FoundersKeyERC20");

// Token smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy founders key] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy founders key] coverage network - skipping the migration script");
		return;
	}

	// deploy token
	await deployer.deploy(Token);
};
