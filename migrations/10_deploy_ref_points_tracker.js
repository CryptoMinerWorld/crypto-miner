// Ref Points Tracker smart contract
const Tracker = artifacts.require("./RefPointsTracker");

// Ref Points Tracker smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy ref tracker] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy ref tracker] coverage network - skipping the migration script");
		return;
	}

	// deploy ref pints tracker
	await deployer.deploy(Tracker);
};
