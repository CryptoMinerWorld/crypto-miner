// Plot Sale dependencies
const RefPointsTracker = artifacts.require("./RefPointsTracker");
const CountryERC721 = artifacts.require("./CountryERC721");
const PlotERC721 = artifacts.require("./PlotERC721");

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


	// deployed instances' addresses and external addresses
	const conf = network === "mainnet"?
		{ // Mainnet addresses
			beneficiary:        "0xe0123204873fD29A29aEf3f99FaF1b1c45fe3B1E", // MainNet MultiSig
			saleStartUTC:       1559844000, // 06/21/2019 @ 6:00pm UTC
		}:
		{ // Ropsten Addresses
			RefPointsTracker:   "0xC97a91a4e1bfbf18a9038BAE649Fa92d0B242Cfb",
			CountryERC721:      "0x7825f2bd389B8962F0578804D7B1c3FC03cF14f1",
			PlotERC721:         "0x1C3634f7345fd3f3884C5D6FF1F96E16A69b40Ea",
			worldChest:         "0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", // John
			monthlyChest:       "0xEE169DCC689D0C358F68Ce95DEf41646039aC190", // Roman
			beneficiary:        "0x5F185Da55f7BBD9217E3b3CeE06b180721FA6d34", // Basil
			saleStartUTC:       -60 + new Date().getTime() / 1000 | 0,
		};

	// deploy plot sale
	await deployer.deploy(
		PlotSale,
		conf.RefPointsTracker,
		conf.CountryERC721,
		conf.PlotERC721,
		conf.worldChest,
		conf.monthlyChest,
		conf.beneficiary,
		conf.saleStartUTC
	);
	const sale = await PlotSale.deployed();

	// for test networks set all the permissions automatically
	if(network !== "mainnet") {
		// get links to deployed instances
		const instances = {
			RefPointsTracker: await RefPointsTracker.at(conf.RefPointsTracker),
			PlotERC721: await PlotERC721.at(conf.PlotERC721),
		};

		// enable all features and permissions required to enable buy with referral points
		console.log("updating ref points tracker access");
		await instances.RefPointsTracker.updateRole(sale.address, ROLE_REF_POINTS_ISSUER | ROLE_SELLER);
		console.log("updating plot access");
		await instances.PlotERC721.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		console.log("updating sale features");
		await sale.updateFeatures(FEATURE_SALE_ENABLED);

		console.log("execution complete");
	}

};

