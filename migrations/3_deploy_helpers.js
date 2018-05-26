module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy helpers] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy helpers] coverage network - skipping the migration script");
		return;
	}

	const GemHelper = artifacts.require("./GemHelper");
	await deployer.deploy(GemHelper);

	const gemHelper = await GemHelper.deployed();

	console.log("___________________________________________________");
	console.log("gem helper: " + gemHelper.address);

};
