// TokenReader smart contract
const TokenReader = artifacts.require("./TokenReader");

// using file system to create raw csv data file for tiers structure
const fs = require('fs');

// Reading country data with TokenReader smart contract
module.exports = async function(deployer, network, accounts) {
	// addresses:
	// deployed reader address
	const readerAddress = "0x7c7a04e9cbaa111eb1f893e86a0fa66c613b2fd3";
	// v1 ERC721 deployed addresses to work with
	const tokenAddress = "0xE49F05Fd6DEc46660221a1C1255FfE335bc7fa7a";
	// v1 Dutch Auction address
	const auctionAddress = "0x1F4f6625e92C4789dCe4B92886981D7b5f484750";

	// get reader instance
	const reader = await TokenReader.at(readerAddress);

	// define arrays to store the data
	console.log("reading whole set of country data");
	const owners = await reader.readCountryV1Data(tokenAddress, auctionAddress);

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

	// prepare csv_data
	// CSV header
	const csv_header = "tokenId,owner";
	// CSV data to be stored here
	const csv_data = owners.map((a, i) => `${i + 1},${a}`);


	console.log("CSV data is ready - starting CSV output");

	// write data to CSV
	fs.writeFileSync("./data/countries.csv", `${csv_header}\n${csv_data.join("\n")}`);

	console.log("CSV output finished!");
};
