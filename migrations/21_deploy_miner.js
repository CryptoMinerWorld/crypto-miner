// Miner dependencies
const GemERC721 = artifacts.require("./GemERC721");
const PlotERC721 = artifacts.require("./PlotERC721");
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");
const ArtifactERC20 = artifacts.require("./ArtifactERC20");
const ChestKeyERC20 = artifacts.require("./ChestKeyERC20");
const FoundersKeyERC20 = artifacts.require("./FoundersKeyERC20");

// Miner smart contract
const Miner = artifacts.require("./Miner");

// Features and Roles required to be enabled
const FEATURE_MINING_ENABLED = 0x00000001;
const ROLE_TOKEN_CREATOR = 0x00000001;
const ROLE_STATE_PROVIDER = 0x00000010;
const ROLE_OFFSET_PROVIDER = 0x00000040;
const ROLE_AGE_PROVIDER = 0x00000100;
const ROLE_MINED_STATS_PROVIDER = 0x00000200;
const ROLE_NEXT_ID_INC = 0x00001000;

// main section of the script, blockchain interaction
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy miner] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy miner] coverage network - skipping the migration script");
		return;
	}

	// deployed instances' addresses
	const conf = network === "mainnet"?
		{ // Mainnet addresses

		}:
		{ // Ropsten Addresses
			ArtifactERC20:      "0x06D09B097D56B5DEB70C31eaa5802d6447913eeC",
			FoundersKeyERC20:   "0x901E6a702D832Cff1356639F4a99046aB4cE4bCa",
			ChestKeyERC20:      "0x604206004488Aa28F5b57dfF4BF3d235cec63234",
			SilverERC20:        "0x7EDC3fea733E790814e3c2A9D997A55f531D8868",
			GoldERC20:          "0x41FecF81B49B9Bc3eC80EdDdffe266922Ff2BD1f",
			PlotERC721:         "0x1C3634f7345fd3f3884C5D6FF1F96E16A69b40Ea",
			GemERC721:          "0xBe3076e7Ab71c78Db1F0CC79209CA4ef2fee0B89",
		};

	// deployed instances
	// deploy workshop
	await deployer.deploy(
		Miner,
		conf.GemERC721,
		conf.PlotERC721,
		conf.GemERC721, // ArtifactERC721
		conf.SilverERC20,
		conf.GoldERC20,
		conf.ArtifactERC20,
		conf.FoundersKeyERC20,
		conf.ChestKeyERC20,
	);

	// for test network assign permissions automatically
	if(network !== "mainnet") {
		// get links to deployed instances
		const instances = {
			ArtifactERC20: await ArtifactERC20.at(conf.ArtifactERC20),
			ChestKeyERC20: await ChestKeyERC20.at(conf.ChestKeyERC20),
			FoundersKeyERC20: await FoundersKeyERC20.at(conf.FoundersKeyERC20),
			SilverERC20: await SilverERC20.at(conf.SilverERC20),
			GoldERC20: await GoldERC20.at(conf.GoldERC20),
			ArtifactC721: await GemERC721.at(conf.GemERC721), // ArtifactERC721
			PlotERC721: await PlotERC721.at(conf.PlotERC721),
			GemERC721: await GemERC721.at(conf.GemERC721),
		};

		// enable all features and roles required
		const miner = await Miner.deployed();
		console.log("updating artifact access");
		await instances.ArtifactERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		console.log("updating founder's key access");
		await instances.FoundersKeyERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		console.log("updating chest key access");
		await instances.ChestKeyERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		console.log("updating silver access");
		await instances.SilverERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		console.log("updating gold access");
		await instances.GoldERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		console.log("updating plot access");
		await instances.PlotERC721.updateRole(miner.address, ROLE_STATE_PROVIDER | ROLE_OFFSET_PROVIDER);
		console.log("updating gem access");
		await instances.GemERC721.updateRole(miner.address, ROLE_TOKEN_CREATOR | ROLE_NEXT_ID_INC | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_MINED_STATS_PROVIDER);
		console.log("updating miner features");
		await miner.updateFeatures(FEATURE_MINING_ENABLED);

		console.log("execution complete");
	}
};
