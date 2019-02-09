// Dutch Auction Helper
const Helper = artifacts.require("./DutchAuctionHelper");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy auction helper] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy auction helper] coverage network - skipping the migration script");
		return;
	}


	// deploy auction helper sale
	await deployer.deploy(Helper);

	// get deployed instance
	const helper = await Helper.deployed();

	// deployment successful, print helper address
	console.log("________________________________________________________________________");
	console.log("auction helper: " + helper.address);
};
