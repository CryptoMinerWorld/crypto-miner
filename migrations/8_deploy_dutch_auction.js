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

	let tokenAddress = "0xeae9d154da7a1cd05076db1b83233f3213a95e4f"; // mainnet
	if(network !== "mainnet") {
		tokenAddress = "0x82ff6bbd7b64f707e704034907d582c7b6e09d97"; // rinkeby
		if(network === "ropsten") {
			tokenAddress = "0x35b5da40008b225ab540dbbf28d2b5e74836df2c"; // ropsten
		}
	}

	await deployer.deploy(Auction);
	const auction = await Auction.deployed();
	await auction.whitelist(tokenAddress, true);
	await auction.updateFeatures(FEATURE_ADD | FEATURE_BUY);

	console.log("______________________________________________________");
	console.log("token:   " + tokenAddress);
	console.log("auction: " + auction.address);
};
