// RefPointsTracker smart contract
const RefPointsTracker = artifacts.require("./RefPointsTracker");

// Token Writer smart contract
const TokenWriter = artifacts.require("./TokenWriter.sol");

// TODO: import from shared_functions.js
// Roles required for RefPointsTracker minting
const ROLE_REF_POINTS_ISSUER = 0x00000001;
const ROLE_REF_POINTS_CONSUMER = 0x00000002;
const ROLE_SELLER = 0x00000004;

// a process to write known addresses data
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[write known addresses] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[write known addresses] coverage network - skipping the migration script");
		return;
	}

	// deployed instances' addresses
	const conf = network === "mainnet"?
		{ // Mainnet Addresses

		}:
		{ // Ropsten Addresses
			RefPointsTracker:   "0xF703407ADbFFC0d7f7Fe413eE86Cc82c9f51Df06",
			TokenWriter:        "0x205b3c69C9Bbd5E0F65249a9785F36aF28ac9aAa",
		};

	// deployed instances
	const instances = {
		RefPointsTracker: await RefPointsTracker.at(conf.RefPointsTracker),
		TokenWriter: await TokenWriter.at(conf.TokenWriter),
	};

	// redefine instances links
	const tracker = instances.RefPointsTracker;
	const writer = instances.TokenWriter;

	// CSV header
	const csv_header = "issued,consumed,available,address";
	// read CSV data
	const csv_data = read_csv("./data/known_addresses.csv", csv_header);
	console.log("\t%o bytes CSV data read", csv_data.length);

	// define array to store the data
	const data = [];

	// split CSV data by lines: each line is a record
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of records
	for(let i = 0; i < csv_lines.length; i++) {
		// extract tracker properties
		const props = csv_lines[i].split(",").map((a) => a.trim());

		// skip malformed line
		if(props.length !== 4) {
			continue;
		}

		// extract data
		data.push(props);
	}
	console.log("\t%o of %o records parsed", data.length, csv_lines.length);

	// grant writer permission to mint gems and set energetic age
	await tracker.updateRole(writer.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);

	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	// iterate the arrays in bulks
	const bulkSize = 100;
	for(let offset = 0; offset < data.length; offset += bulkSize) {
		// extract portion of owners array
		const data_to_write = data.slice(offset, offset + bulkSize).map(packRefData);

		// check if ref points are already written
		if(!await tracker.isKnown(data[offset][3])) {
			// write all the gems and measure gas
			const gasUsed = (await writer.writeKnownAddrData(tracker.address, data_to_write)).receipt.gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log(
				"\t%o record(s) written (%o total): %o gas used",
				Math.min(bulkSize, data.length - offset),
				Math.min(offset + bulkSize, data.length),
				gasUsed
			);
		}
		else {
			console.log("\t%o record(s) skipped", Math.min(bulkSize, data.length - offset));
		}
	}

	// clean the permissions used
	await tracker.updateRole(writer.address, 0);

	// log the result
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
	if(data.indexOf(`${header}\n`) !== 0) {
		throw new Error("malformed CSV header");
	}
	return data.substring(header.length + 1)
}

// short name for web3.utils.toBN
// TODO: import from shared_functions.js
const toBN = web3.utils.toBN;

// auxiliary function to pack ref data from array into uint256
function packRefData(p) {
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack issued, consumed, balance and owner
	return p[0].shln(32).or(p[1]).shln(32).or(p[2]).shln(160).or(p[3]);
}
