// Token Helper smart contract
const Helper = artifacts.require("./TokenHelper");

// Dutch Auction Helper smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy token helper] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy token helper] coverage network - skipping the migration script");
		return;
	}

	// deploy Token Helper
	await deployer.deploy(Helper);
};
