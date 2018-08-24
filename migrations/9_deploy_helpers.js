const METADATA_OPERATOR = 0x00000001;
const MINT_OPERATOR = 0x00000001;
const ROLE_TOKEN_CREATOR = 0x00040000;

const Gem = artifacts.require("./GemERC721");
const MetadataStorage = artifacts.require("./MetadataStorage");
const MintHelper = artifacts.require("./MintHelper");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy helpers] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy helpers] coverage network - skipping the migration script");
		return;
	}

	// token is already deployed in both networks
	let tokenAddress = "0xeae9d154da7a1cd05076db1b83233f3213a95e4f"; // MainNet token address
	if(network === "development") {
		tokenAddress = "0x82ff6bbd7b64f707e704034907d582c7b6e09d97"; // Rinkeby token address
	}
	// bind gem instance
	const gem = Gem.at(tokenAddress);

	// deploy metadata storage
	await deployer.deploy(MetadataStorage, tokenAddress);
	const storage = await MetadataStorage.deployed();

	// deploy mint helper
	await deployer.deploy(MintHelper, tokenAddress);
	const mintHelper = await MintHelper.deployed();

	// grant the mint helper instance a permission to mint gems
	await gem.addOperator(mintHelper.address, ROLE_TOKEN_CREATOR);

	// grant permissions to create gems and store metadata
	await storage.addOperator("0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", METADATA_OPERATOR); // John
	await mintHelper.addOperator("0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", MINT_OPERATOR); // John
	if(network === "development") {
		// additionally add Josh on development network
		await storage.addOperator("0xd9b74f73d933fde459766f74400971b29b90c9d2", METADATA_OPERATOR); // Josh
		await mintHelper.addOperator("0xd9b74f73d933fde459766f74400971b29b90c9d2", MINT_OPERATOR); // Josh
	}


	console.log("______________________________________________________");
	console.log("gem:              " + tokenAddress);
	console.log("metadata storage: " + storage.address);
	console.log("mint helper:      " + mintHelper.address);
};
