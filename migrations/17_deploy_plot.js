// Token smart contract
const Token = artifacts.require("./PlotERC721");

// Token smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy plot] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy plot] coverage network - skipping the migration script");
		return;
	}

	// deploy token
	await deployer.deploy(Token);
};
