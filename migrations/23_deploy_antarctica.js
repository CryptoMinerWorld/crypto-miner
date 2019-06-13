// Plot Antarctica dependencies
const FoundersPlots = artifacts.require("./FoundersPlots");
const FoundersPlotsMock = artifacts.require("./FoundersPlotsMock");
const PlotERC721 = artifacts.require("./PlotERC721");

// Plot Antarctica
const PlotAntarctica = artifacts.require("./PlotAntarctica");

// Features and Roles required to be enabled
const FEATURE_GET_ENABLED = 0x00000001;
const ROLE_TOKEN_CREATOR = 0x00000001;

// main section of the script, blockchain interaction
module.exports = async function(deployer, network, accounts) {
	if (network === "test") {
		console.log("[deploy Antarctica] test network - skipping the migration script");
		return;
	}
	if (network === "coverage") {
		console.log("[deploy Antarctica] coverage network - skipping the migration script");
		return;
	}

	// deployed instances' addresses and external addresses
	const conf = network === "mainnet"?
		{ // Mainnet addresses
			FoundersPlots:      "0xE0A21044eEeB9efC340809E35DC0E9d82Dc87DD1",
		}:
		{ // Ropsten Addresses
			FoundersPlots:      "0xA7EAd1a2e9Ee57b97Fd0D96ce480a39C40ed67E9",
			PlotERC721:         "0x1C3634f7345fd3f3884C5D6FF1F96E16A69b40Ea",
		};


	// for test network if FoundersPlots is missing we deploy a mock
	if(network !== "mainnet" && !conf.FoundersPlots) {
		await deployer.deploy(FoundersPlotsMock);
		conf.FoundersPlots = (await FoundersPlotsMock.deployed()).address;
	}

	// deploy Antarctica
	await deployer.deploy(PlotAntarctica, conf.FoundersPlots, conf.PlotERC721);
	const antarctica = await PlotAntarctica.deployed();

	// for test networks set all permissions automatically
	if(network !== "mainnet") {
		// get links to deployed instances
		const instances = {
			PlotERC721: await PlotERC721.at(conf.PlotERC721),
		};

		// enable all features and roles required
		console.log("updating plot access for Antarctica");
		await instances.PlotERC721.updateRole(antarctica.address, ROLE_TOKEN_CREATOR);
		console.log("updating Antarctica features");
		await antarctica.updateFeatures(FEATURE_GET_ENABLED);
	}
};
