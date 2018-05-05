module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy gem] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy gem] coverage network - skipping the migration script");
		return;
	}

	const Gem = artifacts.require("./Gem");
	const Sale = artifacts.require("./GeodeSale");

	await deployer.deploy(Gem);

	const gem = await Gem.deployed();
	await gem.updateFeatures(0xFFFFFFFF);

	await deployer.deploy(Sale, gem.address, accounts[0]);

	const sale = await Sale.deployed();
	await gem.createOperator(sale.address, 0x00010000);
};
