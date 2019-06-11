// TokenReader smart contract
const TokenReader = artifacts.require("./TokenReader");

// using file system to create raw csv data file for tiers structure
const fs = require('fs');

// Reading Ref data with TokenReader smart contract
module.exports = async function(deployer, network, accounts) {
	// addresses:
	// deployed reader address
	const readerAddress = "0xD51ae49aDDa7CBaa6d070EA933AAaBf68a24C264";
	// v1 Ref deployed addresses to work with
	const tokenAddress = "0xD06d436763a3207a24A3EE393541f924d9b323fd";

	// get reader instance
	const reader = await TokenReader.at(readerAddress);

	// define arrays to store the data
	const refData = await reader.readRefPointsData(tokenAddress);
	const knownData = await reader.readKnownAddresses(tokenAddress);

	// determine unique owners
	console.log("total records: " + (refData.length + knownData.length));

	// ensure known addresses doesn't contain referral points
	for(let i= 0 ;i < knownData.length; i++) {
		if(!knownData[i].shrn(160).isZero()) {
			console.log("WARN: non-zero ref points data for " + toAddr(knownData[i].maskn(160)));
		}
	}

	// CSV headers
	const csv_header_ref = "issued,consumed,available,address";
	const csv_header_known = "address";
	// CSV data to be stored here
	const csv_data_ref = refData.map((a) =>
		`${a.shrn(224).maskn(32)},${a.shrn(192).maskn(32)},${a.shrn(160).maskn(32)},${toAddr(a.maskn(160))}`
	);
	const csv_data_known = knownData.map((a) => `${toAddr(a.maskn(160))}`);

	console.log("CSV data is ready - starting CSV output");

	// write data to CSV
	fs.writeFileSync("./data/ref_points.csv", `${csv_header_ref}\n${csv_data_ref.join("\n")}`);
	fs.writeFileSync("./data/known_addresses.csv", `${csv_header_known}\n${csv_data_known.join("\n")}`);

	console.log("CSV output finished!");
};

// converts a number to address
function toAddr(mixed) {
	const hex = web3.utils.toHex(mixed);
	const padded = web3.utils.padLeft(hex, 40);
	return web3.utils.toChecksumAddress(padded);
}
