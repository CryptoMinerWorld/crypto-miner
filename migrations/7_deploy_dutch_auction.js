const Auction = artifacts.require("./DutchAuction");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy gem] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy gem] coverage network - skipping the migration script");
		return;
	}

	let tokenAddress = "0xeae9d154da7a1cd05076db1b83233f3213a95e4f"; // mainnet
	if(network === "development") {
		tokenAddress = "0x82ff6bbd7b64f707e704034907d582c7b6e09d97"; // rinkeby
	}

	await deployer.deploy(Auction, tokenAddress);
	const auction = await Auction.deployed();

	console.log("______________________________________________________");
	console.log("token:   " + tokenAddress);
	console.log("auction: " + auction.address);
};
