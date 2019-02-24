// Country Extension extends Country ERC721 smart contract
const CountryExt = artifacts.require("./CountryExt");

// deploys Country Extension instance, binding it to already
// deployed Country ERC721 instance
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy country extension] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy country extension] coverage network - skipping the migration script");
		return;
	}

	// dependencies: Country ERC721 smart contract address
	let countryAddress = "0xE49F05Fd6DEc46660221a1C1255FfE335bc7fa7a";

	// for test networks dependencies are different
	if(network !== "mainnet") {
		countryAddress = "0x6AC79cbA4Cf4c07303d30410739b13Ee6914b619";
	}

	// deploy country extension smart contract
	await deployer.deploy(CountryExt, countryAddress);
	const extension = await CountryExt.deployed();

	// deployment successful, print all relevant info to the log
	console.log("________________________________________________________________________");
	console.log("Country ERC721:    %s", countryAddress);
	console.log("Country Extension: %s", extension.address);

};
