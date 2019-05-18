const ROLE_TOKEN_CREATOR = 0x00040000;

const Country = artifacts.require("./CountryERC721");
const Sale = artifacts.require("./CountrySale");

// import country data
import {COUNTRY_PRICE_DATA} from "../data/country_data";

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy country sale] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy country sale] coverage network - skipping the migration script");
		return;
	}

	// where the funds go to
	let beneficiary = "0xe0123204873fd29a29aef3f99faf1b1c45fe3b1e"; // MainNet MultiSig

	// for test network we redefine beneficiary MultiSig addresses
	if(network !== "mainnet") {
		// beneficiary = "0xb4e8e4f7e6024b37ed2584e8c86b2917dae9a2da"; // Rinkeby MultiSig
		beneficiary = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
	}

	// deployed country token smart contract addresses
	let countryAddress = "0xE49F05Fd6DEc46660221a1C1255FfE335bc7fa7a"; // MainNet country token address
	if(network !== "mainnet") {
		countryAddress = "0x6AC79cbA4Cf4c07303d30410739b13Ee6914b619"; // Rinkeby country token address
	}

	// country instance
	const country = Country.at(countryAddress);

	// deploy CountrySale smart contract
	await deployer.deploy(Sale, countryAddress, beneficiary, COUNTRY_PRICE_DATA);
	const sale = await Sale.deployed();
	const saleAddress = sale.address;

	// give permissions to sale smart contract to mint tokens
	await country.addOperator(saleAddress, ROLE_TOKEN_CREATOR);

	console.log("________________________________________________________________________");
	console.log("country:    " + countryAddress);
	console.log("supply:     " + await country.totalSupply());
	console.log("sale:       " + saleAddress);

};

