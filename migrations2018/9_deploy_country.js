const Country = artifacts.require("./CountryERC721");

// import country data
import {COUNTRY_DATA} from "../data/country_data";

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy country] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy country] coverage network - skipping the migration script");
		return;
	}

	// deploy CountryERC721 smart contract
	await deployer.deploy(Country, COUNTRY_DATA);
	const country = await Country.deployed();
	const countryAddress = country.address;

	console.log("________________________________________________________________________");
	console.log("country:    " + countryAddress);
	console.log("supply:     " + await country.totalSupply());

};
