const Gem = artifacts.require("./Gem");

module.exports = async function(deployer, network, accounts) {
	if(network !== 'development') {
		return;
	}

	await deployer.deploy(Gem);
	const gem = await Gem.deployed();
	let features = await gem.features();
	console.log("features: " + features.toString(2));
	await gem.updateFeatures(0xFF);
	features = await gem.features();
	console.log("features: " + features.toString(2));
	await gem.updateFeatures(0);
	features = await gem.features();
	console.log("features: " + features.toString(2));
};
