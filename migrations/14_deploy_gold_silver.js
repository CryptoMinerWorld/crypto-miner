// Enables ERC20 transfers of the tokens
const FEATURE_TRANSFERS = 0x00000001;

// Enables ERC20 transfers on behalf
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

// Silver/Gold tokens
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy gold / silver] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy gold / silver] coverage network - skipping the migration script");
		return;
	}

	// deploy Silver token
	await deployer.deploy(SilverERC20);
	const silver = await SilverERC20.deployed();
	const silverAddress = silver.address;

	// deploy Gold token
	await deployer.deploy(GoldERC20);
	const gold = await GoldERC20.deployed();
	const goldAddress = gold.address;

	// for test network:
	if(network !== "mainnet") {
		// enable transfers and transfers on behalf
		await silver.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await gold.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// transfer some test amounts of gold and silver to test addresses
		await silver.mint("0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", 5500);
		await gold.mint("0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", 500); // John
		await silver.mint("0xEE169DCC689D0C358F68Ce95DEf41646039aC190", 5500);
		await gold.mint("0xEE169DCC689D0C358F68Ce95DEf41646039aC190", 500); // Roman
		await silver.mint("0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69", 5500);
		await gold.mint("0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69", 500); // Basil
	}

	// total supply values (for mainnet should be zero)
	const silverSupply = await silver.totalSupply();
	const goldSupply = await gold.totalSupply();

	console.log("________________________________________________________________________");
	console.log("silver:        " + silverAddress);
	console.log("gold:          " + goldAddress);
	console.log("silver supply: " + silverSupply.toString(10));
	console.log("gold supply:   " + goldSupply.toString(10));
};
