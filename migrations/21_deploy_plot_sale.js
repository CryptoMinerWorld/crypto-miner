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
	let refTrackerAddress = "0xD06d436763a3207a24A3EE393541f924d9b323fd";
	let countryAddress = "0xE49F05Fd6DEc46660221a1C1255FfE335bc7fa7a";
	let plotAddress = "";
	let worldChest = ""; // MainNet World Chest (MultiSig)
	let monthlyChest = ""; // MainNet Monthly Chest (MultiSig)
	let beneficiary = "0xe0123204873fD29A29aEf3f99FaF1b1c45fe3B1E"; // MainNet MultiSig
	let saleStartUTC = 1559844000; // 06/06/2019 @ 6:00pm UTC

	// for test networks dependencies are different
	if(network !== "mainnet") {
		refTrackerAddress = "0x1F85f59eC94725E75B8CfDe50da3e47Bf3605B13";
		countryAddress = "0x6AC79cbA4Cf4c07303d30410739b13Ee6914b619";
		plotAddress = "0xd2d1B1FE416E72aDddf6C70f1E16b3bfc90e510f";
		worldChest = "0x2281f7Dc57011dA1668eA9460BB40340dB89e29e"; // Basil [1]
		monthlyChest = "0x5446c218245a9440Ac3B03eda826260a9198C7a9"; // Basil [2]
		beneficiary = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";  // Basil
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

