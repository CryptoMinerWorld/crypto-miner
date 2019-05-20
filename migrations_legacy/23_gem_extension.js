// GemERC721 Extension Smart Contract
const GemExt = artifacts.require("./GemExtension");

// GemERC721 Extension Smart Contract Deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy gem extension] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy gem extension] coverage network - skipping the migration script");
		return;
	}

	// deploy GemERC721 Extension
	await deployer.deploy(GemExt);
	const gemExt = await GemExt.deployed();
	const gemExtAddress = gemExt.address;

	console.log("________________________________________________________________________");
	console.log("gem extension: " + gemExtAddress);

};

