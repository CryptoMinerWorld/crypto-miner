// TokenHelper smart contract
const TokenHelper = artifacts.require("./TokenHelper");

// TokenHelper smart contract deployment
module.exports = async function(deployer, network, accounts) {
	// addresses:
	// deployed helper address
	const helperAddress = "0x98E3a09C2aD9441cb13a1B6E8D75BdE7C59B539a";
	// v1 ERC721 deployed addresses to work with
	const gemAddress = "0xeAe9d154dA7a1cD05076dB1B83233f3213a95e4F";

	// get reader instance
	const reader = await TokenHelper.at(helperAddress);

	// CSV header
	const csv_header = "tokenId,plotId,color,level,grade,grade type,grade value,age,owner";
	// CSV data to be stored here
	const csv_data = [];

	// read all the gems in 500 items pages
	const length = 500;
	for(let offset = 0, read = length; read !== 0; offset += length) {
		// read tha page
		console.log("reading page at offset " + offset);
		const page = await reader.readGemData(gemAddress, offset, length);

		console.log("page read, parsing...");
		const owners = page[0];
		const data = page[1];

		// update how many data we've read
		read = data.length;

		// output the data
		for(let i = 0; i < read; i++) {
			const tokenId = data[i].shrn(96).mod(toBN(1).shln(32)).toNumber();
			const plotId = data[i].shrn(80).mod(toBN(1).shln(16)).toNumber();
			const color = data[i].shrn(72).mod(toBN(256)).toNumber();
			const level = data[i].shrn(64).mod(toBN(256)).toNumber();
			const grade = data[i].shrn(32).mod(toBN(1).shln(32)).toNumber();
			const age = data[i].mod(toBN(1).shln(32)).toNumber();
			const owner = owners[i];

			const gradeType = grade >> 24;
			const gradeValue = grade & 0xFFFFFF;

			// push the CSV data
			csv_data.push([
				tokenId,
				plotId,
				color,
				level,
				grade,
				gradeType,
				gradeValue,
				gradeType > 3? age: 0,
				owner
			]);
		}
	}

	console.log("finished! CSV data is ready - starting CSV output\n");

	// print CSV header
	console.log(csv_header);
	// print CSV data
	for(let i = 0; i < csv_data.length; i++) {
		console.log(csv_data[i].join(","));
	}

	console.log("\nprint finished!");
};

// import shared functions
const toBN = web3.utils.toBN;
