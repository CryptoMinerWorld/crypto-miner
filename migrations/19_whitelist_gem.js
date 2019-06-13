// ABIs Required
const DutchAuction = artifacts.require("./DutchAuction");
const GemERC721 = artifacts.require("./GemERC721");

// Features and Roles required to be enabled
const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

// Whitelisting gem on Dutch Auction
module.exports = async function(deployer, network, accounts) {
	if (network === "test") {
		console.log("[whitelist gem] test network - skipping the migration script");
		return;
	}
	if (network === "coverage") {
		console.log("[whitelist gem] coverage network - skipping the migration script");
		return;
	}

	// smart contracts configuration
	const conf = network === "mainnet"?
		{ // Mainnet addresses

		}:
		{ // Ropsten addresses
			DutchAuction:       "0x1D6f61dAeCB9ccbf5b5a61D9cD68d96DAdd0Bb1C",
			GemERC721:          "0xFe71e1d0c1f678b94B5fa7542071CfFE2DEa4E31",
		};

	// for test network whitelist the gem automatically
	if(network !== "mainnet") {
		// get links to deployed instances
		const instances = {
			DutchAuction: await DutchAuction.at(conf.DutchAuction),
			GemERC721: await GemERC721.at(conf.GemERC721),
		};

		console.log("enabling transfers and transfers on behalf for GemERC721");
		await instances.GemERC721.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		console.log("whitelisting GemERC721 smart contract address on the auction");
		await instances.DutchAuction.whitelist(conf.GemERC721, true);
	}

};
