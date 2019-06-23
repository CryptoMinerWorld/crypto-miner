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
			ArtifactERC20:      "0xa14F80E7F7333122B634Fea9EA5990C53100fDa0",
			FoundersKeyERC20:   "0x9bBEE0dA678FcDdf30b4D7e8434FeC3D45b4694F",
			ChestKeyERC20:      "0x00D14DFB6a5A0a240700C563A732e71cDD2FF455",
			SilverERC20:        "0xB373E86e650236CAf952F6cdE206dfe196FeEC35",
			GoldERC20:          "0xbE713aC93fF6d7e0dA88e024DC9Cf0d5D05c3A5A",
			PlotERC721:         "0x33369f4870703489CE21B8BeF92ADa5820b5ffED",
			GemERC721:          "0x8ad156dA5ea1053D4858987Ca1165151B5702479",
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
