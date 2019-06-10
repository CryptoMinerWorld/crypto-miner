// Token smart contract
const Token = artifacts.require("./ArtifactERC20");

// Token smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy artifact] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy artifact] coverage network - skipping the migration script");
		return;
	}

	// deploy token
	await deployer.deploy(Token);
};
