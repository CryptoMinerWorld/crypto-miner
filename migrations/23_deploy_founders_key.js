// Founder's Chest Key ERC20 Token
const Token = artifacts.require("./FoundersKeyERC20");

// Features and Roles:
// Enables ERC20 transfers of the tokens (transfer by the token owner himself)
const FEATURE_TRANSFERS = 0x00000001;
// Enables ERC20 transfers on behalf (transfer by someone else on behalf of token owner)
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

// Founder's Chest Key ERC20 Token Deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy founders_key] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy founders_key] coverage network - skipping the migration script");
		return;
	}

	// deploy FoundersKeyERC20 token
	await deployer.deploy(Token);
	const token = await Token.deployed();
	const tokenAddress = token.address;

	// for test networks:
	if(network !== "mainnet") {
		// enable transfers and transfers on behalf
		await token.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
	}

	console.log("________________________________________________________________________");
	console.log("founder's key: " + tokenAddress);
	console.log("supply:        " + await token.totalSupply());

};
