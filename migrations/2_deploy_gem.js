const ROLE_TOKEN_CREATOR = 0x00040000;

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy gem] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy gem] coverage network - skipping the migration script");
		return;
	}

	const Gem = artifacts.require("./GemERC721");
	const Sale = artifacts.require("./Presale");

	await deployer.deploy(Gem);

	const gem = await Gem.deployed();
	await gem.updateFeatures(0xFFFFFFFF);

	await deployer.deploy(Sale, gem.address, accounts[0]);

	const sale = await Sale.deployed();
	await gem.addOperator(sale.address, ROLE_TOKEN_CREATOR);

	console.log("___________________________________________________");
	console.log("gem:        " + gem.address);
	console.log("sale:       " + sale.address);

};
