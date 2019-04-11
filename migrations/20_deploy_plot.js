// Land Plot ERC721 Token
const Plot = artifacts.require("./PlotERC721");

// Features and Roles:
// Enables ERC721 transfers of the tokens (token owner performs a transfer)
const FEATURE_TRANSFERS = 0x00000001;
// Enables ERC721 transfers on behalf (approved operator performs a transfer)
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy plot] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy plot] coverage network - skipping the migration script");
		return;
	}

	// deploy PlotERC721 smart contract
	await deployer.deploy(Plot);
	const plot = await Plot.deployed();
	const plotAddress = plot.address;

	// for test network:
	if(network !== "mainnet") {
		// enable transfers and transfers on behalf
		await plot.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// mint some plots
		for(let i = 0; i < 10; i++) {
			await plot.mint("0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", 3 * i + 1, genTiers0()); // John
			await plot.mint("0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", 3 * i + 16777217, genTiers1());
			await plot.mint("0xEE169DCC689D0C358F68Ce95DEf41646039aC190", 3 * i + 2, genTiers0()); // Roman
			await plot.mint("0xEE169DCC689D0C358F68Ce95DEf41646039aC190", 3 * i + 16777218, genTiers1());
			await plot.mint("0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69", 3 * i + 3, genTiers0()); // Basil
			await plot.mint("0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69", 3 * i + 16777219, genTiers1());
		}
	}

	console.log("________________________________________________________________________");
	console.log("plot:   " + plotAddress);
	console.log("supply: " + await plot.totalSupply());

};

// default depth of the land plot
const DEPTH = 100;

function genTiers0() {
	const layers0 = [
		2,
		0,
		35 + (Math.floor(Math.random() * 11) - 5),
		DEPTH,
		DEPTH,
		DEPTH,
		DEPTH,
		0
	];
	// console.log(layers0);
	return tiers(layers0);
}

function genTiers1() {
	const layers1 = [
		5,
		0,
		35 + (Math.floor(Math.random() * 11) - 5),
		65 + (Math.floor(Math.random() * 11) - 5),
		85 + (Math.floor(Math.random() * 9) - 4),
		95 + (Math.floor(Math.random() * 7) - 3),
		DEPTH,
		0
	];
	// console.log(layers1);
	return tiers(layers1);
}

// function to build tiers packed structure from tiers array
function tiers(layers) {
	// pack layers array into tiers structure
	let result = web3.toBigNumber(0);
	for(let i = 0; i < layers.length; i++) {
		result = result.times(256).plus(layers[i]);
	}

	return result;
}
