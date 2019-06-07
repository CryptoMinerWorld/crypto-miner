// ERC721 and ERC20 Token smart contracts
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
const ROLE_TOKEN_CREATOR = 0x00000001;

// Miner smart contract deployment
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
			GemERC721:          "0x766870343381b6A1bDD09d9d1c6F3E5BdfF5438B",
			PlotERC721:         "0x4ED45BeC5762aB8b191Dd978db5609a53F21576f",
			SilverERC20:        "0x7EDC3fea733E790814e3c2A9D997A55f531D8868",
			GoldERC20:          "0x41FecF81B49B9Bc3eC80EdDdffe266922Ff2BD1f",
			ArtifactERC20:      "0x06D09B097D56B5DEB70C31eaa5802d6447913eeC",
			ChestKeyERC20:      "0x604206004488Aa28F5b57dfF4BF3d235cec63234",
			FoundersKeyERC20:   "0x901E6a702D832Cff1356639F4a99046aB4cE4bCa",
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
			GemERC721: await GemERC721.at(conf.GemERC721),
			PlotERC721: await PlotERC721.at(conf.PlotERC721),
			ArtifactC721: await GemERC721.at(conf.GemERC721), // ArtifactERC721
			SilverERC20: await SilverERC20.at(conf.SilverERC20),
			GoldERC20: await GoldERC20.at(conf.GoldERC20),
			ArtifactERC20: await ArtifactERC20.at(conf.ArtifactERC20),
			ChestKeyERC20: await ChestKeyERC20.at(conf.ChestKeyERC20),
			FoundersKeyERC20: await FoundersKeyERC20.at(conf.FoundersKeyERC20),
		};

		const miner = await Miner.deployed();
		await instances.GemERC721.updateRole(miner.address, 0x00000311); // ROLE_TOKEN_CREATOR | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_NEXT_ID_INC
		await instances.PlotERC721.updateRole(miner.address, 0x00000050); // ROLE_STATE_PROVIDER | ROLE_OFFSET_PROVIDER
		await instances.SilverERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		await instances.GoldERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		await instances.ArtifactERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		await instances.ChestKeyERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		await instances.FoundersKeyERC20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		await miner.updateFeatures(0x00000001); // FEATURE_MINING_ENABLED
	}
};
