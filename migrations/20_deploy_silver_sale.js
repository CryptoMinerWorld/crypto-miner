// Silver and Gold tokens (ERC20)
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");

// Referral Point Tracker
const RefPointsTracker = artifacts.require("./RefPointsTracker");

// Silver/Gold Sale
const SilverSale = artifacts.require("./SilverSale");

// Features and Roles required to be enabled
const FEATURE_SALE_ENABLED = 0x00000001;
const FEATURE_GET_ENABLED = 0x00000002;
const ROLE_TOKEN_CREATOR = 0x00000001;
const ROLE_REF_POINTS_ISSUER = 0x00000001;
const ROLE_REF_POINTS_CONSUMER = 0x00000002;
const ROLE_SELLER = 0x00000004;

// main section of the script, blockchain interaction
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy silver sale] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy silver sale] coverage network - skipping the migration script");
		return;
	}

	// token dependency configuration
	const conf = network === "mainnet"?
		{ // Mainnet addresses
			chest:              "0xC352f692F55dEf49f0B736Ec1F7CA0F862eabD23", // MainNet Founder's Chest (MultiSig)
			beneficiary:        "0xe0123204873fD29A29aEf3f99FaF1b1c45fe3B1E", // MainNet MultiSig
			saleStartUTC:       1559844000, // 06/21/2019 @ 6:00pm UTC

		}:
		{ // Ropsten addresses
			RefPointsTracker:   "0xC97a91a4e1bfbf18a9038BAE649Fa92d0B242Cfb",
			SilverERC20:        "0x7EDC3fea733E790814e3c2A9D997A55f531D8868",
			GoldERC20:          "0x41FecF81B49B9Bc3eC80EdDdffe266922Ff2BD1f",
			chest:              "0xC352f692F55dEf49f0B736Ec1F7CA0F862eabD23",
			beneficiary:        "0xe0123204873fD29A29aEf3f99FaF1b1c45fe3B1E",
			saleStartUTC:       1559844000, // 06/21/2019 @ 6:00pm UTC
		};


	// deploy silver sale
	await deployer.deploy(
		SilverSale,
		conf.RefPointsTracker,
		conf.SilverERC20,
		conf.GoldERC20,
		conf.chest,
		conf.beneficiary,
		conf.saleStartUTC
	);
	const sale = await SilverSale.deployed();

	// for test networks set all the permissions automatically
	if(network !== "mainnet") {
		// get links to deployed instances
		const instances = {
			RefPointsTracker: await RefPointsTracker.at(conf.RefPointsTracker),
			SilverERC20: await SilverERC20.at(conf.SilverERC20),
			GoldERC20: await GoldERC20.at(conf.GoldERC20),
		};

		// enable all features and permissions required to enable buy with referral points
		console.log("updating ref points tracker access");
		await instances.RefPointsTracker.updateRole(sale.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);
		console.log("updating silver access");
		await instances.SilverERC20.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		console.log("updating gold access");
		await instances.GoldERC20.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		console.log("enabling sale features");
		await sale.updateFeatures(FEATURE_SALE_ENABLED | FEATURE_GET_ENABLED);
	}

	console.log("execution complete");
};
