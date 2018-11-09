const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_COUPON_MANAGER = 0x00000100;

const Gem = artifacts.require("./GemERC721");
const AddressUtils = artifacts.require("./AddressUtils");
const StringUtils = artifacts.require("./StringUtils");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy gem] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy gem] coverage network - skipping the migration script");
		return;
	}

	// token and presale address already exist, presale 2 is new to deploy
	let tokenAddress = "0xeAe9d154dA7a1cD05076dB1B83233f3213a95e4F"; // MainNet token address
	let saleAddress = "0xa207d2496688134f538a307b25E174b267bA6765"; // MainNet Presale address
	let gem = Gem.at(tokenAddress);

	// for test network we redeploy the Gem
	if(network !== "mainnet") {
		console.log("deploying Gem (development network)");
		await deployer.deploy(AddressUtils);
		await deployer.link(AddressUtils, Gem);

		await deployer.deploy(StringUtils);
		await deployer.link(StringUtils, Gem);

		await deployer.deploy(Gem);
		gem = await Gem.deployed();
		tokenAddress = gem.address;
	}
	// for MainNet we need to revoke old presale permission to mint gems
	else {
		await gem.removeOperator(saleAddress);
	}

	console.log("______________________________________________________");
	console.log("gem:        " + tokenAddress);
	console.log("supply:     " + await gem.totalSupply());
	console.log("gems:       " + await gem.balanceOf(accounts[0]));

};
