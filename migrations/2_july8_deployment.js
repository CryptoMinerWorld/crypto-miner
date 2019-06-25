// This script is designed to be re-runnable,
// it automatically determines the point where it stopped execution
// last time it was executed and continues from this place

// List of smart contract to deploy or use (ABI)
const BalanceProxy = artifacts.require("./BalanceProxy");
const TokenHelper = artifacts.require("./TokenHelper");
const TokenReader = artifacts.require("./TokenReader");
const TokenWriter = artifacts.require("./TokenWriter");
const DutchAuction = artifacts.require("./DutchAuction");
const RefPointsTracker = artifacts.require("./RefPointsTracker");
const ArtifactERC20 = artifacts.require("./ArtifactERC20");
const FoundersKeyERC20 = artifacts.require("./FoundersKeyERC20");
const ChestKeyERC20 = artifacts.require("./ChestKeyERC20");
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");
const CountryERC721 = artifacts.require("./CountryERC721");
const PlotERC721 = artifacts.require("./PlotERC721");
const GemERC721 = artifacts.require("./GemERC721");
const Workshop = artifacts.require("./Workshop");
const Miner = artifacts.require("./Miner");
const PlotSale = artifacts.require("./PlotSale");
const FoundersPlots = artifacts.require("./FoundersPlotsMock");
const PlotAntarctica = artifacts.require("./PlotAntarctica");
const SilverSale = artifacts.require("./SilverSale");


// features and roles required
const FEATURE_ANTARCTICA_GET_ENABLED = 0x00000001;
const FEATURE_SALE_ENABLED = 0x00000001;
const FEATURE_GET_ENABLED = 0x00000002;
const FEATURE_USING_COUPONS_ENABLED = 0x00000004;
const FEATURE_MINING_ENABLED = 0x00000001;
const FEATURE_UPGRADES_ENABLED = 0x00000001;
const FEATURE_ADD = 0x00000001;
const FEATURE_BUY = 0x00000002;
const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
const ROLE_TOKEN_CREATOR = 0x00000001;
const ROLE_TOKEN_DESTROYER = 0x00000002;
const ROLE_EXT_WRITER = 0x00000004;
const ROLE_STATE_PROVIDER = 0x00000010;
const ROLE_TRANSFER_LOCK_PROVIDER = 0x00000020;
const ROLE_LEVEL_PROVIDER = 0x00000040;
const ROLE_GRADE_PROVIDER = 0x00000080;
const ROLE_AGE_PROVIDER = 0x00000100;
const ROLE_MINED_STATS_PROVIDER = 0x00000200;
const ROLE_NEXT_ID_PROVIDER = 0x00001000;
const ROLE_OFFSET_PROVIDER = 0x00000040;
const ROLE_REF_POINTS_ISSUER = 0x00000001;
const ROLE_REF_POINTS_CONSUMER = 0x00000002;
const ROLE_SELLER = 0x00000004;


// using secure random generator instead of default Math.random()
const secureRandomInRange = require("random-number-csprng");
// using file system to create raw csv data file
const fs = require('fs');

// Dutch Auction Helper smart contract deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[July 8 deployment] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[July 8 deployment] coverage network - skipping the migration script");
		return;
	}

	// deployed smart contract addresses configuration defines which
	// smart contracts require deployment and which are already deployed
	// empty address means smart contract requires deployment

	// a collection of all known addresses (smart contracts and external)
	const conf = ((network) => {
		switch(network) {
			// Mainnet Configuration
			case "mainnet": return {
				Beneficiary:        "0xe0123204873fD29A29aEf3f99FaF1b1c45fe3B1E", // Mainnet MSIG
				FoundersChest:      "0xC352f692F55dEf49f0B736Ec1F7CA0F862eabD23", // Mainnet MSIG
				WorldChest:         "0xc16c6f45FBA73fBC18e29EaB26732d1621A448c3", // Mainnet MSIG
				MonthlyChest:       "0x2906DA90D3f99D5913bB3461183682951ca7280c", // Mainnet MSIG

				FoundersPlots:      "0xE0A21044eEeB9efC340809E35DC0E9d82Dc87DD1",
				BalanceProxy:       "0xbd7Ca763E12d23535B59949ade53c104BD88d42F",
				TokenReader:        "0x29a9996Dc4863b5918E6132F644d7c19279fdDd5",

				PlotSaleStartUTC:   1562608800, // 07/08/2019 @ 6:00pm UTC
				SilverSaleStartUTC: 1550772000, // 02/21/2019 @ 6:00pm UTC

				optionalPhases: {
					writePlotSaleCoupons: false,
					writeSilverSaleCoupons: false,
					migration: {
						SilverERC20: false,
						GoldERC20: false,
						RefPointsTracker: false,
						CountryERC721: false,
						GemERC721: false,
					},
					enablePermissions: false,
					disablePermissions: false,
				},
			};
			// Ropsten Configuration
			case "ropsten": return {
				Beneficiary:        "0x5F185Da55f7BBD9217E3b3CeE06b180721FA6d34", // Basil
				FoundersChest:      "0xEE169DCC689D0C358F68Ce95DEf41646039aC190", // Roman
				WorldChest:         "0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", // John
				MonthlyChest:       "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69", // test public account

				FoundersPlots:      "0xeD6E75F271E4Cd58b800a17240228F0C19C12550",
				BalanceProxy:       "0xc90b90B764e0061C5e355d5101146580d17fBc9D",
				TokenHelper:        "0x040d04f1515BC4aF48CB3346Bb7fA5f2eD1d5Ea9",
				TokenReader:        "0xA66e81eAa45F98D913CdAEc8FBE5c746769f58c7",
				TokenWriter:        "0x205b3c69C9Bbd5E0F65249a9785F36aF28ac9aAa",

				DutchAuction:       "0x18D916BBDaABFd63384Bb8C4EAdFcd98b53B78eF",

				RefPointsTracker:   "0xF703407ADbFFC0d7f7Fe413eE86Cc82c9f51Df06",
				ArtifactERC20:      "0xa14F80E7F7333122B634Fea9EA5990C53100fDa0",
				FoundersKeyERC20:   "0x9bBEE0dA678FcDdf30b4D7e8434FeC3D45b4694F",
				ChestKeyERC20:      "0x00D14DFB6a5A0a240700C563A732e71cDD2FF455",
				SilverERC20:        "0xB373E86e650236CAf952F6cdE206dfe196FeEC35",
				GoldERC20:          "0xbE713aC93fF6d7e0dA88e024DC9Cf0d5D05c3A5A",
				CountryERC721:      "0xdccf4653fc2F90e6fC0B151E0b9B7CFE4eF63402",
				PlotERC721:         "0x33369f4870703489CE21B8BeF92ADa5820b5ffED",
				GemERC721:          "0x8ad156dA5ea1053D4858987Ca1165151B5702479",

				Workshop:           "0x4412d4448AFe1c91B35d08d053c67e9C9914D622",
				Miner:              "0x9Fcfa8dA04D8Ed637f98a331b892769a38f00c2F",

				PlotSale:           "0x97BC3d0248035cD16C972E73f7C62B7Bc85B6bb5",
				PlotAntarctica:     "0xEc0510Cca7dA23f0aEcA3c0CCc9012B505435D04",

				SilverSale:         "0x7e48d4102de1Bd47aA456AAE21D899bd898B6954",

				PlotSaleStartUTC:   15 + new Date().getTime() / 1000 | 0, // in 15 minutes
				SilverSaleStartUTC: 1550772000, // 02/21/2019 @ 6:00pm UTC

				optionalPhases: {
					writePlotSaleCoupons: true,
					writeSilverSaleCoupons: true,
					migration: {
						SilverERC20: true,
						GoldERC20: true,
						RefPointsTracker: true,
						CountryERC721: true,
						GemERC721: true,
					},
					writeTestTokens: true,
					enablePermissions: true,
					disablePermissions: false,
				},
			};
			// Rinkeby Configuration
			case "rinkeby": return {
				Beneficiary:        "0x5F185Da55f7BBD9217E3b3CeE06b180721FA6d34", // Basil
				FoundersChest:      "0xEE169DCC689D0C358F68Ce95DEf41646039aC190", // Roman
				WorldChest:         "0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", // John
				MonthlyChest:       "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69", // test public account

				PlotSaleStartUTC:   15 + new Date().getTime() / 1000 | 0, // in 15 minutes
				SilverSaleStartUTC: 1550772000, // 02/21/2019 @ 6:00pm UTC

				optionalPhases: {
					writePlotSaleCoupons: true,
					writeSilverSaleCoupons: true,
					migration: {
						SilverERC20: true,
						GoldERC20: true,
						RefPointsTracker: true,
						CountryERC721: true,
						GemERC721: true,
					},
					writeTestTokens: true,
					enablePermissions: true,
					disablePermissions: false,
				},
			};
			default: throw "unknown network " + network;
		}
	})(network);

	// an object to contain all ABI linked instances to the addresses above
	const instances = {};

	// execute mandatory phase to make sure the deployment is complete
	await deployInstances(deployer, conf, instances);

	// execute optional phases required one by one
	if(conf.optionalPhases.writeSilverSaleCoupons) {
		await writeSilverSaleCoupons(network, instances);
	}
	if(conf.optionalPhases.migration) {
		if(conf.optionalPhases.migration.SilverERC20) {
			await migrateSilverERC20(instances);
		}
		if(conf.optionalPhases.migration.GoldERC20) {
			await migrateGoldERC20(instances);
		}
		if(conf.optionalPhases.migration.RefPointsTracker) {
			await migrateRefPointsTracker(instances);
		}
		if(conf.optionalPhases.migration.CountryERC721) {
			await migrateCountryERC721(instances);
		}
		if(conf.optionalPhases.migration.GemERC721) {
			await migrateGemERC721(instances);
		}
	}
	if(conf.optionalPhases.enablePermissions) {
		await enablePermissions(conf, instances);
	}
};

async function deployInstances(deployer, conf, instances) {
	let deployedInstancesCounter = 0;

	// deploy all missing instances first, healing the missing parts of the config
	console.log("mandatory phase: config healing (deploy missing instances)");

	// BalanceProxy binding/deployment
	if(conf.BalanceProxy) {
		console.log("binding BalanceProxy to " + conf.BalanceProxy);
		instances.BalanceProxy = await BalanceProxy.at(conf.BalanceProxy);
	}
	else {
		console.log("deploying BalanceProxy");
		await deployer.deploy(BalanceProxy);
		instances.BalanceProxy = await BalanceProxy.deployed();
		conf.BalanceProxy = instances.BalanceProxy.address;
		deployedInstancesCounter++;
	}

	// TokenHelper binding/deployment
	if(conf.TokenHelper) {
		console.log("binding TokenHelper to " + conf.TokenHelper);
		instances.TokenHelper = await TokenHelper.at(conf.TokenHelper);
	}
	else {
		console.log("deploying TokenHelper");
		await deployer.deploy(TokenHelper);
		instances.TokenHelper = await TokenHelper.deployed();
		conf.TokenHelper = instances.TokenHelper.address;
		deployedInstancesCounter++;
	}

	// TokenReader binding/deployment
	if(conf.TokenReader) {
		console.log("binding TokenReader to " + conf.TokenReader);
		instances.TokenReader = await TokenReader.at(conf.TokenReader);
	}
	else {
		console.log("deploying TokenReader");
		await deployer.deploy(TokenReader);
		instances.TokenReader = await TokenReader.deployed();
		conf.TokenReader = instances.TokenReader.address;
		deployedInstancesCounter++;
	}

	// TokenWriter binding/deployment
	if(conf.TokenWriter) {
		console.log("binding TokenWriter to " + conf.TokenWriter);
		instances.TokenWriter = await TokenWriter.at(conf.TokenWriter);
	}
	else {
		console.log("deploying TokenWriter");
		await deployer.deploy(TokenWriter);
		instances.TokenWriter = await TokenWriter.deployed();
		conf.TokenWriter = instances.TokenWriter.address;
		deployedInstancesCounter++;
	}

	// DutchAuction binding/deployment
	if(conf.DutchAuction) {
		console.log("binding DutchAuction to " + conf.DutchAuction);
		instances.DutchAuction = await DutchAuction.at(conf.DutchAuction);
	}
	else {
		console.log("deploying DutchAuction");
		await deployer.deploy(DutchAuction);
		instances.DutchAuction = await DutchAuction.deployed();
		conf.DutchAuction = instances.DutchAuction.address;
		deployedInstancesCounter++;
	}

	// RefPointsTracker binding/deployment
	if(conf.RefPointsTracker) {
		console.log("binding RefPointsTracker to " + conf.RefPointsTracker);
		instances.RefPointsTracker = await RefPointsTracker.at(conf.RefPointsTracker);
	}
	else {
		console.log("deploying RefPointsTracker");
		await deployer.deploy(RefPointsTracker);
		instances.RefPointsTracker = await RefPointsTracker.deployed();
		conf.RefPointsTracker = instances.RefPointsTracker.address;
		deployedInstancesCounter++;
	}

	// ArtifactERC20 binding/deployment
	if(conf.ArtifactERC20) {
		console.log("binding ArtifactERC20 to " + conf.ArtifactERC20);
		instances.ArtifactERC20 = await ArtifactERC20.at(conf.ArtifactERC20);
	}
	else {
		console.log("deploying ArtifactERC20");
		await deployer.deploy(ArtifactERC20);
		instances.ArtifactERC20 = await ArtifactERC20.deployed();
		conf.ArtifactERC20 = instances.ArtifactERC20.address;
		deployedInstancesCounter++;
	}

	// FoundersKeyERC20 binding/deployment
	if(conf.FoundersKeyERC20) {
		console.log("binding FoundersKeyERC20 to " + conf.FoundersKeyERC20);
		instances.FoundersKeyERC20 = await FoundersKeyERC20.at(conf.FoundersKeyERC20);
	}
	else {
		console.log("deploying FoundersKeyERC20");
		await deployer.deploy(FoundersKeyERC20);
		instances.FoundersKeyERC20 = await FoundersKeyERC20.deployed();
		conf.FoundersKeyERC20 = instances.FoundersKeyERC20.address;
		deployedInstancesCounter++;
	}

	// ChestKeyERC20 binding/deployment
	if(conf.ChestKeyERC20) {
		console.log("binding ChestKeyERC20 to " + conf.ChestKeyERC20);
		instances.ChestKeyERC20 = await ChestKeyERC20.at(conf.ChestKeyERC20);
	}
	else {
		console.log("deploying ChestKeyERC20");
		await deployer.deploy(ChestKeyERC20);
		instances.ChestKeyERC20 = await ChestKeyERC20.deployed();
		conf.ChestKeyERC20 = instances.ChestKeyERC20.address;
		deployedInstancesCounter++;
	}

	// SilverERC20 binding/deployment
	if(conf.SilverERC20) {
		console.log("binding SilverERC20 to " + conf.SilverERC20);
		instances.SilverERC20 = await SilverERC20.at(conf.SilverERC20);
	}
	else {
		console.log("deploying SilverERC20");
		await deployer.deploy(SilverERC20);
		instances.SilverERC20 = await SilverERC20.deployed();
		conf.SilverERC20 = instances.SilverERC20.address;
		deployedInstancesCounter++;
	}

	// GoldERC20 binding/deployment
	if(conf.GoldERC20) {
		console.log("binding GoldERC20 to " + conf.GoldERC20);
		instances.GoldERC20 = await GoldERC20.at(conf.GoldERC20);
	}
	else {
		console.log("deploying GoldERC20");
		await deployer.deploy(GoldERC20);
		instances.GoldERC20 = await GoldERC20.deployed();
		conf.GoldERC20 = instances.GoldERC20.address;
		deployedInstancesCounter++;
	}

	// CountryERC721 binding/deployment
	if(conf.CountryERC721) {
		console.log("binding CountryERC721 to " + conf.CountryERC721);
		instances.CountryERC721 = await CountryERC721.at(conf.CountryERC721);
	}
	else {
		console.log("deploying CountryERC721");
		await deployer.deploy(CountryERC721, COUNTRY_DATA);
		instances.CountryERC721 = await CountryERC721.deployed();
		conf.CountryERC721 = instances.CountryERC721.address;
		deployedInstancesCounter++;
	}

	// PlotERC721 binding/deployment
	if(conf.PlotERC721) {
		console.log("binding PlotERC721 to " + conf.PlotERC721);
		instances.PlotERC721 = await PlotERC721.at(conf.PlotERC721);
	}
	else {
		console.log("deploying PlotERC721");
		await deployer.deploy(PlotERC721);
		instances.PlotERC721 = await PlotERC721.deployed();
		conf.PlotERC721 = instances.PlotERC721.address;
		deployedInstancesCounter++;
	}

	// GemERC721 binding/deployment
	if(conf.GemERC721) {
		console.log("binding GemERC721 to " + conf.GemERC721);
		instances.GemERC721 = await GemERC721.at(conf.GemERC721);
	}
	else {
		console.log("deploying GemERC721");
		await deployer.deploy(GemERC721);
		instances.GemERC721 = await GemERC721.deployed();
		conf.GemERC721 = instances.GemERC721.address;
		deployedInstancesCounter++;
	}

	// Workshop binding/deployment
	if(conf.Workshop) {
		console.log("binding Workshop to " + conf.Workshop);
		instances.Workshop = await Workshop.at(conf.Workshop);
	}
	else {
		console.log("deploying Workshop");
		await deployer.deploy(Workshop, conf.GemERC721, conf.SilverERC20, conf.GoldERC20);
		instances.Workshop = await Workshop.deployed();
		conf.Workshop = instances.Workshop.address;
		deployedInstancesCounter++;
	}

	// Miner binding/deployment
	if(conf.Miner) {
		console.log("binding Miner to " + conf.Miner);
		instances.Miner = await Miner.at(conf.Miner);
	}
	else {
		console.log("deploying Miner");
		await deployer.deploy(
			Miner,
			conf.GemERC721,
			conf.PlotERC721,
			conf.GemERC721, // TODO: ArtifactERC721
			conf.SilverERC20,
			conf.GoldERC20,
			conf.ArtifactERC20,
			conf.FoundersKeyERC20,
			conf.ChestKeyERC20,
		);
		instances.Miner = await Miner.deployed();
		conf.Miner = instances.Miner.address;
		deployedInstancesCounter++;
	}

	// PlotSale binding/deployment
	if(conf.PlotSale) {
		console.log("binding PlotSale to " + conf.PlotSale);
		instances.PlotSale = await PlotSale.at(conf.PlotSale);
	}
	else {
		console.log("deploying PlotSale");
		await deployer.deploy(
			PlotSale,
			conf.RefPointsTracker,
			conf.CountryERC721,
			conf.PlotERC721,
			conf.WorldChest,
			conf.MonthlyChest,
			conf.Beneficiary,
			conf.PlotSaleStartUTC,
		);
		instances.PlotSale = await PlotSale.deployed();
		conf.PlotSale = instances.PlotSale.address;
		deployedInstancesCounter++;
	}

	// FoundersPlots binding/deployment
	if(conf.FoundersPlots) {
		console.log("binding FoundersPlots to " + conf.FoundersPlots);
		instances.FoundersPlots = await FoundersPlots.at(conf.FoundersPlots);
	}
	else {
		console.log("deploying FoundersPlotsMock to be used as FoundersPlots");
		await deployer.deploy(FoundersPlots);
		instances.FoundersPlots = await FoundersPlots.deployed();
		conf.FoundersPlots = instances.FoundersPlots.address;
		deployedInstancesCounter++;
	}

	// PlotAntarctica binding/deployment
	if(conf.PlotAntarctica) {
		console.log("binding PlotAntarctica to " + conf.PlotAntarctica);
		instances.PlotAntarctica = await PlotAntarctica.at(conf.PlotAntarctica);
	}
	else {
		console.log("deploying PlotAntarctica");
		await deployer.deploy(PlotAntarctica, conf.FoundersPlots, conf.PlotERC721);
		instances.PlotAntarctica = await PlotAntarctica.deployed();
		conf.PlotAntarctica = instances.PlotAntarctica.address;
		deployedInstancesCounter++;
	}

	// SilverSale binding/deployment
	if(conf.SilverSale) {
		console.log("binding SilverSale to " + conf.SilverSale);
		instances.SilverSale = await SilverSale.at(conf.SilverSale);
	}
	else {
		console.log("deploying SilverSale");
		await deployer.deploy(
			SilverSale,
			conf.RefPointsTracker,
			conf.SilverERC20,
			conf.GoldERC20,
			conf.FoundersChest,
			conf.Beneficiary,
			conf.SilverSaleStartUTC,
		);
		instances.SilverSale = await SilverSale.deployed();
		conf.SilverSale = instances.SilverSale.address;
		deployedInstancesCounter++;
	}

	console.log("mandatory phase complete, " + deployedInstancesCounter + " config records healed / instances deployed");

	// output healed config if any new instances were deployed
	if(deployedInstancesCounter > 0) {
		console.log("healed config: %o", conf);
	}
}


async function writeSilverSaleCoupons(network, instances) {
	console.log("optional phase: write silver sale coupons");

	// redefine instances sale link
	const sale = instances.SilverSale;

	// generate a secure random coupon code for box type `i`
	async function generateCouponCode(boxType) {
		let couponCode = "";
		for(let j = 0; j < 16; j++) {
			couponCode += String.fromCharCode(await secureRandomInRange(65, 90));
		}
		couponCode += "_" + boxType;
		return couponCode;
	}

	// generate `n` Silver Box coupons of type `boxType`
	async function generateNCouponsOfType(n, boxType) {
		const codes = [];
		const keys = [];
		for(let i = 0; i < n; i++) {
			const code = await generateCouponCode(boxType);
			// TODO: use keccak256(string) from shared_functions.js
			const key = web3.utils.soliditySha3(web3.eth.abi.encodeParameter("string", code));
			codes.push(code);
			keys.push(key);
		}
		return {codes: codes, keys: keys};
	}

	// generate keys for the codes specified
	function loadCoupons(codes) {
		const keys = new Array(codes.length);
		for(let i = 0; i < codes.length; i++) {
			// TODO: use keccak256(string) from shared_functions.js
			keys[i] = web3.utils.soliditySha3(web3.eth.abi.encodeParameter("string", codes[i]));
		}
		return {codes: codes, keys: keys};
	}

	const csv_header = "coupon_code";

	// file names to load/save coupon codes
	const path0 = `./data/silver_codes0_${network}.csv`;
	const path1 = `./data/silver_codes1_${network}.csv`;
	const path2 = `./data/silver_codes2_${network}.csv`;

	// load/generate 30 Silver Box coupons
	const coupons0 = fs.existsSync(path0)? loadCoupons(read_csv(path0, csv_header).split("\n")): await generateNCouponsOfType(30, 0);
	// load/generate 20 Rotund Silver Box coupons
	const coupons1 = fs.existsSync(path1)? loadCoupons(read_csv(path1, csv_header).split("\n")): await generateNCouponsOfType(20, 1);
	// load/generate 10 Goldish Silver Box coupons
	const coupons2 = fs.existsSync(path2)? loadCoupons(read_csv(path2, csv_header).split("\n")): await generateNCouponsOfType(10, 2);

	// save generated coupons into the file
	write_csv(path0, csv_header, coupons0.codes.join("\n"));
	write_csv(path1, csv_header, coupons1.codes.join("\n"));
	write_csv(path2, csv_header, coupons2.codes.join("\n"));

	// add coupon codes if required
	if((await sale.isCouponValid(coupons0.codes[0])).eq(toBN(0xFF))) {
		console.log("adding %o coupon codes (Silver Box)", coupons0.codes.length);
		await sale.bulkAddCoupons(coupons0.keys, 0);
	}
	else {
		console.log("skipping adding coupon codes for Silver Box – coupons already exist");
	}
	if((await sale.isCouponValid(coupons1.codes[0])).eq(toBN(0xFF))) {
		console.log("adding %o coupon codes (Rotund Silver Box)", coupons1.codes.length);
		await sale.bulkAddCoupons(coupons1.keys, 1);
	}
	else {
		console.log("skipping adding coupon codes for Rotund Silver Box – coupons already exist");
	}
	if((await sale.isCouponValid(coupons2.codes[0])).eq(toBN(0xFF))) {
		console.log("adding %o coupon codes (Goldish Silver Box)", coupons2.codes.length);
		await sale.bulkAddCoupons(coupons2.keys, 2);
	}
	else {
		console.log("skipping adding coupon codes for Goldish Silver Box – coupons already exist");
	}

	console.log("optional phase [write silver sale coupons] complete");
}


async function migrateSilverERC20(instances) {
	// process the data for silver
	await processERC20Data("silver.csv", instances.SilverERC20, instances.TokenWriter);
}

async function migrateGoldERC20(instances) {
	// process the data for gold
	await processERC20Data("gold.csv", instances.GoldERC20, instances.TokenWriter);
}

async function migrateRefPointsTracker(instances) {
	// redefine instances links
	const tracker = instances.RefPointsTracker;
	const writer = instances.TokenWriter;

	// write referral points and known addresses
	await writeRefPoints(tracker, writer);
	await writeKnownAddresses(tracker, writer);
}

async function migrateCountryERC721(instances) {
	// redefine instances links
	const token = instances.CountryERC721;
	const writer = instances.TokenWriter;

	// CSV header
	const csv_header = "tokenId,owner";
	// read CSV data
	const csv_data = read_csv("./data/countries.csv", csv_header);
	console.log("\t%o bytes CSV data read from countries.csv", csv_data.length);

	// define arrays to store the data
	const owners = [];
	const ids = [];

	// split CSV data by lines: each line is a record
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of records
	for(let i = 0; i < csv_lines.length; i++) {
		// extract token properties
		const props = csv_lines[i].split(",").map((a) => a.trim());

		// skip malformed line
		if(props.length !== 2) {
			continue;
		}

		// add token ID
		ids.push(props[0]);
		// add owner
		owners.push(props[1]);
	}
	console.log("\t%o of %o tokens parsed", owners.length, csv_lines.length);

	// verify IDs
	for(let i = 0; i < ids.length; i++) {
		if(i + 1 != ids[i]) {
			console.log("Unexpected token ID! %o at %o", ids[i], i + 1);
			return;
		}
	}

	// grant writer permission to mint countries
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("granting Writer " + writer.address + " permission to mint CountryERC721 " + token.address);
		await token.updateRole(writer.address, ROLE_TOKEN_CREATOR);
	}

	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	// iterate the arrays in bulks
	const bulkSize = 64;
	for(let offset = 0; offset < owners.length; offset += bulkSize) {
		// extract portion of owners array
		const owners_to_write = owners.slice(offset, offset + bulkSize);

		// check token existence at the offset
		if(!await token.exists(offset + 1)) {
			// write all the gems and measure gas
			const gasUsed = (await writer.writeCountryV2Data(token.address, offset, owners_to_write)).receipt.gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log(
				"\t%o token(s) written (%o total): %o gas used",
				Math.min(bulkSize, owners.length - offset),
				Math.min(offset + bulkSize, owners.length),
				gasUsed
			);
		}
		else {
			// log the message
			console.log("\t%o token(s) skipped", Math.min(bulkSize, owners.length - offset));
		}
	}

	// clean the permissions used
	if(!(await token.userRoles(writer.address)).isZero()) {
		console.log("revoking Writer " + writer.address + " permission to mint CountryERC721 " + token.address);
		await token.updateRole(writer.address, 0);
	}

	// print the cumulative gas usage result
	console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
}

async function migrateGemERC721(instances) {
	// redefine instances links
	const token = instances.GemERC721;
	const writer = instances.TokenWriter;

	// CSV header
	const csv_header = "tokenId,plotId,color,level,grade,grade type,grade value,age,owner";
	// read CSV data
	const csv_data = read_csv("./data/gems.csv", csv_header);
	console.log("\t%o bytes CSV data read from gems.csv", csv_data.length);

	// define arrays to store the data
	const owners = [];
	const gems = [];

	// split CSV data by lines: each line is a record
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of records
	for(let i = 0; i < csv_lines.length; i++) {
		// extract token properties
		const props = csv_lines[i].split(",").map((a) => a.trim());

		// skip malformed line
		if(props.length !== 9) {
			continue;
		}

		// add token's owner
		owners.push(props.pop()); // remove last element
		// add the gem itself
		gems.push(props);
	}
	console.log("\t%o of %o token(s) parsed", gems.length, csv_lines.length);

	// grant writer permission to mint gems and set energetic age
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("granting Writer " + writer.address + " permission to mint GemERC721 " + token.address);
		await token.updateRole(writer.address, ROLE_TOKEN_CREATOR | ROLE_AGE_PROVIDER);
	}

	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	// now we have all the gems parsed
	// iterate the arrays in bulks
	const bulkSize = 50;
	for(let offset = 0; offset < owners.length; offset += bulkSize) {
		// extract portion of owners array
		const owners_to_write = owners.slice(offset, offset + bulkSize);
		// extract portion of data array
		const gems_to_write = gems.slice(offset, offset + bulkSize).map(packGemData);

		// check token existence at the offset
		if(!await token.exists(gems[offset][0])) {
			// write all the gems and measure gas
			const gasUsed = (await writer.writeBulkGemV2Data(token.address, owners_to_write, gems_to_write)).receipt.gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log(
				"\t%o token(s) written (%o total): %o gas used",
				Math.min(bulkSize, owners.length - offset),
				Math.min(offset + bulkSize, owners.length),
				gasUsed
			);
		}
		else {
			// log the message
			console.log("\t%o token(s) skipped", Math.min(bulkSize, owners.length - offset));
		}
	}
	// clean the permissions used
	if(!(await token.userRoles(writer.address)).isZero()) {
		console.log("revoking Writer " + writer.address + " permission to mint GemERC721 " + token.address);
		await token.updateRole(writer.address, 0);
	}

	// print the cumulative gas usage result
	console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
}


async function enablePermissions(conf, instances) {
	console.log("optional phase: enable permissions");

	// DutchAuction.setFeeAndBeneficiary
	if((await instances.DutchAuction.fee()).isZero()) {
		console.log("setting fee and beneficiary for DutchAuction " + conf.DutchAuction);
		await instances.DutchAuction.setFeeAndBeneficiary(1, 20, conf.Beneficiary, conf.WorldChest);
	}
	// enable DutchAuction – selling (adding) and buying
	if((await instances.DutchAuction.features()).isZero()) {
		console.log("enabling add/buy features for DutchAuction " + conf.DutchAuction);
		await instances.DutchAuction.updateFeatures(FEATURE_ADD | FEATURE_BUY);
	}
	// whitelist GemERC721 on the DutchAuction
	if(!await instances.DutchAuction.supportedTokenAddresses(conf.GemERC721)) {
		console.log("whitelisting GemERC721 " + conf.GemERC721 + " on the DutchAuction " + conf.DutchAuction);
		await instances.DutchAuction.whitelist(conf.GemERC721);
	}
	// enable transfers and transfers on behalf for GemERC721
	if((await instances.GemERC721.features()).isZero()) {
		console.log("enabling transfers and transfers on behalf for GemERC721 " + conf.GemERC721);
		await instances.GemERC721.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
	}
	console.log("DutchAuction configuration complete");

	// allow Workshop to destroy SilverERC20
	if((await instances.SilverERC20.userRoles(conf.Workshop)).isZero()) {
		console.log("granting Workshop " + conf.Workshop + " permission to burn SilverERC20 " + conf.SilverERC20);
		await instances.SilverERC20.updateRoles(conf.Workshop, ROLE_TOKEN_DESTROYER);
	}
	// allow Workshop to destroy GoldERC20
	if((await instances.GoldERC20.userRoles(conf.Workshop)).isZero()) {
		console.log("granting Workshop " + conf.Workshop + " permission to burn GoldERC20 " + conf.GoldERC20);
		await instances.GoldERC20.updateRoles(conf.Workshop, ROLE_TOKEN_DESTROYER);
	}
	// allow Workshop to level up and upgrade GemERC721
	if((await instances.GemERC721.userRoles(conf.Workshop)).isZero()) {
		console.log("granting Workshop " + conf.Workshop + " permission to level up and upgrade GemERC721 " + conf.GemERC721);
		await instances.GemERC721.updateRoles(conf.Workshop, ROLE_LEVEL_PROVIDER | ROLE_GRADE_PROVIDER);
	}
	// enable Workshop (leveling up / upgrades)
	if((await instances.Workshop.features()).isZero()) {
		console.log("enabling Workshop " + conf.Workshop);
		await instances.Workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
	}
	console.log("Workshop configuration complete");

	// allow Miner to mint ArtifactERC20
	if((await instances.ArtifactERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner " + conf.Miner + " permission to mint ArtifactERC20 " + conf.ArtifactERC20);
		await instances.ArtifactERC20.updateRoles(conf.Miner, ROLE_TOKEN_CREATOR);
	}
	// allow Miner to mint FoundersKeyERC20
	if((await instances.FoundersKeyERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner " + conf.Miner + " permission to mint FoundersKeyERC20 " + conf.FoundersKeyERC20);
		await instances.FoundersKeyERC20.updateRoles(conf.Miner, ROLE_TOKEN_CREATOR);
	}
	// allow Miner to mint ChestKeyERC20
	if((await instances.ChestKeyERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner " + conf.Miner + " permission to mint ChestKeyERC20 " + conf.ChestKeyERC20);
		await instances.ChestKeyERC20.updateRoles(conf.Miner, ROLE_TOKEN_CREATOR);
	}
	// allow Miner to mint SilverERC20
	if((await instances.SilverERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner " + conf.Miner + " permission to mint SilverERC20 " + conf.SilverERC20);
		await instances.SilverERC20.updateRoles(conf.Miner, ROLE_TOKEN_CREATOR);
	}
	// allow Miner to mint GoldERC20
	if((await instances.GoldERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner " + conf.Miner + " permission to mint GoldERC20 " + conf.GoldERC20);
		await instances.GoldERC20.updateRoles(conf.Miner, ROLE_TOKEN_CREATOR);
	}
	// allow Miner to update PlotERC721
	if((await instances.PlotERC721.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner " + conf.Miner + " permission to update PlotERC721 " + conf.PlotERC721);
		await instances.PlotERC721.updateRoles(conf.Miner, ROLE_STATE_PROVIDER | ROLE_OFFSET_PROVIDER);
	}
	// allow Miner to update GemERC721
	if((await instances.GemERC721.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner " + conf.Miner + " permission to mint and update GemERC721 " + conf.GemERC721);
		await instances.GemERC721.updateRoles(conf.Miner, ROLE_TOKEN_CREATOR | ROLE_NEXT_ID_PROVIDER | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_MINED_STATS_PROVIDER);
	}
	// enable Miner (mining)
	if((await instances.Miner.features()).isZero()) {
		console.log("enabling Miner " + conf.Miner);
		await instances.Miner.updateFeatures(FEATURE_MINING_ENABLED);
	}
	console.log("Miner configuration complete");

	// allow PlotSale to access (rw) RefPointsTracker
	if((await instances.RefPointsTracker.userRoles(conf.PlotSale)).isZero()) {
		console.log("granting PlotSale " + conf.PlotSale + " permissions on RefPointsTracker " + conf.RefPointsTracker);
		await instances.RefPointsTracker.updateRoles(conf.PlotSale, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);
	}
	// allow PlotSale to mint PlotERC721
	if((await instances.PlotERC721.userRoles(conf.PlotSale)).isZero()) {
		console.log("granting PlotSale " + conf.PlotSale + " permission to mint PlotERC721 " + conf.PlotERC721);
		await instances.PlotERC721.updateRoles(conf.PlotSale, ROLE_TOKEN_CREATOR);
	}
	// enable PlotSale (sell, get, coupons)
	if((await instances.PlotSale.features()).isZero()) {
		console.log("enabling (SELL | GET | COUPON) PlotSale " + conf.PlotSale);
		await instances.PlotSale.updateFeatures(FEATURE_SALE_ENABLED | FEATURE_GET_ENABLED | FEATURE_USING_COUPONS_ENABLED);
	}
	console.log("PlotSale configuration complete");

	// allow PlotAntarctica to mint PlotERC721
	if((await instances.PlotERC721.userRoles(conf.PlotAntarctica)).isZero()) {
		console.log("granting PlotAntarctica " + conf.PlotAntarctica + " permission to mint PlotERC721 " + conf.PlotERC721);
		await instances.PlotERC721.updateRoles(conf.PlotAntarctica, ROLE_TOKEN_CREATOR);
	}
	// enable PlotAntarctica (getting founder's plots in Antarctica)
	if((await instances.PlotAntarctica.features()).isZero()) {
		console.log("enabling PlotAntarctica " + conf.PlotAntarctica);
		await instances.PlotAntarctica.updateFeatures(FEATURE_ANTARCTICA_GET_ENABLED);
	}
	console.log("PlotAntarctica configuration complete");

	// allow SilverSale to access (rw) RefPointsTracker
	if((await instances.RefPointsTracker.userRoles(conf.SilverSale)).isZero()) {
		console.log("granting SilverSale " + conf.SilverSale + " permissions on RefPointsTracker " + conf.RefPointsTracker);
		await instances.RefPointsTracker.updateRoles(conf.SilverSale, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);
	}
	// allow SilverSale to mint SilverERC20
	if((await instances.SilverERC20.userRoles(conf.SilverSale)).isZero()) {
		console.log("granting SilverSale " + conf.SilverSale + " permission to mint SilverERC20 " + conf.SilverERC20);
		await instances.SilverERC20.updateRoles(conf.SilverSale, ROLE_TOKEN_CREATOR);
	}
	// allow SilverSale to mint GoldERC20
	if((await instances.GoldERC20.userRoles(conf.SilverSale)).isZero()) {
		console.log("granting SilverSale " + conf.SilverSale + " permission to mint GoldERC20 " + conf.GoldERC20);
		await instances.GoldERC20.updateRoles(conf.SilverSale, ROLE_TOKEN_CREATOR);
	}
	// enable SilverSale (sell, get, coupons)
	if((await instances.SilverSale.features()).isZero()) {
		console.log("enabling (SELL | GET | COUPON) SilverSale " + conf.SilverSale);
		await instances.SilverSale.updateFeatures(FEATURE_SALE_ENABLED | FEATURE_GET_ENABLED | FEATURE_USING_COUPONS_ENABLED);
	}
	console.log("SilverSale configuration complete");

	console.log("optional phase [enable permissions] complete");
}


// auxiliary function to pack ERC20 data from array into uint256
function packERC20Data(p) {
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack address and amount
	return p[1].shln(160).or(p[0]);
}

// auxiliary function to pack ref data from array into uint256
function packRefData(p) {
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack issued, consumed, balance and owner
	return p[0].shln(32).or(p[1]).shln(32).or(p[2]).shln(160).or(p[3]);
}

// auxiliary function to pack gem data from array into uint128
function packGemData(p) {
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack gem ID, plot ID, color, level, grade, energetic age and return
	return p[0].shln(24).or(p[1]).shln(8).or(p[2]).shln(8).or(p[3]).shln(32).or(p[4]).shln(32).or(p[7]);
}

// all ERC20 tokens have same processing logic, only CSV file name differs
async function processERC20Data(file_name, token, writer) {
	// CSV header
	const csv_header = "address,amount";
	// read CSV data
	const csv_data = read_csv(`./data/${file_name}`, csv_header);
	console.log("\t%o bytes CSV data read from %s", csv_data.length, file_name);

	// define array to store the data
	const data = [];

	// split CSV data by lines: each line is a record
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of record
	for(let i = 0; i < csv_lines.length; i++) {
		// extract record data
		const props = csv_lines[i].split(",").map((a) => a.trim());

		// skip malformed line
		if(props.length !== 2) {
			continue;
		}

		// extract data
		data.push(props);
	}
	console.log("\t%o of %o records parsed", data.length, csv_lines.length);

	// grant writer permission to mint gems and set energetic age
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("granting Writer " + writer.address + " permission to mint ERC20 token " + token.address);
		await token.updateRole(writer.address, ROLE_TOKEN_CREATOR);
	}

	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	// check if tokens are already written
	if((await token.balanceOf(data[0][0])).isZero()) {
		// write all the data in a single transaction
		const gasUsed = (await writer.writeERC20Data(token.address, data.map(packERC20Data))).receipt.gasUsed;

		// update cumulative gas used
		cumulativeGasUsed += gasUsed;

		// log the result
		console.log("\t%o record(s) written: %o gas used", data.length, gasUsed);
	}
	else {
		console.log("\t%o record(s) skipped", data.length);
	}

	// clean the permissions used
	if(!(await token.userRoles(writer.address)).isZero()) {
		console.log("revoking Writer " + writer.address + " permission to mint ERC20 token " + token.address);
		await token.updateRole(writer.address, 0);
	}

	// log the result
	console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
}

// aux function to write referral points data
async function writeRefPoints(tracker, writer) {
	// CSV header
	const csv_header = "issued,consumed,available,address";
	// read CSV data
	const csv_data = read_csv("./data/ref_points.csv", csv_header);
	console.log("\t%o bytes CSV data read from ref_points.csv", csv_data.length);

	// define array to store the data
	const data = [];

	// split CSV data by lines: each line is a record
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of records
	for (let i = 0; i < csv_lines.length; i++) {
		// extract tracker properties
		const props = csv_lines[i].split(",").map((a) => a.trim());

		// skip malformed line
		if (props.length !== 4) {
			continue;
		}

		// extract data
		data.push(props);
	}
	console.log("\t%o of %o records parsed", data.length, csv_lines.length);

	// grant writer permission to issue and consume referral points
	if((await tracker.userRoles(writer.address)).isZero()) {
		console.log("granting Writer " + writer.address + " permission to update RefPointsTracker " + tracker.address);
		await tracker.updateRole(writer.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);
	}

	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	// check if ref points are already written
	if (!await tracker.isKnown(data[0][3])) {
		// write all the gems and measure gas
		const gasUsed = (await writer.writeRefPointsData(tracker.address, data.map(packRefData))).receipt.gasUsed;

		// update cumulative gas used
		cumulativeGasUsed += gasUsed;

		// log the result
		console.log("\t%o record(s) written: %o gas used", data.length, gasUsed);
	} else {
		console.log("\t%o record(s) skipped", data.length);
	}
	// clean the permissions used
	if(!(await tracker.userRoles(writer.address)).isZero()) {
		console.log("revoking Writer " + writer.address + " permission to update RefPointsTracker " + tracker.address);
		await tracker.updateRole(writer.address, 0);
	}

	// log cumulative gas used
	console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
}

// aux function to write referral points data
async function writeKnownAddresses(tracker, writer) {
	// CSV header
	const csv_header = "issued,consumed,available,address";
	// read CSV data
	const csv_data = read_csv("./data/known_addresses.csv", csv_header);
	console.log("\t%o bytes CSV data read from known_addresses.csv", csv_data.length);

	// define array to store the data
	const data = [];

	// split CSV data by lines: each line is a record
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of records
	for(let i = 0; i < csv_lines.length; i++) {
		// extract tracker properties
		const props = csv_lines[i].split(",").map((a) => a.trim());

		// skip malformed line
		if(props.length !== 4) {
			continue;
		}

		// extract data
		data.push(props);
	}
	console.log("\t%o of %o records parsed", data.length, csv_lines.length);

	// grant writer permission to add known addresses
	if((await tracker.userRoles(writer.address)).isZero()) {
		console.log("granting Writer " + writer.address + " permission to update RefPointsTracker " + tracker.address);
		await tracker.updateRole(writer.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);
	}


	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	// iterate the arrays in bulks
	const bulkSize = 100;
	for(let offset = 0; offset < data.length; offset += bulkSize) {
		// extract portion of owners array
		const data_to_write = data.slice(offset, offset + bulkSize).map(packRefData);

		// check if ref points are already written
		if(!await tracker.isKnown(data[offset][3])) {
			// write all the gems and measure gas
			const gasUsed = (await writer.writeKnownAddrData(tracker.address, data_to_write)).receipt.gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log(
				"\t%o record(s) written (%o total): %o gas used",
				Math.min(bulkSize, data.length - offset),
				Math.min(offset + bulkSize, data.length),
				gasUsed
			);
		}
		else {
			console.log("\t%o record(s) skipped", Math.min(bulkSize, data.length - offset));
		}
	}
	// clean the permissions used
	if(!(await tracker.userRoles(writer.address)).isZero()) {
		console.log("revoking Writer " + writer.address + " permission to update RefPointsTracker " + tracker.address);
		await tracker.updateRole(writer.address, 0);
	}

	// log the result
	console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
}



// TODO: country data must be imported from country_data.js
const COUNTRY_DATA = [62920,36777,35261,35084,31367,28333,12108,10241,10037,8773,8639,7978,7918,7236,7015,6857,6481,6070,5764,4734,4729,4667,4592,4567,4493,4411,4152,4046,3796,3689,3481,3403,3359,3040,2961,2953,2875,2788,2772,2499,2488,2385,2349,2295,2283,2223,2211,2162,2138,1945,1893,1859,1798,1751,1705,1657,1648,1645,1610,1498,1439,1392,1315,1260,1241,1215,1214,1194,1188,1152,1140,1110,1105,1044,1010,992,986,906,897,890,879,878,872,792,765,731,723,682,667,649,603,601,544,542,527,486,477,447,444,436,415,413,410,409,405,401,379,363,343,340,336,325,319,309,305,290,288,268,263,257,242,240,238,209,208,188,188,180,179,173,167,159,157,152,133,133,125,120,112,110,106,105,103,103,102,99,97,93,85,81,77,75,67,66,64,55,51,51,45,42,42,40,38,34,21,19,15,11,10,8,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5];

// auxiliary function to write data into CSV file
// appends data if CSV file already exists
// TODO: import from shared_functions.js
function write_csv(path, header, data) {
	if(fs.existsSync(path)) {
		header = "";
	}
	fs.appendFileSync(path, `${header}\n${data}`, {encoding: "utf8"});
}

// auxiliary function to read data from CSV file
// if CSV begins with the header specified - deletes the header from data returned
// TODO: import from shared_functions.js
function read_csv(path, header) {
	if(!fs.existsSync(path)) {
		return "";
	}
	const data = fs.readFileSync(path, {encoding: "utf8"});
	if(data.indexOf(`${header}\n`) !== 0) {
		throw new Error("malformed CSV header");
	}
	return data.substring(header.length + 1)
}

// short name for web3.utils.toBN
// TODO: import from shared_functions.js
const toBN = web3.utils.toBN;
