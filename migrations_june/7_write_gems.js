// Token to mint smart contract
const GemERC721 = artifacts.require("./GemERC721");

// Token Writer smart contract
const TokenWriter = artifacts.require("./TokenWriter.sol");

// TODO: import from shared_functions.js
// Roles required for token minting
const ROLE_TOKEN_CREATOR = 0x00000001;
const ROLE_AGE_PROVIDER = 0x00000100;

// a process to mint tokens in test network
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[write gems] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[write gems] coverage network - skipping the migration script");
		return;
	}

	// deployed instances' addresses
	const conf = network === "mainnet"?
		{ // Mainnet Addresses

		}:
		{ // Ropsten Addresses
			GemERC721:          "0xFe71e1d0c1f678b94B5fa7542071CfFE2DEa4E31",
			TokenWriter:        "0xdb4f3644e05E6fB6BB7426A4f258356b728AB720",
		};

	// deployed instances
	const instances = {
		GemERC721: await GemERC721.at(conf.GemERC721),
		TokenWriter: await TokenWriter.at(conf.TokenWriter),
	};

	// redefine instances links
	const token = instances.GemERC721;
	const writer = instances.TokenWriter;

	// CSV header
	const csv_header = "tokenId,plotId,color,level,grade,grade type,grade value,age,owner";
	// read CSV data
	const csv_data = read_csv("./data/gems.csv", csv_header);
	console.log("\t%o bytes CSV data read", csv_data.length);

	// define arrays to store the data
	const owners = [];
	const gems = [];

	// split CSV data by lines: each line is a token
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of tokens
	for(let i = 0; i < csv_lines.length; i++) {
		// extract token properties
		const props = csv_lines[i].split(",").map((a) => a.trim());

		// skip malformed line
		if(props.length !== 9) {
			continue;
		}

		// add token's owner
		owners.push(props.pop()); // remove last element
		// add the gem itself
		gems.push(props);
	}
	console.log("\t%o of %o token(s) parsed", gems.length, csv_lines.length);

	// grant writer permission to mint gems and set energetic age
	await token.updateRole(writer.address, ROLE_TOKEN_CREATOR | ROLE_AGE_PROVIDER);

	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	// now we have all the gems parsed
	// iterate the arrays in bulks
	const bulkSize = 50;
	for(let offset = 0; offset < owners.length; offset += bulkSize) {
		// extract portion of owners array
		const owners_to_write = owners.slice(offset, offset + bulkSize);
		// extract portion of data array
		const gems_to_write = gems.slice(offset, offset + bulkSize).map(packGemData);

		// check token existence at the offset
		if(!await token.exists(gems[offset][0])) {
			// write all the gems and measure gas
			const gasUsed = (await writer.writeBulkGemV2Data(token.address, owners_to_write, gems_to_write)).receipt.gasUsed;

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

// auxiliary function to pack gem data from array into uint128
function packGemData(p) {
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack gem ID, plot ID, color, level, grade, energetic age and return
	return p[0].shln(24).or(p[1]).shln(8).or(p[2]).shln(8).or(p[3]).shln(32).or(p[4]).shln(32).or(p[7]);
}


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
	if(data.indexOf(`${header}\n`) !== 0) {
		throw new Error("malformed CSV header");
	}
	return data.substring(header.length + 1)
}

// short name for web3.utils.toBN
// TODO: import from shared_functions.js
const toBN = web3.utils.toBN;
