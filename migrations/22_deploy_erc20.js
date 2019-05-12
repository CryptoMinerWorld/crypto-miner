// Artifact ERC20 Token
const ArtifactERC20 = artifacts.require("./ArtifactERC20");
// Founder's Chest Key ERC20 Token
const FoundersKeyERC20 = artifacts.require("./FoundersKeyERC20");
// Chest Key ERC20 Token
const ChestKeyERC20 = artifacts.require("./ChestKeyERC20");

// Features and Roles:
// Enables ERC20 transfers of the tokens (transfer by the token owner himself)
const FEATURE_TRANSFERS = 0x00000001;
// Enables ERC20 transfers on behalf (transfer by someone else on behalf of token owner)
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

// Artifact ERC20 Token, Founder's Chest Key ERC20 Token, Chest Key ERC20 Token Deployments
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy erc20] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy erc20] coverage network - skipping the migration script");
		return;
	}

	// deploy ArtifactERC20 token
	await deployer.deploy(ArtifactERC20);
	const artifact20 = await ArtifactERC20.deployed();
	const artifact20Address = artifact20.address;

	// deploy FoundersKeyERC20 token
	await deployer.deploy(FoundersKeyERC20);
	const foundersKey = await FoundersKeyERC20.deployed();
	const foundersKeyAddress = foundersKey.address;

	// deploy ChestKeyERC20 token
	await deployer.deploy(ChestKeyERC20);
	const chestKey = await ChestKeyERC20.deployed();
	const chestKeyAddress = chestKey.address;

	// for test networks:
	if(network !== "mainnet") {
		// enable transfers and transfers on behalf
		await artifact20.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await foundersKey.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await chestKey.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
	}

	console.log("________________________________________________________________________");
	console.log("artifact (20): " + artifact20Address);
	console.log("supply:        " + await artifact20.totalSupply());
	console.log("founder's key: " + foundersKeyAddress);
	console.log("supply:        " + await foundersKey.totalSupply());
	console.log("chest key:     " + chestKeyAddress);
	console.log("supply:        " + await chestKey.totalSupply());

};
