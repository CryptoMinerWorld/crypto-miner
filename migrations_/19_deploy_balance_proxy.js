// BalanceProxy smart contract
const BalanceProxy = artifacts.require("./BalanceProxy");

// BalanceProxy smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy BalanceProxy] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy BalanceProxy] coverage network - skipping the migration script");
		return;
	}

	// deploy BalanceProxy
	await deployer.deploy(BalanceProxy);
};
