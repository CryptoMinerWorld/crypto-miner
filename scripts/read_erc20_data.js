// TokenReader smart contract
const TokenReader = artifacts.require("./TokenReader");

// required dependencies
// to fetch data from etherscan
const request = require('request-promise-any');
// to parse data
const cheerio = require('cheerio');
// to save data into the file
const fs = require('fs');

// reading Silver ERC20 ownership data from etherscan
module.exports = async function(deployer, network, accounts) {
	// deployed reader address
	const readerAddress = "0x7c7a04e9cbaa111eb1f893e86a0fa66c613b2fd3";

	// get Silver ERC20 deployed mainnet address to query
	const silverAddress = "0x5eAb0Ea7AC3cC27f785D8e3fABA56b034aa56208";

	// Gold ERC20 deployed mainnet address to query
	const goldAddress = "0x4e55C62f4e2ca19B22c2156273F5900e124B9acD";

	// process silver and gold
	const silver = await process("silver.csv", silverAddress);
	const gold = await process("gold.csv", goldAddress);

	// get reader instance
	const reader = await TokenReader.at(readerAddress);
	// verify there are no contracts in the arrays
	const silverContracts = await reader.isContract(silver.map((a) => a.replace(/,.*/g, "")));
	console.log("silver: ", silverContracts.map((a) => a? "*": ".").join(""));
	const goldContracts = await reader.isContract(gold.map((a) => a.replace(/,.*/g, "")));
	console.log("gold: ", goldContracts.map((a) => a? "*": ".").join(""));
	const silverHasContract = silverContracts.reduce((a, b) => a || b);
	const goldHasContract = goldContracts.reduce((a, b) => a || b);
	if(silverHasContract || goldHasContract) {
		console.log("WARNING: there are smart contracts among token owners!!!");
	}

	// log the results
	console.log("silver records: " + silver.length);
	console.log("gold records: " + gold.length);

	console.log("CSV output finished!");
};

// a function to fetch HTML, parse it and write CSV data into the file
async function process(file_name, address) {
	console.log("fetching data for " + address);

	// fetch HTML data
	const html = await request(`https://etherscan.io/token/generic-tokenholders2?a=${address}`);

	console.log("got " + html.length + " bytes of html, parsing");

	// parse HTML with cheerio
	const $ = cheerio.load(html);

	// CSV header
	const csv_header = "address,amount";
	// CSV data extracted with the help of cheerio
	const csv_data = $("table tbody tr").map((i, e) => $(e).find("td").slice(1, 3).map((i, e) => $(e).text().replace(/[^0-9a-z]/gi, "")).get().join()).get();

	// write data to CSV
	fs.writeFileSync(`./data/${file_name}`, `${csv_header}\n${csv_data.join("\n")}`);

	console.log("written " + csv_data.length + " bytes of csv data into " + file_name);

	// return number of records processed
	return csv_data;
}
