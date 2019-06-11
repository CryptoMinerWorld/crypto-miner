// Token to mint smart contract
const CountryERC721 = artifacts.require("./CountryERC721");

// Token Writer smart contract
const TokenWriter = artifacts.require("./TokenWriter.sol");

// TODO: import from shared_functions.js
// Roles required for token minting
const ROLE_TOKEN_CREATOR = 0x00000001;

// a process to mint tokens in test network
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[write countries] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[write countries] coverage network - skipping the migration script");
		return;
	}

	// deployed instances' addresses
	const conf = network === "mainnet"?
		{ // Mainnet Addresses

		}: network === "ropsten"?
		{ // Ropsten Addresses
			CountryERC721:      "0xf23197d25Ca59e4554Ef7BBcF579971A14882601",
			TokenWriter:        "0xdb4f3644e05E6fB6BB7426A4f258356b728AB720",
		}:
		{ // Rinkeby Addresses
			CountryERC721:      "0x8b67c86f5ab90796c60370E6CbBc7CCc5bAfEe35",
			TokenWriter:        "0x6f98A7FfE026F6514B7bdC01418a21C384B0Fa63",
		};

	// deployed instances
	const instances = {
		CountryERC721: await CountryERC721.at(conf.CountryERC721),
		TokenWriter: await TokenWriter.at(conf.TokenWriter),
	};

	// redefine instances links
	const token = instances.CountryERC721;
	const writer = instances.TokenWriter;

	// grant writer permission to mint gems and set energetic age
	await token.updateRole(writer.address, ROLE_TOKEN_CREATOR);

	// CSV header
	const csv_header = "tokenId,owner";
	// read CSV data
	const csv_data = read_csv("./data/countries.csv", csv_header);
	console.log("\t%o bytes CSV data read", csv_data.length);

	// define arrays to store the data
	const owners = [];
	const ids = [];

	// split CSV data by lines: each line is a token
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of tokens
	for(let i = 0; i < csv_lines.length; i++) {
		// extract token properties
		const props = csv_lines[i].split(",").map((a) => a.trim());

		// skip malformed line
		if(props.length !== 2) {
			continue;
		}

		// add token ID
		ids.push(props[0]);
		// add owner
		owners.push(props[1]);
	}
	console.log("\t%o of %o tokens parsed", owners.length, csv_lines.length);

	// verify IDs
	for(let i = 0; i < ids.length; i++) {
		if(i + 1 != ids[i]) {
			console.log("Unexpected token ID! %o at %o", ids[i], i + 1);
			return;
		}
	}

	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	// iterate the arrays in bulks
	const bulkSize = 64;
	for(let offset = 0; offset < owners.length; offset += bulkSize) {
		// extract portion of owners array
		const owners_to_write = owners.slice(offset, offset + bulkSize);

		// check token existence at the offset
		if(!await token.exists(offset + 1)) {
			// write all the gems and measure gas
			const gasUsed = (await writer.writeCountryV2Data(token.address, offset, owners_to_write)).receipt.gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log(
				"\t%o token(s) written (%o total): %o gas used",
				Math.min(bulkSize, owners.length - offset),
				Math.min(offset + bulkSize, owners.length),
				gasUsed
			);
		}
		else {
			// log the message
			console.log("\t%o token(s) skipped", Math.min(bulkSize, owners.length - offset));
		}
	}

	// clean the permissions used
	await token.updateRole(writer.address, 0);

	// print the cumulative gas usage result
	console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
};


/// using file system to create raw csv data file for tiers structure
const fs = require('fs');
// auxiliary function to read data from CSV file
// if CSV begins with the header specified - deletes the header from data returned
// TODO: import from shared_functions.js
function read_csv(path, header) {
	if(!fs.existsSync(path)) {
		return "";
	}
	const data = fs.readFileSync(path, {encoding: "utf8"});
	if(data.indexOf(`${header}\n`) === 0) {
		return data.substring(header.length + 1)
	}
	return data;
}

