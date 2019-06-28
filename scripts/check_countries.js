// TokenReader smart contract
const TokenReader = artifacts.require("./TokenReader");

// using file system to create raw csv data file for tiers structure
const fs = require('fs');

// Reading country data with TokenReader smart contract
module.exports = async function(deployer, network, accounts) {
	// deployed reader address
	const readerAddress = "0x7c7a04e9cbaa111eb1f893e86a0fa66c613b2fd3";

	// get reader instance
	const reader = await TokenReader.at(readerAddress);

	// CSV header
	const csv_header = "tokenId,owner";
	// read CSV data
	const csv_data = read_csv("./data/countries.csv", csv_header);
	console.log("\t%o bytes CSV data read from countries.csv", csv_data.length);

	// define arrays to store the data
	const owners = [];
	const ids = [];

	// split CSV data by lines: each line is a record
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of records
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

	// determine unique owners
	const uniqueOwners = [...new Set(owners)];
	console.log("total records: " + owners.length);
	console.log("unique owners: " + uniqueOwners.length);

	// determine if there are non-external addresses among owners
	const contracts = await reader.isContract(uniqueOwners);
	console.log(contracts.map((a) => a? "*": ".").join(""));
	const hasContract = contracts.reduce((a, b) => a || b);
	if(hasContract) {
		console.log("WARNING: there are smart contracts among token owners!!!");
	}

};

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

