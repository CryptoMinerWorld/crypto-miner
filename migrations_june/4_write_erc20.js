// ERC20 smart contracts
const SilverERC20 = artifacts.require("./SilverERC20.sol");
const GoldERC20 = artifacts.require("./GoldERC20.sol");

// Token Writer smart contract
const TokenWriter = artifacts.require("./TokenWriter.sol");

// TODO: import from shared_functions.js
// Roles required for token minting
const ROLE_TOKEN_CREATOR = 0x00000001;

// a process to mint ERC20 tokens
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[write ERC20] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[write ERC20] coverage network - skipping the migration script");
		return;
	}

	// deployed instances' addresses
	const conf = network === "mainnet"?
		{ // Mainnet Addresses

		}:
		{ // Ropsten Addresses
			SilverERC20:        "0xB373E86e650236CAf952F6cdE206dfe196FeEC35",
			GoldERC20:          "0xbE713aC93fF6d7e0dA88e024DC9Cf0d5D05c3A5A",
			TokenWriter:        "0x205b3c69C9Bbd5E0F65249a9785F36aF28ac9aAa",
		};

	// deployed instances
	const instances = {
		SilverERC20: await SilverERC20.at(conf.SilverERC20),
		GoldERC20: await GoldERC20.at(conf.GoldERC20),
		TokenWriter: await TokenWriter.at(conf.TokenWriter),
	};

	// process the data for silver
	await processERC20Data("silver.csv", instances.SilverERC20, instances.TokenWriter);
	// process the data for gold
	await processERC20Data("gold.csv", instances.GoldERC20, instances.TokenWriter);
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
	if(data.indexOf(`${header}\n`) !== 0) {
		throw new Error("malformed CSV header");
	}
	return data.substring(header.length + 1)
}

// short name for web3.utils.toBN
// TODO: import from shared_functions.js
const toBN = web3.utils.toBN;

// auxiliary function to pack ERC20 data from array into uint256
function packERC20Data(p) {
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack address and amount
	return p[1].shln(160).or(p[0]);
}

// all ERC20 tokens have same processing logic, only CSV file name differs
async function processERC20Data(file_name, token, writer) {
	// CSV header
	const csv_header = "address,amount";
	// read CSV data
	const csv_data = read_csv(`./data/${file_name}`, csv_header);
	console.log("\t%o bytes CSV data read", csv_data.length);

	// define array to store the data
	const data = [];

	// split CSV data by lines: each line is a record
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of record
	for(let i = 0; i < csv_lines.length; i++) {
		// extract record data
		const props = csv_lines[i].split(",").map((a) => a.trim());

		// skip malformed line
		if(props.length !== 2) {
			continue;
		}

		// extract data
		data.push(props);
	}
	console.log("\t%o of %o records parsed", data.length, csv_lines.length);

	// grant writer permission to mint gems and set energetic age
	await token.updateRole(writer.address, ROLE_TOKEN_CREATOR);

	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	// check if tokens are already written
	if((await token.balanceOf(data[0][0])).isZero()) {
		// write all the data in a single transaction
		const gasUsed = (await writer.writeERC20Data(token.address, data.map(packERC20Data))).receipt.gasUsed;

		// update cumulative gas used
		cumulativeGasUsed += gasUsed;

		// log the result
		console.log("\t%o record(s) written: %o gas used", data.length, gasUsed);
	}
	else {
		console.log("\t%o record(s) skipped", data.length);
	}

	// clean the permissions used
	await token.updateRole(writer.address, 0);

	// log the result
	console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
}

