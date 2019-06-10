// Land Plot ERC721 Token
const Plot = artifacts.require("./PlotERC721");
// Referral Point Tracker
const Ref = artifacts.require("./RefPointsTracker");

// Plot Sale
const PlotSale = artifacts.require("./PlotSale");

// Features and Roles required to be enabled
const FEATURE_SALE_ENABLED = 0x00000001;
const ROLE_TOKEN_CREATOR = 0x00000001;
const ROLE_REF_POINTS_ISSUER = 0x00000001;
const ROLE_SELLER = 0x00000004;

// main section of the script, blockchain interaction
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy plot sale] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy plot sale] coverage network - skipping the migration script");
		return;
	}

	// dependencies: smart contract addresses, external addresses, sale offset
	let refTrackerAddress = "";
	let countryAddress = "";
	let plotAddress = "";
	let worldChest = ""; // MainNet World Chest (MultiSig)
	let monthlyChest = ""; // MainNet Monthly Chest (MultiSig)
	let beneficiary = "0xe0123204873fD29A29aEf3f99FaF1b1c45fe3B1E"; // MainNet MultiSig
	let saleStartUTC = 1559844000; // 06/21/2019 @ 6:00pm UTC

	// for test networks dependencies are different
	if(network !== "mainnet") {
		refTrackerAddress = "0x33e0BD722e9e357bAa7BEF0F0192F7ad889BaD8f";
		countryAddress = "0xf23197d25Ca59e4554Ef7BBcF579971A14882601";
		plotAddress = "0x4ED45BeC5762aB8b191Dd978db5609a53F21576f";
		worldChest = "0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6"; // John
		monthlyChest = "0xEE169DCC689D0C358F68Ce95DEf41646039aC190"; // Roman
		beneficiary = "0x5F185Da55f7BBD9217E3b3CeE06b180721FA6d34";  // Basil
		saleStartUTC = -60 + new Date().getTime() / 1000 | 0; // already started 1 minute ago
	}

	// deploy plot sale
	await deployer.deploy(
		PlotSale,
		refTrackerAddress,
		countryAddress,
		plotAddress,
		worldChest,
		monthlyChest,
		beneficiary,
		saleStartUTC
	);
	const sale = await PlotSale.deployed();

	// for test networks set all the permissions automatically
	if(network !== "mainnet") {
		// get links to all the deployed instances
		const ref = Ref.at(refTrackerAddress);
		const plot = Plot.at(plotAddress);

		// enable all features and permissions required to enable buy with referral points
		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await plot.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_REF_POINTS_ISSUER | ROLE_SELLER);
	}

	// deployment successful, print all relevant info to the log
	console.log("________________________________________________________________________");
	console.log("ref tracker:   %s", refTrackerAddress);
	console.log("country:       %s", countryAddress);
	console.log("plot:          %s", plotAddress);
	console.log("world chest:   %s", worldChest);
	console.log("monthly chest: %s", monthlyChest);
	console.log("beneficiary:   %s", beneficiary);
	console.log("sale start:    %s (%d)", new Date(saleStartUTC * 1000), saleStartUTC);
	console.log("plot sale:     %s", sale.address);

};

