const FEATURE_ADD = 0x00000001;
const FEATURE_BUY = 0x00000002;

const Auction = artifacts.require("./DutchAuction");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy dutch auction] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy dutch auction] coverage network - skipping the migration script");
		return;
	}

	// token is already deployed into all possible networks
	let tokenAddress = "0xeAe9d154dA7a1cD05076dB1B83233f3213a95e4F"; // mainnet
	if(network !== "mainnet") {
		tokenAddress = "0x82FF6Bbd7B64f707e704034907d582C7B6E09d97"; // rinkeby
		if(network === "ropsten") {
			tokenAddress = "0x35B5dA40008B225AB540dbBF28D2B5e74836DF2c"; // ropsten
		}
	}

	// where the fee goes to: beneficiary - 80%, chestVault - 20%
	let beneficiary = "0xe0123204873fd29a29aef3f99faf1b1c45fe3b1e"; // MainNet MultiSig
	let chestVault = "0x2906da90d3f99d5913bb3461183682951ca7280c"; // MainNet World Chest Wallet

	// for test network we redefine MultiSig addresses and launch date
	if(network !== "mainnet") {
		// beneficiary = "0xb4e8e4f7e6024b37ed2584e8c86b2917dae9a2da"; // Rinkeby MultiSig
		// chestVault = "0xaF8413e5785d63694cF562Cf2dDA9B59Ff00E0FD"; // Rinkeby Chest Wallet
		beneficiary = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
		chestVault = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
	}

	// deploy an auction
	await deployer.deploy(Auction);
	const auction = await Auction.deployed();

	// set the fee - 5%
	await auction.setFeeAndBeneficiary(1, 20, beneficiary, chestVault);

	// whitelist the token address - auction will support GemERC721
	await auction.whitelist(tokenAddress, true);

	// allow adding tokens to an auction and buying them
	await auction.updateFeatures(FEATURE_ADD | FEATURE_BUY);

	console.log("______________________________________________________");
	console.log("token:   " + tokenAddress);
	console.log("auction: " + auction.address);
};
