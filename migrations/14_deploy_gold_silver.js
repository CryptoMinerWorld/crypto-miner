const GoldERC20 = artifacts.require("./GoldERC20");
const SilverERC20 = artifacts.require("./SilverERC20");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy gold / silver] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy gold / silver] coverage network - skipping the migration script");
		return;
	}

	// deploy Gold token
	await deployer.deploy(GoldERC20);
	const gold = await GoldERC20.deployed();
	const goldAddress = gold.address;

	// deploy Silver token
	await deployer.deploy(SilverERC20);
	const silver = await SilverERC20.deployed();
	const silverAddress = silver.address;

	console.log("______________________________________________________");
	console.log("gold:       " + goldAddress);
	console.log("silver:     " + silverAddress);
};
