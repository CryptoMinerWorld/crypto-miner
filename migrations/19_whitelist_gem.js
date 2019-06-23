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
			DutchAuction:       "0x18D916BBDaABFd63384Bb8C4EAdFcd98b53B78eF",
			GemERC721:          "0x8ad156dA5ea1053D4858987Ca1165151B5702479",
		};

	// for test network whitelist the gem automatically
	if(network !== "mainnet") {
		// get links to deployed instances
		const instances = {
			DutchAuction: await DutchAuction.at(conf.DutchAuction),
			GemERC721: await GemERC721.at(conf.GemERC721),
		};

		console.log("enabling transfers and transfers on behalf for GemERC721 " + conf.GemERC721);
		await instances.GemERC721.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		console.log("whitelisting GemERC721 smart contract address on the auction " + conf.DutchAuction);
		await instances.DutchAuction.whitelist(conf.GemERC721, true);

		console.log("execution complete");
	}

};
