// This script is designed to be re-runnable,
// it automatically determines the point where it stopped execution
// last time it was executed and continues from this place

// List of smart contract to deploy or use (ABI)
const FoundersPlots = artifacts.require("./FoundersPlotsMock");
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
const SilverSale = artifacts.require("./SilverSale");
const PlotSale = artifacts.require("./PlotSale");
const PlotAntarctica = artifacts.require("./PlotAntarctica");
const Miner = artifacts.require("./Miner");
const MintHelper = artifacts.require("./MintHelper");
const ChestFactory = artifacts.require("./ChestFactory");


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
const ROLE_MINT_OPERATOR = 0x00000001;


// some global external addresses
const SRV_ADDR = {
	JOHN: "0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6",
	BASIL: "0x5F185Da55f7BBD9217E3b3CeE06b180721FA6d34",
	ROMAN: "0x0E9c1beDf18e77a87E61100e5709Aea4d0Ba83e1",
	JOHNS_FRIEND: "0xAa4812EAd3c0E009995FdbcbbEE9211EeAeb42FB"
};

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

	// print initial debug information
	console.log("network %o", network);
	console.log("service account %o, nonce: %o", accounts[0], await web3.eth.getTransactionCount(accounts[0]));
	console.log("service addresses:\n%o", SRV_ADDR);

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
				WorldChest:         "0x29E007c1BFc9c9aA1351B8B3D3B01Cc45dF6Ae4D", // Mainnet MSIG
				MonthlyChest:       "0x2906DA90D3f99D5913bB3461183682951ca7280c", // Mainnet MSIG

				FoundersPlots:      "0xE0A21044eEeB9efC340809E35DC0E9d82Dc87DD1",
				BalanceProxy:       "0xbd7Ca763E12d23535B59949ade53c104BD88d42F",
				TokenHelper:        "0xeF47Ac9B0132895a37C31530d520Ff22BaC89322",
				TokenReader:        "0x5365f191d2247658F792E0a2D7Be6D676f3013E5",
				TokenWriter:        "0x75830B3914Db027a9258C374Bf66e327Ef5AB680",

				DutchAuction:       "0x7A300F8729809147fDDf9D4BD2b62214b34b3988",

				RefPointsTracker:   "0xCd2AEdF9a0C5E8A16d7EcE7e0C51A1f6590f25F2",
				ArtifactERC20:      "0x76259c1A95d25dd8F9E8808c8AaCb51397756F0C",
				FoundersKeyERC20:   "0xc3233a564BEFcFBc7aBEd2f881908684D45c209B",
				ChestKeyERC20:      "0x26e8988252D8bBa4641DC3D61BBE9fBc44B421fA",
				SilverERC20:        "0x4D55e9d055817497De7B790D38328265f8E305D9",
				GoldERC20:          "0xf61aDA5FE3ea9F919fe5Bd1FF9e809B1F4315285",
				CountryERC721:      "0xd2Eb63023aaeB44030fF53a6EbD6E0C05edEC836",
				PlotERC721:         "0x6966730b1435168880B35faa1E75dE0988EE2E39",
				GemERC721:          "0x34Fa7ddde9D0E1B98CD281EE1E8BA1DB37C64399",

				Workshop:           "0x5aE2466431aDCdc86EEE95533272afA5ebB546d0",
				SilverSale:         "0xfAaD84Cc472195bEa68aad29C3AAfb47E7252cc9",

				PlotSale:           "0xBBf4FB0565d7b9AD58819C9f83785785c71f00c3",
				PlotAntarctica:     "0xdf5ceDeCB10912E9f68FD93c55c54d54db142F99",

				Miner:              "0x8dc1432c3936322f3dc4f4388b763e4450dfbeb5", // "0x530FfE811cE9D7c0f31f94772890F4d5Df08F8D7"

				MintHelper:         "0x5671823feaDb896eC6e3BD2f6F6cD5a561AdE9D3",
				ChestFactory:       "",

				PlotSaleStartUTC:   1563210000, // 07/15/2019 @ 5:00pm UTC
				SilverSaleStartUTC: 1550772000, // 02/21/2019 @ 6:00pm UTC

				optionalPhases: {
					// migration is complete on July 10, 2019, comment out
/*
					migration: {
						SilverERC20: true,
						GoldERC20: true,
						RefPointsTracker: true,
						CountryERC721: true,
						GemERC721: true,
					},
*/
					setMsigOwners: [
						SRV_ADDR.JOHN,
						SRV_ADDR.JOHNS_FRIEND,
					],
					enablePermissions: true,
					disablePermissions: false,
					writePlotSaleCoupons: false,
					writeSilverSaleCoupons: false,
					writeCountryGems: true
				},
			};
			// Ropsten Configuration
			case "ropsten": return {
				Beneficiary:        SRV_ADDR.BASIL,
				FoundersChest:      SRV_ADDR.ROMAN,
				WorldChest:         SRV_ADDR.JOHN,
				MonthlyChest:       SRV_ADDR.JOHNS_FRIEND,

				FoundersPlots:      '0xC600A8802eBA941afadF7BAf24be72C9234E8fBD',
				BalanceProxy:       '0x1cC23A1FE6a9ff9D5df7f595F6f1c6FBcc5272cC',
				TokenHelper:        '0xaAaF3bb7545f12D352f511361375ACb808616437',
				TokenReader:        '0xc36445BBcDb37F0d89A3a1b4447A66374E9F8911',
				TokenWriter:        '0xa97FD324f591b367F58eaC88C2DBe2B2104C2eF3',

				DutchAuction:       '0x7B28A073067061dc3A707a606be164626ACdBBA3',

				RefPointsTracker:   '0xdC86852e606f186B62C84a83a3FDa5F610c0f164',
				ArtifactERC20:      '0x38B14391B82CD183CE11fdDb115aF96Bf16840D2',
				FoundersKeyERC20:   '0xF3f0112E59F440F7464A1785721B4C3d6737870C',
				ChestKeyERC20:      '0xb663E0c6f03cf45a5DbE02eBF86Ea07730a3B91d',
				SilverERC20:        '0x0491E7Ff9afaa50B4D394C12c49BF4C8b06D1c5d',
				GoldERC20:          '0x5facE2F796919cac8f446B82a7aA9CA2723BF776',
				CountryERC721:      '0xF04A5244fC428b2c4c0C0Cf201a24221cC762749',
				PlotERC721:         '0x5223A488aA8D437F5d1052ec44c32f33A2D2b23F',
				GemERC721:          '0x0F3c237D0Bd742B5Af3a5606525daA3fE3b19a0d',

				Workshop:           '0xDaFEFbfdbf5c5D5CC83f93f2B00f18521C677193',
				SilverSale:         '0x8a56d78AC91091A66eAd96B494848148BF266a90',

				PlotSale:           '0x8347A9c77B24a9f6da6EfCEc8f8E2927eB0FF3A6',
				PlotAntarctica:     '0xc5fA9cedf850ee65A26bAa7Fe0594A7e66Ae301b',

				Miner:              '0x1fd59c7E655Ad7b3f93656356178a0FF77BCA60E',

				MintHelper:         '0x7d4CbD5e27a44241870fA6840912A8DA6F7aaDd4',
				ChestFactory:       '0x3B9574A461bba11241A0314712259ef1906b6219',

				PlotSaleStartUTC:   1563210000, // 07/15/2019 @ 5:00pm UTC
				SilverSaleStartUTC: 1550772000, // 02/21/2019 @ 6:00pm UTC

				optionalPhases: {
/*
					migration: {
						SilverERC20: true,
						GoldERC20: true,
						RefPointsTracker: true,
						CountryERC721: true,
						GemERC721: true,
					},
*/
					setMsigOwners: [
						SRV_ADDR.JOHN,
						SRV_ADDR.JOHNS_FRIEND,
					],
					enablePermissions: true,
					disablePermissions: false,
					writePlotSaleCoupons: false,
					writeSilverSaleCoupons: true,
					writeCountryGems: true,
					writeTestTokens: true,
				},
			};
			// Kovan Configuration
			case "kovan": return {
				Beneficiary:        SRV_ADDR.BASIL,
				FoundersChest:      SRV_ADDR.ROMAN,
				WorldChest:         SRV_ADDR.JOHN,
				MonthlyChest:       SRV_ADDR.JOHNS_FRIEND,

				FoundersPlots:      '0x3ACd26F0b5080C30c066a2055A4254A5BB05F22a',
				BalanceProxy:       '0x785b1246E57b9f72C6bb19e5aC3178aEffb0Fe73',
				TokenHelper:        '0x8920Df4215934E5f6c8935F0049E9b9d8dDF3656',
				TokenReader:        '0x63d49c8D35C9fB523515756337cef0991B304696',
				TokenWriter:        '0xBA98221d674D266298F15640E30782dCA2ECE864',

				DutchAuction:       '0x307015ef34a1baEb9Bf6fcbED03611235Bdd01aD',

				RefPointsTracker:   '0x18E29d4a0339D4a2e8D70408FE53cf9B07B09F38',
				ArtifactERC20:      '0xBE0d479710274735Ebd361E90e56E0604a879700',
				FoundersKeyERC20:   '0x731d55CD90762c02535fF410427Dd280A1B74397',
				ChestKeyERC20:      '0x7DA1b0552c0CAf7A72d8a7bc7F7813B3AC2FcC35',
				SilverERC20:        '0x4822b1172217875272d918e93076339193462E06',
				GoldERC20:          '0xeeEE3B45405C28712b76D0C64E4f0d824198AF30',
				CountryERC721:      '0x649A748552B82C3AF0a1a5a044756Cf252067AD0',
				PlotERC721:         '0x7913a362A803c30315F7665A0D6ed9d8373e3B1D',
				GemERC721:          '0xb638410212e8D22630c224BE0B038b4c8c78ea8A',

				Workshop:           '0x70d0f35dd27BC79303A2eAfD30db419742d6FaF9',
				SilverSale:         '0xD3e2e8C218618c8A842D3e3f84461fcBBA164b6c',

				PlotSale:           '0x77BDD9a3f4A87B1130fAf69C137657C74bdCD560',
				PlotAntarctica:     '0x314E712021Ab6E8D32F6Cfe9F4Baa2565Ff000b2',

				Miner:              '0x81ccdBB0dbB9514A20841152fbb459E7d8dC238B',

				MintHelper:         "0x69cEDb69051e63c7e335beB042B2501D5cDAFf23",

				PlotSaleStartUTC:   15 + new Date().getTime() / 1000 | 0, // in 15 minutes
				SilverSaleStartUTC: 1550772000, // 02/21/2019 @ 6:00pm UTC

				optionalPhases: {
/*
					migration: {
						SilverERC20: true,
						GoldERC20: true,
						RefPointsTracker: true,
						CountryERC721: true,
						GemERC721: true,
					},
*/
					setMsigOwners: [
						SRV_ADDR.JOHN,
						SRV_ADDR.JOHNS_FRIEND,
					],
					enablePermissions: true,
					disablePermissions: false,
					writePlotSaleCoupons: true,
					writeSilverSaleCoupons: true,
					writeCountryGems: true,
					writeTestTokens: false,
				},
			};
			default: throw "unknown network " + network;
		}
	})(network);

	// an object to contain all ABI linked instances to the addresses above
	const instances = {};

	// config validation
	if(!conf.FoundersPlots && network.indexOf("mainnet") >= 0) {
		throw "FoundersPlots must be defined for mainnet! Cannot use FoundersPlotsMock for mainnet.";
	}

	// execute mandatory phase to make sure the deployment is complete
	await deployInstances(deployer, conf, instances);

	// execute optional phases required one by one
	if(conf.optionalPhases.migration) {
		if(conf.optionalPhases.migration.SilverERC20) {
			await migrateSilverERC20(accounts, instances);
		}
		if(conf.optionalPhases.migration.GoldERC20) {
			await migrateGoldERC20(accounts, instances);
		}
		if(conf.optionalPhases.migration.RefPointsTracker) {
			await migrateRefPointsTracker(accounts, instances);
		}
		if(conf.optionalPhases.migration.CountryERC721) {
			await migrateCountryERC721(accounts, instances);
		}
		if(conf.optionalPhases.migration.GemERC721) {
			await migrateGemERC721(accounts, instances);
		}
	}
	if(conf.optionalPhases.setMsigOwners && conf.optionalPhases.setMsigOwners.length && conf.optionalPhases.setMsigOwners.length > 0) {
		await grantMsigAccess(accounts, conf, instances);
	}
	if(conf.optionalPhases.enablePermissions) {
		await enablePermissions(network, accounts, conf, instances);
	}
	if(conf.optionalPhases.writeSilverSaleCoupons) {
		await writeSilverSaleCoupons(network, accounts, instances);
	}
	if(conf.optionalPhases.writeCountryGems) {
		await createCountryGems(accounts, instances);
	}
	if(conf.optionalPhases.writeTestTokens) {
		await mintTestTokens(accounts, instances);
	}
};

async function deployInstances(deployer, conf, instances) {
	// deploy all missing instances first, healing the missing parts of the config
	console.log("mandatory phase: config healing (deploy missing instances)");

	// keep track of deployed instances count
	let deployedInstances = 0;

	// FoundersPlots binding/deployment
	if(conf.FoundersPlots) {
		console.log("binding FoundersPlots to " + conf.FoundersPlots);
		instances.FoundersPlots = await FoundersPlots.at(conf.FoundersPlots);
	}
	else {
		console.log("deploying FoundersPlotsMock to be used as FoundersPlots");
		await deployer.deploy(FoundersPlots);
		deployedInstances++;
	}

	// BalanceProxy binding/deployment
	if(conf.BalanceProxy) {
		console.log("binding BalanceProxy to " + conf.BalanceProxy);
		instances.BalanceProxy = await BalanceProxy.at(conf.BalanceProxy);
	}
	else {
		console.log("deploying BalanceProxy");
		await deployer.deploy(BalanceProxy);
		deployedInstances++;
	}

	// TokenHelper binding/deployment
	if(conf.TokenHelper) {
		console.log("binding TokenHelper to " + conf.TokenHelper);
		instances.TokenHelper = await TokenHelper.at(conf.TokenHelper);
	}
	else {
		console.log("deploying TokenHelper");
		await deployer.deploy(TokenHelper);
		deployedInstances++;
	}

	// TokenReader binding/deployment
	if(conf.TokenReader) {
		console.log("binding TokenReader to " + conf.TokenReader);
		instances.TokenReader = await TokenReader.at(conf.TokenReader);
	}
	else {
		console.log("deploying TokenReader");
		await deployer.deploy(TokenReader);
		deployedInstances++;
	}

	// TokenWriter binding/deployment
	if(conf.TokenWriter) {
		console.log("binding TokenWriter to " + conf.TokenWriter);
		instances.TokenWriter = await TokenWriter.at(conf.TokenWriter);
	}
	else {
		console.log("deploying TokenWriter");
		await deployer.deploy(TokenWriter);
		deployedInstances++;
	}

	// DutchAuction binding/deployment
	if(conf.DutchAuction) {
		console.log("binding DutchAuction to " + conf.DutchAuction);
		instances.DutchAuction = await DutchAuction.at(conf.DutchAuction);
	}
	else {
		console.log("deploying DutchAuction");
		await deployer.deploy(DutchAuction);
		deployedInstances++;
	}

	// RefPointsTracker binding/deployment
	if(conf.RefPointsTracker) {
		console.log("binding RefPointsTracker to " + conf.RefPointsTracker);
		instances.RefPointsTracker = await RefPointsTracker.at(conf.RefPointsTracker);
	}
	else {
		console.log("deploying RefPointsTracker");
		await deployer.deploy(RefPointsTracker);
		deployedInstances++;
	}

	// ArtifactERC20 binding/deployment
	if(conf.ArtifactERC20) {
		console.log("binding ArtifactERC20 to " + conf.ArtifactERC20);
		instances.ArtifactERC20 = await ArtifactERC20.at(conf.ArtifactERC20);
	}
	else {
		console.log("deploying ArtifactERC20");
		await deployer.deploy(ArtifactERC20);
		deployedInstances++;
	}

	// FoundersKeyERC20 binding/deployment
	if(conf.FoundersKeyERC20) {
		console.log("binding FoundersKeyERC20 to " + conf.FoundersKeyERC20);
		instances.FoundersKeyERC20 = await FoundersKeyERC20.at(conf.FoundersKeyERC20);
	}
	else {
		console.log("deploying FoundersKeyERC20");
		await deployer.deploy(FoundersKeyERC20);
		deployedInstances++;
	}

	// ChestKeyERC20 binding/deployment
	if(conf.ChestKeyERC20) {
		console.log("binding ChestKeyERC20 to " + conf.ChestKeyERC20);
		instances.ChestKeyERC20 = await ChestKeyERC20.at(conf.ChestKeyERC20);
	}
	else {
		console.log("deploying ChestKeyERC20");
		await deployer.deploy(ChestKeyERC20);
		deployedInstances++;
	}

	// SilverERC20 binding/deployment
	if(conf.SilverERC20) {
		console.log("binding SilverERC20 to " + conf.SilverERC20);
		instances.SilverERC20 = await SilverERC20.at(conf.SilverERC20);
	}
	else {
		console.log("deploying SilverERC20");
		await deployer.deploy(SilverERC20);
		deployedInstances++;
	}

	// GoldERC20 binding/deployment
	if(conf.GoldERC20) {
		console.log("binding GoldERC20 to " + conf.GoldERC20);
		instances.GoldERC20 = await GoldERC20.at(conf.GoldERC20);
	}
	else {
		console.log("deploying GoldERC20");
		await deployer.deploy(GoldERC20);
		deployedInstances++;
	}

	// CountryERC721 binding/deployment
	if(conf.CountryERC721) {
		console.log("binding CountryERC721 to " + conf.CountryERC721);
		instances.CountryERC721 = await CountryERC721.at(conf.CountryERC721);
	}
	else {
		console.log("deploying CountryERC721");
		await deployer.deploy(CountryERC721, COUNTRY_DATA);
		deployedInstances++;
	}

	// PlotERC721 binding/deployment
	if(conf.PlotERC721) {
		console.log("binding PlotERC721 to " + conf.PlotERC721);
		instances.PlotERC721 = await PlotERC721.at(conf.PlotERC721);
	}
	else {
		console.log("deploying PlotERC721");
		await deployer.deploy(PlotERC721);
		deployedInstances++;
	}

	// GemERC721 binding/deployment
	if(conf.GemERC721) {
		console.log("binding GemERC721 to " + conf.GemERC721);
		instances.GemERC721 = await GemERC721.at(conf.GemERC721);
	}
	else {
		console.log("deploying GemERC721");
		await deployer.deploy(GemERC721);
		deployedInstances++;
	}


	// link newly deployed instances
	if(!conf.FoundersPlots) {
		instances.FoundersPlots = await FoundersPlots.deployed();
		conf.FoundersPlots = instances.FoundersPlots.address;
	}
	if(!conf.BalanceProxy) {
		instances.BalanceProxy = await BalanceProxy.deployed();
		conf.BalanceProxy = instances.BalanceProxy.address;
	}
	if(!conf.TokenHelper) {
		instances.TokenHelper = await TokenHelper.deployed();
		conf.TokenHelper = instances.TokenHelper.address;
	}
	if(!conf.TokenReader) {
		instances.TokenReader = await TokenReader.deployed();
		conf.TokenReader = instances.TokenReader.address;
	}
	if(!conf.TokenWriter) {
		instances.TokenWriter = await TokenWriter.deployed();
		conf.TokenWriter = instances.TokenWriter.address;
	}
	if(!conf.DutchAuction) {
		instances.DutchAuction = await DutchAuction.deployed();
		conf.DutchAuction = instances.DutchAuction.address;
	}
	if(!conf.RefPointsTracker) {
		instances.RefPointsTracker = await RefPointsTracker.deployed();
		conf.RefPointsTracker = instances.RefPointsTracker.address;
	}
	if(!conf.ArtifactERC20) {
		instances.ArtifactERC20 = await ArtifactERC20.deployed();
		conf.ArtifactERC20 = instances.ArtifactERC20.address;
	}
	if(!conf.FoundersKeyERC20) {
		instances.FoundersKeyERC20 = await FoundersKeyERC20.deployed();
		conf.FoundersKeyERC20 = instances.FoundersKeyERC20.address;
	}
	if(!conf.ChestKeyERC20) {
		instances.ChestKeyERC20 = await ChestKeyERC20.deployed();
		conf.ChestKeyERC20 = instances.ChestKeyERC20.address;
	}
	if(!conf.SilverERC20) {
		instances.SilverERC20 = await SilverERC20.deployed();
		conf.SilverERC20 = instances.SilverERC20.address;
	}
	if(!conf.GoldERC20) {
		instances.GoldERC20 = await GoldERC20.deployed();
		conf.GoldERC20 = instances.GoldERC20.address;
	}
	if(!conf.CountryERC721) {
		instances.CountryERC721 = await CountryERC721.deployed();
		conf.CountryERC721 = instances.CountryERC721.address;
	}
	if(!conf.PlotERC721) {
		instances.PlotERC721 = await PlotERC721.deployed();
		conf.PlotERC721 = instances.PlotERC721.address;
	}
	if(!conf.GemERC721) {
		instances.GemERC721 = await GemERC721.deployed();
		conf.GemERC721 = instances.GemERC721.address;
	}

	// Workshop binding/deployment
	if(conf.Workshop) {
		console.log("binding Workshop to " + conf.Workshop);
		instances.Workshop = await Workshop.at(conf.Workshop);
	}
	else {
		console.log("deploying Workshop");
		await deployer.deploy(Workshop, conf.GemERC721, conf.SilverERC20, conf.GoldERC20);
		deployedInstances++;
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
		deployedInstances++;
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
		deployedInstances++;
	}

	// PlotAntarctica binding/deployment
	if(conf.PlotAntarctica) {
		console.log("binding PlotAntarctica to " + conf.PlotAntarctica);
		instances.PlotAntarctica = await PlotAntarctica.at(conf.PlotAntarctica);
	}
	else {
		console.log("deploying PlotAntarctica");
		await deployer.deploy(PlotAntarctica, conf.FoundersPlots, conf.PlotERC721);
		deployedInstances++;
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
		deployedInstances++;
	}

	// MintHelper binding/deployment
	if(conf.MintHelper) {
		console.log("binding MintHelper to " + conf.MintHelper);
		instances.MintHelper = await MintHelper.at(conf.MintHelper);
	}
	else {
		console.log("deploying MintHelper");
		await deployer.deploy(MintHelper, conf.GemERC721);
		deployedInstances++;
	}

	// ChestFactory binding/deployment
	if(conf.ChestFactory) {
		console.log("binding ChestFactory to " + conf.ChestFactory);
		instances.ChestFactory = await ChestFactory.at(conf.ChestFactory);
	}
	else {
		console.log("deploying ChestFactory");
		await deployer.deploy(ChestFactory, conf.FoundersKeyERC20, conf.ChestKeyERC20);
		deployedInstances++;
	}

	// link newly deployed instances
	if(!conf.Workshop) {
		instances.Workshop = await Workshop.deployed();
		conf.Workshop = instances.Workshop.address;
	}
	if(!conf.SilverSale) {
		instances.SilverSale = await SilverSale.deployed();
		conf.SilverSale = instances.SilverSale.address;
	}
	if(!conf.PlotSale) {
		instances.PlotSale = await PlotSale.deployed();
		conf.PlotSale = instances.PlotSale.address;
	}
	if(!conf.PlotAntarctica) {
		instances.PlotAntarctica = await PlotAntarctica.deployed();
		conf.PlotAntarctica = instances.PlotAntarctica.address;
	}
	if(!conf.Miner) {
		instances.Miner = await Miner.deployed();
		conf.Miner = instances.Miner.address;
	}
	if(!conf.MintHelper) {
		instances.MintHelper = await MintHelper.deployed();
		conf.MintHelper = instances.MintHelper.address;
	}
	if(!conf.ChestFactory) {
		instances.ChestFactory = await ChestFactory.deployed();
		conf.ChestFactory = instances.ChestFactory.address;
	}

	console.log("mandatory phase complete, %o config records healed / instances deployed", deployedInstances);

	// output healed config if any new instances were deployed
	if(deployedInstances > 0) {
		console.log("healed config: %o", conf);
	}
}

async function grantMsigAccess(accounts, conf, instances) {
	console.log("optional phase: grant MSIG access");

	// define a full access constant
	const FULL_ACCESS = toBN("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// iterate MSIG owners
	for(let owner of conf.optionalPhases.setMsigOwners) {
		// grant full access to all msig-inherited tokens to each of them if required
		if((await instances.RefPointsTracker.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on RefPointsTracker %o", owner, conf.RefPointsTracker);
			txs.push(instances.RefPointsTracker.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}
		if((await instances.ArtifactERC20.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on ArtifactERC20 %o", owner, conf.ArtifactERC20);
			txs.push(instances.ArtifactERC20.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}
		if((await instances.FoundersKeyERC20.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on FoundersKeyERC20 %o", owner, conf.FoundersKeyERC20);
			txs.push(instances.FoundersKeyERC20.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}
		if((await instances.ChestKeyERC20.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on ChestKeyERC20 %o", owner, conf.ChestKeyERC20);
			txs.push(instances.ChestKeyERC20.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}
		if((await instances.SilverERC20.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on SilverERC20 %o", owner, conf.SilverERC20);
			txs.push(instances.SilverERC20.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}
		if((await instances.GoldERC20.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on GoldERC20 %o", owner, conf.GoldERC20);
			txs.push(instances.GoldERC20.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}
		if((await instances.CountryERC721.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on CountryERC721 %o", owner, conf.CountryERC721);
			txs.push(instances.CountryERC721.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}
		if((await instances.PlotERC721.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on PlotERC721 %o", owner, conf.PlotERC721);
			txs.push(instances.PlotERC721.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}
		if((await instances.GemERC721.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on GemERC721 %o", owner, conf.GemERC721);
			txs.push(instances.GemERC721.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}

		// grant full access to chest factory contract if required
		if((await instances.ChestFactory.userRoles(owner)).isZero()) {
			console.log("granting %o FULL_ACCESS permission on ChestFactory %o", owner, conf.ChestFactory);
			txs.push(instances.ChestFactory.updateRole(owner, FULL_ACCESS, {nonce: nonce++}));
		}
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	console.log("optional phase [grant MSIG access] complete");
}


async function writeSilverSaleCoupons(network, accounts, instances) {
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

	// define variables to store the coupons:
	// Silver Box coupons
	let coupons0;
	// Rotund Silver Box coupons
	let coupons1;
	// Goldish Silver Box coupons
	let coupons2;

	// load the coupons from files or generate them if required
	if(fs.existsSync(path0)) {
		coupons0 = loadCoupons(read_csv(path0, csv_header).split("\n"));
	}
	else {
		coupons0 = await generateNCouponsOfType(30, 0);
		write_csv(path0, csv_header, coupons0.codes.join("\n"));
	}
	if(fs.existsSync(path1)) {
		coupons1 = loadCoupons(read_csv(path1, csv_header).split("\n"));
	}
	else {
		coupons1 = await generateNCouponsOfType(20, 1);
		write_csv(path1, csv_header, coupons1.codes.join("\n"));
	}
	if(fs.existsSync(path2)) {
		coupons2 = loadCoupons(read_csv(path2, csv_header).split("\n"));
	}
	else {
		coupons2 = await generateNCouponsOfType(10, 2);
		write_csv(path2, csv_header, coupons2.codes.join("\n"));
	}

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// add coupon codes if required
	if((await sale.isCouponValid(coupons0.codes[0])).eq(toBN(0xFF))) {
		console.log("adding %o coupon codes (Silver Box)", coupons0.codes.length);
		txs.push(sale.bulkAddCoupons(coupons0.keys, 0, {nonce: nonce++}));
	}
	else {
		console.log("skipping adding coupon codes for Silver Box – coupons already exist");
	}
	if((await sale.isCouponValid(coupons1.codes[0])).eq(toBN(0xFF))) {
		console.log("adding %o coupon codes (Rotund Silver Box)", coupons1.codes.length);
		txs.push(sale.bulkAddCoupons(coupons1.keys, 1, {nonce: nonce++}));
	}
	else {
		console.log("skipping adding coupon codes for Rotund Silver Box – coupons already exist");
	}
	if((await sale.isCouponValid(coupons2.codes[0])).eq(toBN(0xFF))) {
		console.log("adding %o coupon codes (Goldish Silver Box)", coupons2.codes.length);
		txs.push(sale.bulkAddCoupons(coupons2.keys, 2, {nonce: nonce++}));
	}
	else {
		console.log("skipping adding coupon codes for Goldish Silver Box – coupons already exist");
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	console.log("optional phase [write silver sale coupons] complete");
}


async function migrateSilverERC20(accounts, instances) {
	console.log("optional phase: migrate SilverERC20 data");

	// process the data for silver
	await processERC20Data("silver.csv", instances.SilverERC20, instances.TokenWriter, accounts);

	console.log("optional phase [migrate SilverERC20 data] complete");
}

async function migrateGoldERC20(accounts, instances) {
	console.log("optional phase: migrate GoldERC20 data");

	// process the data for gold
	await processERC20Data("gold.csv", instances.GoldERC20, instances.TokenWriter, accounts);

	console.log("optional phase [migrate GoldERC20 data] complete");
}

async function migrateRefPointsTracker(accounts, instances) {
	console.log("optional phase: migrate RefPointsTracker data");

	// redefine instances links
	const tracker = instances.RefPointsTracker;
	const writer = instances.TokenWriter;

	// write referral points and known addresses
	await writeRefPoints(tracker, writer, accounts);
	await writeKnownAddresses(tracker, writer, accounts);

	console.log("optional phase [migrate RefPointsTracker] data");
}

async function migrateCountryERC721(accounts, instances) {
	console.log("optional phase: migrate CountryERC721 data");

	// redefine instances links
	const token = instances.CountryERC721;
	const writer = instances.TokenWriter;
	await writeCountryERC721Data(token, writer, accounts);

	console.log("optional phase [migrate CountryERC721 data] complete");
}

async function migrateGemERC721(accounts, instances) {
	console.log("optional phase: migrate GemERC721 data");

	// redefine instances links
	const token = instances.GemERC721;
	const writer = instances.TokenWriter;

	// write GemERC721 data
	await writeGemERC721Data("gems.csv", token, writer, accounts);

	console.log("optional phase [migrate GemERC721 data] complete");
}

async function createCountryGems(accounts, instances) {
	console.log("optional phase: create country gems");

	// redefine instances links
	const token = instances.GemERC721;
	const writer = instances.TokenWriter;

	// write country gems
	await writeGemERC721Data("country_gems.csv", token, writer, accounts);

	console.log("optional phase [create country gems] complete");
}

async function mintTestTokens(accounts, instances) {
	console.log("optional phase: mint test tokens");

	// testing addresses
	const testers = [
		SRV_ADDR.JOHN,
		SRV_ADDR.ROMAN,
		SRV_ADDR.BASIL,
	];

	// mint few ERC721 tokens
	// gems – GemERC721
	const k = 15;
	const n = k * testers.length;
	if(!await instances.GemERC721.exists(1)) {
		console.log("minting %o gems for %o test accounts (%o gems for each account)", n, testers.length, k);
		const colors = [1, 2, 5, 6, 7, 9, 10];
		const owners = [];
		const gems = [];

		for(let i = 0; i < n; i++) {
			const to = testers[i % testers.length];
			const color = colors[i % colors.length];
			const level = 1 + i % 5;
			const gradeType = 1 + i % 6;
			const gradeValue = Math.floor(Math.random() * 1000000);
			const grade = gradeType << 24 | gradeValue;

			owners.push(to);
			gems.push(packGemData([i + 1, 0, color, level, grade, gradeType, gradeValue, 0]));
		}

		// get link to instances of interest
		const writer = instances.TokenWriter;
		const token = instances.GemERC721;

		// grant writer permission to mint gems and set energetic age
		if((await token.userRoles(writer.address)).isZero()) {
			console.log("granting Writer %o  permission to mint GemERC721 %o", writer.address, token.address);
			await token.updateRole(writer.address, ROLE_TOKEN_CREATOR | ROLE_AGE_PROVIDER);
		}
		// write all the gems
		console.log("writing %o gems", gems.length);
		await writer.writeBulkGemV2Data(token.address, owners, gems);
		// clean the permissions used
		if(!(await token.userRoles(writer.address)).isZero()) {
			console.log("revoking Writer %o permission to mint GemERC721 %o", writer.address, token.address);
			await token.updateRole(writer.address, 0);
		}
	}
	else {
		console.log("skipping minting %o gems – gems already exist", n);
	}

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// countries - CountryERC721
	for(let i = 0; i < 3 * testers.length; i++) {
		const exists = await instances.CountryERC721.exists(190 - i);
		console.log("%s country %o", (exists? "skipping": "minting"), 190 - i);
		if(!exists) {
			txs.push(instances.CountryERC721.mint(testers[i % testers.length], 190 - i, {nonce: nonce++}));
		}
	}
	// plots - PlotERC721
	// Antarctica - 2 tiers
	for(let i = 0; i < 4 * testers.length; i++) {
		const exists = await instances.PlotERC721.exists(i + 1);
		console.log("%s Antarctica plot %o", (exists? "skipping": "minting"), i + 1);
		if(!exists) {
			txs.push(instances.PlotERC721.mint(testers[i % testers.length], 0, "0x0200236464646400", {nonce: nonce++}));
		}
	}
	// Rest of the World - 5 tiers
	for(let i = 0; i < 8 * testers.length; i++) {
		const exists = await instances.PlotERC721.exists(i + 65537);
		console.log("%s regular plot %o", (exists? "skipping": "minting"), i + 65537);
		if(!exists) {
			txs.push(instances.PlotERC721.mint(testers[i % testers.length], 1, "0x05002341555F6400", {nonce: nonce++}));
		}
	}

	// mint few ERC20 tokens
	for(let i = 0; i < testers.length; i++) {
		let exists;

		// Silver ERC20
		exists = !(await instances.SilverERC20.balanceOf(testers[i])).isZero();
		console.log((exists? "skipping ": "") + "minting 10000 silver " + i);
		if(!exists) {
			txs.push(instances.SilverERC20.mint(testers[i], 10000), {nonce: nonce++});
		}

		// Gold ERC20
		exists = !(await instances.GoldERC20.balanceOf(testers[i])).isZero();
		console.log((exists? "skipping ": "") + "minting 1000 gold " + i);
		if(!exists) {
			txs.push(instances.GoldERC20.mint(testers[i], 1000), {nonce: nonce++});
		}

		// Artifacts ERC20
		exists = !(await instances.ArtifactERC20.balanceOf(testers[i])).isZero();
		console.log((exists? "skipping ": "") + "minting 10 artifacts " + i);
		if(!exists) {
			txs.push(instances.ArtifactERC20.mint(testers[i], 10), {nonce: nonce++});
		}

		// Founder's Keys ERC20
		exists = !(await instances.FoundersKeyERC20.balanceOf(testers[i])).isZero();
		console.log((exists? "skipping ": "") + "minting 10 founder's keys " + i);
		if(!exists) {
			txs.push(instances.FoundersKeyERC20.mint(testers[i], 10), {nonce: nonce++});
		}

		// Chest Keys ERC20
		exists = !(await instances.ChestKeyERC20.balanceOf(testers[i])).isZero();
		console.log((exists? "skipping ": "") + "minting 10 chest keys " + i);
		if(!exists) {
			txs.push(instances.ChestKeyERC20.mint(testers[i], 10), {nonce: nonce++});
		}
	}

	// issue some referral points
	for(let i = 0; i < testers.length; i++) {
		// check if points already issued
		const exists = !(await instances.RefPointsTracker.balanceOf(testers[i])).isZero();

		if(!exists) {
			// issue some amount
			console.log("issuing ref points " + i);
			txs.push(instances.RefPointsTracker.issueTo(testers[i], 2000), {nonce: nonce++});
			// consume twice less amount
			console.log("consuming ref points " + i);
			txs.push(instances.RefPointsTracker.consumeFrom(testers[i], 1000), {nonce: nonce++});
		}
		else {
			console.log("skipping issuing and consuming ref points " + i);
		}
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	console.log("optional phase [mint test tokens] complete");
}


async function enablePermissions(network, accounts, conf, instances) {
	console.log("optional phase: enable permissions");

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// enable transfers and transfers on behalf for all the tokens
	// enable transfers and transfers on behalf for ArtifactERC20
	if((await instances.ArtifactERC20.features()).isZero()) {
		console.log("enabling transfers and transfers on behalf for ArtifactERC20 %o", conf.ArtifactERC20);
		txs.push(instances.ArtifactERC20.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF, {nonce: nonce++}));
	}
	// enable transfers and transfers on behalf for FoundersKeyERC20
	if((await instances.FoundersKeyERC20.features()).isZero()) {
		console.log("enabling transfers and transfers on behalf for FoundersKeyERC20 %o", conf.FoundersKeyERC20);
		txs.push(instances.FoundersKeyERC20.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF, {nonce: nonce++}));
	}
	// enable transfers and transfers on behalf for ChestKeyERC20
	if((await instances.ChestKeyERC20.features()).isZero()) {
		console.log("enabling transfers and transfers on behalf for ChestKeyERC20 %o", conf.ChestKeyERC20);
		txs.push(instances.ChestKeyERC20.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF, {nonce: nonce++}));
	}
	// enable transfers and transfers on behalf for SilverERC20
	if((await instances.SilverERC20.features()).isZero()) {
		console.log("enabling transfers and transfers on behalf for SilverERC20 %o", conf.SilverERC20);
		txs.push(instances.SilverERC20.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF, {nonce: nonce++}));
	}
	// enable transfers and transfers on behalf for GoldERC20
	if((await instances.GoldERC20.features()).isZero()) {
		console.log("enabling transfers and transfers on behalf for GoldERC20 %o", conf.GoldERC20);
		txs.push(instances.GoldERC20.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF, {nonce: nonce++}));
	}
	// enable transfers and transfers on behalf for CountryERC721
	if((await instances.CountryERC721.features()).isZero()) {
		console.log("enabling transfers and transfers on behalf for CountryERC721 %o", conf.CountryERC721);
		txs.push(instances.CountryERC721.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF, {nonce: nonce++}));
	}
	// enable transfers and transfers on behalf for PlotERC721
	if((await instances.PlotERC721.features()).isZero()) {
		console.log("enabling transfers and transfers on behalf for PlotERC721 %o", conf.PlotERC721);
		txs.push(instances.PlotERC721.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF, {nonce: nonce++}));
	}
	// enable transfers and transfers on behalf for GemERC721
	if((await instances.GemERC721.features()).isZero()) {
		console.log("enabling transfers and transfers on behalf for GemERC721 %o", conf.GemERC721);
		txs.push(instances.GemERC721.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF, {nonce: nonce++}));
	}
	console.log("transfers and transfers on behalf configuration scheduled");

	// DutchAuction.setFeeAndBeneficiary
	if((await instances.DutchAuction.fee()).isZero()) {
		console.log("setting fee and beneficiary for DutchAuction %o", conf.DutchAuction);
		txs.push(instances.DutchAuction.setFeeAndBeneficiary(1, 20, conf.Beneficiary, conf.WorldChest, {nonce: nonce++}));
	}
	// enable DutchAuction – selling (adding) and buying
	if((await instances.DutchAuction.features()).isZero()) {
		console.log("enabling add/buy features for DutchAuction %o", conf.DutchAuction);
		txs.push(instances.DutchAuction.updateFeatures(FEATURE_ADD | FEATURE_BUY, {nonce: nonce++}));
	}
	// whitelist GemERC721 on the DutchAuction
	if(!await instances.DutchAuction.supportedTokenAddresses(conf.GemERC721)) {
		console.log("whitelisting GemERC721 %o on the DutchAuction %o", conf.GemERC721, conf.DutchAuction);
		txs.push(instances.DutchAuction.whitelist(conf.GemERC721, true, {nonce: nonce++}));
	}
	console.log("DutchAuction configuration scheduled");

	// allow Workshop to destroy SilverERC20
	if((await instances.SilverERC20.userRoles(conf.Workshop)).isZero()) {
		console.log("granting Workshop %o permission to burn SilverERC20 %o", conf.Workshop, conf.SilverERC20);
		txs.push(instances.SilverERC20.updateRole(conf.Workshop, ROLE_TOKEN_DESTROYER, {nonce: nonce++}));
	}
	// allow Workshop to destroy GoldERC20
	if((await instances.GoldERC20.userRoles(conf.Workshop)).isZero()) {
		console.log("granting Workshop %o permission to burn GoldERC20 %o", conf.Workshop, conf.GoldERC20);
		txs.push(instances.GoldERC20.updateRole(conf.Workshop, ROLE_TOKEN_DESTROYER, {nonce: nonce++}));
	}
	// allow Workshop to level up and upgrade GemERC721
	if((await instances.GemERC721.userRoles(conf.Workshop)).isZero()) {
		console.log("granting Workshop %o permission to level up and upgrade GemERC721 %o", conf.Workshop, conf.GemERC721);
		txs.push(instances.GemERC721.updateRole(conf.Workshop, ROLE_LEVEL_PROVIDER | ROLE_GRADE_PROVIDER, {nonce: nonce++}));
	}
	// enable Workshop (leveling up / upgrades)
	if((await instances.Workshop.features()).isZero()) {
		console.log("enabling Workshop %o", conf.Workshop);
		txs.push(instances.Workshop.updateFeatures(FEATURE_UPGRADES_ENABLED, {nonce: nonce++}));
	}
	console.log("Workshop configuration scheduled");

	// allow SilverSale to access (rw) RefPointsTracker
	if((await instances.RefPointsTracker.userRoles(conf.SilverSale)).isZero()) {
		console.log("granting SilverSale %o permissions on RefPointsTracker %o", conf.SilverSale, conf.RefPointsTracker);
		txs.push(instances.RefPointsTracker.updateRole(conf.SilverSale, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER, {nonce: nonce++}));
	}
	// allow SilverSale to mint SilverERC20
	if((await instances.SilverERC20.userRoles(conf.SilverSale)).isZero()) {
		console.log("granting SilverSale %o permission to mint SilverERC20 %o", conf.SilverSale, conf.SilverERC20);
		txs.push(instances.SilverERC20.updateRole(conf.SilverSale, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// allow SilverSale to mint GoldERC20
	if((await instances.GoldERC20.userRoles(conf.SilverSale)).isZero()) {
		console.log("granting SilverSale %o permission to mint GoldERC20 %o", conf.SilverSale, conf.GoldERC20);
		txs.push(instances.GoldERC20.updateRole(conf.SilverSale, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// enable SilverSale (sell, get, coupons)
	if((await instances.SilverSale.features()).isZero()) {
		console.log("enabling (SELL | GET | COUPON) SilverSale %o", conf.SilverSale);
		txs.push(instances.SilverSale.updateFeatures(FEATURE_SALE_ENABLED | FEATURE_GET_ENABLED | FEATURE_USING_COUPONS_ENABLED, {nonce: nonce++}));
	}
	console.log("SilverSale configuration scheduled");

	// allow PlotSale to access (rw) RefPointsTracker
	if((await instances.RefPointsTracker.userRoles(conf.PlotSale)).isZero()) {
		console.log("granting PlotSale %o permissions on RefPointsTracker %o", conf.PlotSale, conf.RefPointsTracker);
		txs.push(instances.RefPointsTracker.updateRole(conf.PlotSale, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER, {nonce: nonce++}));
	}
	// allow PlotSale to mint PlotERC721
	if((await instances.PlotERC721.userRoles(conf.PlotSale)).isZero()) {
		console.log("granting PlotSale %o permission to mint PlotERC721 %o", conf.PlotSale, conf.PlotERC721);
		txs.push(instances.PlotERC721.updateRole(conf.PlotSale, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// enable PlotSale (sell, get, coupons)
	if((await instances.PlotSale.features()).isZero()) {
		console.log("enabling (SELL | GET | COUPON) PlotSale %o", conf.PlotSale);
		txs.push(instances.PlotSale.updateFeatures(FEATURE_SALE_ENABLED | FEATURE_GET_ENABLED | FEATURE_USING_COUPONS_ENABLED, {nonce: nonce++}));
	}
	console.log("PlotSale configuration scheduled");

	// allow PlotAntarctica to mint PlotERC721
	if((await instances.PlotERC721.userRoles(conf.PlotAntarctica)).isZero()) {
		console.log("granting PlotAntarctica %o permission to mint PlotERC721 %o", conf.PlotAntarctica, conf.PlotERC721);
		txs.push(instances.PlotERC721.updateRole(conf.PlotAntarctica, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// enable PlotAntarctica (getting founder's plots in Antarctica)
	if((await instances.PlotAntarctica.features()).isZero()) {
		console.log("enabling PlotAntarctica %o", conf.PlotAntarctica);
		txs.push(instances.PlotAntarctica.updateFeatures(FEATURE_ANTARCTICA_GET_ENABLED, {nonce: nonce++}));
	}
	console.log("PlotAntarctica configuration scheduled");

	// allow Miner to mint ArtifactERC20
	if((await instances.ArtifactERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner %o permission to mint ArtifactERC20 %o", conf.Miner, conf.ArtifactERC20);
		txs.push(instances.ArtifactERC20.updateRole(conf.Miner, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// allow Miner to mint FoundersKeyERC20
	if((await instances.FoundersKeyERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner %o permission to mint FoundersKeyERC20 %o", conf.Miner, conf.FoundersKeyERC20);
		txs.push(instances.FoundersKeyERC20.updateRole(conf.Miner, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// allow Miner to mint ChestKeyERC20
	if((await instances.ChestKeyERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner %o permission to mint ChestKeyERC20 %o", conf.Miner, conf.ChestKeyERC20);
		txs.push(instances.ChestKeyERC20.updateRole(conf.Miner, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// allow Miner to mint SilverERC20
	if((await instances.SilverERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner %o permission to mint SilverERC20 %o", conf.Miner, conf.SilverERC20);
		txs.push(instances.SilverERC20.updateRole(conf.Miner, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// allow Miner to mint GoldERC20
	if((await instances.GoldERC20.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner %o permission to mint GoldERC20 %o", conf.Miner, conf.GoldERC20);
		txs.push(instances.GoldERC20.updateRole(conf.Miner, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// allow Miner to update PlotERC721
	if((await instances.PlotERC721.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner %o permission to update PlotERC721 %o", conf.Miner, conf.PlotERC721);
		txs.push(instances.PlotERC721.updateRole(conf.Miner, ROLE_STATE_PROVIDER | ROLE_OFFSET_PROVIDER, {nonce: nonce++}));
	}
	// allow Miner to update GemERC721
	if((await instances.GemERC721.userRoles(conf.Miner)).isZero()) {
		console.log("granting Miner %o permission to mint and update GemERC721 %o", conf.Miner, conf.GemERC721);
		txs.push(instances.GemERC721.updateRole(conf.Miner, ROLE_TOKEN_CREATOR | ROLE_NEXT_ID_PROVIDER | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_MINED_STATS_PROVIDER, {nonce: nonce++}));
	}
	// enable Miner (mining)
	if((await instances.Miner.features()).isZero()) {
		console.log("enabling Miner %o", conf.Miner);
		txs.push(instances.Miner.updateFeatures(FEATURE_MINING_ENABLED, {nonce: nonce++}));
	}
	console.log("Miner configuration scheduled");

	// allow MintHelper to update GemERC721
	if((await instances.GemERC721.userRoles(conf.MintHelper)).isZero()) {
		console.log("granting MintHelper %o permission to mint GemERC721 %o", conf.MintHelper, conf.GemERC721);
		txs.push(instances.GemERC721.updateRole(conf.MintHelper, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}
	// allow John to use MintHelper
	if((await instances.MintHelper.userRoles(SRV_ADDR.JOHN)).isZero()) {
		console.log("granting John %o permission to use MintHelper %o", SRV_ADDR.JOHN, conf.MintHelper);
		txs.push(instances.MintHelper.updateRole(SRV_ADDR.JOHN, ROLE_MINT_OPERATOR, {nonce: nonce++}));
	}
	// allow Roman to use MintHelper in test networks
	if(network && network !== "mainnet" && (await instances.MintHelper.userRoles(SRV_ADDR.ROMAN)).isZero()) {
		console.log("granting Roman %o permission to use MintHelper %o", SRV_ADDR.ROMAN, conf.MintHelper);
		txs.push(instances.MintHelper.updateRole(SRV_ADDR.ROMAN, ROLE_MINT_OPERATOR, {nonce: nonce++}));
	}
	console.log("MintHelper configuration scheduled");

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

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
	// pack gem ID, plot ID (not used), color, level, grade, energetic age and return
	return p[0].shln(24).or(p[1]).shln(8).or(p[2]).shln(8).or(p[3]).shln(32).or(p[4]).shln(32).or(p[7]);
}

// waits for all transactions in the array and outputs gas usage stats
async function waitForAll(txs) {
	// wait for all pending transactions and gather results
	if(txs.length > 0) {
		// track cumulative gas usage
		let cumulativeGasUsed = 0;

		console.log("\twaiting for %o transactions to complete", txs.length);

		for(const tx of (await Promise.all(txs))) {
			// measure gas used
			const gasUsed = (tx.receipt? tx.receipt: await web3.eth.getTransactionReceipt(tx.transactionHash)).gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log("\ttransaction complete, %o gas used", gasUsed);
		}

		// log cumulative gas used
		console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
	}
}

// all ERC20 tokens have same processing logic, only CSV file name differs
async function processERC20Data(file_name, token, writer, accounts) {
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

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// grant writer permission to mint gems and set energetic age
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("\tgranting Writer %o permission to mint ERC20 token %o", writer.address, token.address);
		txs.push(token.updateRole(writer.address, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}

	// check if tokens are already written
	if((await token.balanceOf(data[0][0])).isZero()) {
		// schedule writing all token ownerships
		console.log("\twriting %o token ownerships, nonce %o", data.length, nonce);
		txs.push(writer.writeERC20Data(token.address, data.map(packERC20Data), {nonce: nonce++}));
	}
	else {
		console.log("\t%o record(s) skipped", data.length);
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used
	if(!(await token.userRoles(writer.address)).isZero()) {
		console.log("\trevoking Writer %o permission to mint ERC20 token %o", writer.address, token.address);
		await token.updateRole(writer.address, 0);
	}
}

// aux function to write referral points data
async function writeRefPoints(tracker, writer, accounts) {
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

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// grant writer permission to issue and consume referral points
	if((await tracker.userRoles(writer.address)).isZero()) {
		console.log("\tgranting Writer %o permission to update RefPointsTracker %o, nonce %o", writer.address, tracker.address, nonce);
		txs.push(tracker.updateRole(writer.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER, {nonce: nonce++}));
	}

	// check if ref points are already written
	if(!await tracker.isKnown(data[0][3])) {
		// schedule writing all ref points
		console.log("\twriting %o ref points, nonce %o", data.length, nonce);
		txs.push(writer.writeRefPointsData(tracker.address, data.map(packRefData), {nonce: nonce++}));
	}
	else {
		console.log("\t%o record(s) skipped", data.length);
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used - sync mode
	if(!(await tracker.userRoles(writer.address)).isZero()) {
		console.log("\trevoking Writer %o permission to update RefPointsTracker %o", writer.address, tracker.address);
		await tracker.updateRole(writer.address, 0);
	}
}

// aux function to write referral points data
async function writeKnownAddresses(tracker, writer, accounts) {
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

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];
	// grant writer permission to add known addresses
	if((await tracker.userRoles(writer.address)).isZero()) {
		console.log("\tgranting Writer %o permission to update RefPointsTracker %o, nonce %o", writer.address, tracker.address, nonce);
		txs.push(tracker.updateRole(writer.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER, {nonce: nonce++}));
	}

	// iterate the arrays in bulks
	const bulkSize = 100;
	for(let offset = 0; offset < data.length; offset += bulkSize) {
		// extract portion of owners array
		const data_to_write = data.slice(offset, offset + bulkSize).map(packRefData);

		// check if ref points are already written
		if(!await tracker.isKnown(data[offset][3])) {
			// schedule writing all the known addresses
			console.log("\twriting %o known addresses at offset %o, nonce %o", data_to_write.length, offset, nonce);
			txs.push(writer.writeKnownAddrData(tracker.address, data_to_write, {nonce: nonce++}));
		}
		else {
			console.log("\t%o record(s) skipped", Math.min(bulkSize, data.length - offset));
		}
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used - sync mode
	if(!(await tracker.userRoles(writer.address)).isZero()) {
		console.log("\trevoking Writer %o permission to update RefPointsTracker %o", writer.address, tracker.address);
		await tracker.updateRole(writer.address, 0);
	}
}

// aux function to write CountryERC721 data
async function writeCountryERC721Data(token, writer, accounts) {
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

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// grant writer permission to mint countries
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("\tgranting Writer %o permission to mint CountryERC721 %o, nonce %o", writer.address, token.address, nonce);
		txs.push(token.updateRole(writer.address, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}

	// iterate the arrays in bulks
	const bulkSize = 64;
	for(let offset = 0; offset < owners.length; offset += bulkSize) {
		// extract portion of owners array
		const owners_to_write = owners.slice(offset, offset + bulkSize);

		// check token existence at the offset
		if(!await token.exists(offset + 1)) {
			// schedule writing all the tokens
			console.log("\twriting %o tokens at offset %o, nonce %o", owners_to_write.length, offset, nonce);
			txs.push(writer.writeCountryV2Data(token.address, offset, owners_to_write, {nonce: nonce++}));
		}
		else {
			// log the message
			console.log("\t%o token(s) skipped", Math.min(bulkSize, owners.length - offset));
		}
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used - sync mode
	if(!(await token.userRoles(writer.address)).isZero()) {
		console.log("\trevoking Writer %o permission to mint CountryERC721 %o", writer.address, token.address);
		await token.updateRole(writer.address, 0);
	}
}

// aux function to write GemERC721 data
async function writeGemERC721Data(file_name, token, writer, accounts) {
	// CSV header
	const csv_header = "tokenId,plotId,color,level,grade,grade type,grade value,age,owner";
	// read CSV data
	const csv_data = read_csv(`./data/${file_name}`, csv_header);
	console.log("\t%o bytes CSV data read from %o", file_name, csv_data.length);

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

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// grant writer permission to mint gems and set energetic age
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("\tgranting Writer %o permission to mint GemERC721 %o, nonce %o",  writer.address, token.address, nonce);
		txs.push(token.updateRole(writer.address, ROLE_TOKEN_CREATOR | ROLE_AGE_PROVIDER, {nonce: nonce++}));
	}

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
			// schedule writing all the tokens
			console.log("\twriting %o tokens at offset %o, nonce %o", owners_to_write.length, offset, nonce);
			txs.push(writer.writeBulkGemV2Data(token.address, owners_to_write, gems_to_write, {nonce: nonce++}));
		}
		else {
			// log the message
			console.log("\t%o token(s) skipped", Math.min(bulkSize, owners.length - offset));
		}
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used - sync mode
	if(!(await token.userRoles(writer.address)).isZero()) {
		console.log("\trevoking Writer %o permission to mint GemERC721 %o", writer.address, token.address);
		await token.updateRole(writer.address, 0);
	}
}


// TODO: country data must be imported from country_data.js
const COUNTRY_DATA = [62920,36777,35261,35084,31367,28333,12108,10241,10037,8773,8639,7978,7918,7236,7015,6857,6481,6070,5764,4734,4729,4667,4592,4567,4493,4411,4152,4046,3796,3689,3481,3403,3359,3040,2961,2953,2875,2788,2772,2499,2488,2385,2349,2295,2283,2223,2211,2162,2138,1945,1893,1859,1798,1751,1705,1657,1648,1645,1610,1498,1439,1392,1315,1260,1241,1215,1214,1194,1188,1152,1140,1110,1105,1044,1010,992,986,906,897,890,879,878,872,792,765,731,723,682,667,649,603,601,544,542,527,486,477,447,444,436,415,413,410,409,405,401,379,363,343,340,336,325,319,309,305,290,288,268,263,257,242,240,238,209,208,188,188,180,179,173,167,159,157,152,133,133,125,120,112,110,106,105,103,103,102,99,97,93,85,81,77,75,67,66,64,55,51,51,45,42,42,40,38,34,21,19,15,11,10,8,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5];

// auxiliary function to write data into CSV file
// appends data if CSV file already exists
// TODO: import from shared_functions.js
function write_csv(path, header, data) {
	fs.writeFileSync(path, `${header}\n${data}`, {encoding: "utf8"});
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
