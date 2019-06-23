// ERC721 and ERC20 Token smart contracts
const GemERC721 = artifacts.require("./GemERC721");
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");

// Workshop smart contract
const Workshop = artifacts.require("./Workshop");

// Features and Roles required to be enabled
const FEATURE_UPGRADES_ENABLED = 0x00000001;
const ROLE_TOKEN_DESTROYER = 0x00000002;
const ROLE_LEVEL_PROVIDER = 0x00000040;
const ROLE_GRADE_PROVIDER = 0x00000080;

// main section of the script, blockchain interaction
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy workshop] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy workshop] coverage network - skipping the migration script");
		return;
	}

	// token dependency configuration
	const conf = network === "mainnet"?
		{ // Mainnet addresses

		}:
		{ // Ropsten addresses
			SilverERC20:        "0xB373E86e650236CAf952F6cdE206dfe196FeEC35",
			GoldERC20:          "0xbE713aC93fF6d7e0dA88e024DC9Cf0d5D05c3A5A",
			GemERC721:          "0x8ad156dA5ea1053D4858987Ca1165151B5702479",
		};

	// deploy workshop
	await deployer.deploy(Workshop, conf.GemERC721, conf.SilverERC20, conf.GoldERC20);

	// for test network assign permissions automatically
	if(network !== "mainnet") {
		// get links to deployed instances
		const instances = {
			SilverERC20: await SilverERC20.at(conf.SilverERC20),
			GoldERC20: await GoldERC20.at(conf.GoldERC20),
			GemERC721: await GemERC721.at(conf.GemERC721),
		};

		const workshop = await Workshop.deployed();
		console.log("updating silver access " + conf.SilverERC20);
		await instances.SilverERC20.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		console.log("updating gold access " + conf.GoldERC20);
		await instances.GoldERC20.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		console.log("updating gem access " + conf.GemERC721);
		await instances.GemERC721.updateRole(workshop.address, ROLE_LEVEL_PROVIDER | ROLE_GRADE_PROVIDER);
		console.log("enabling workshop features " + workshop.address);
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);

		console.log("execution complete");
	}
};
