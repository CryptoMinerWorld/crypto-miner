// TokenReader smart contract
const TokenReader = artifacts.require("./TokenReader");

// TokenReader smart contract deployment
module.exports = async function(deployer, network, accounts) {
	// addresses:
	// deployed reader address
	const helperAddress = "0x35ecc9D6b83351F77Baa4d24A82A3bE6BC025574";
	// v1 ERC721 deployed addresses to work with
	const gemAddress = "0xeAe9d154dA7a1cD05076dB1B83233f3213a95e4F";
	// v1 Dutch Auction address
	const auctionAddress = "0x1F4f6625e92C4789dCe4B92886981D7b5f484750";

	// get reader instance
	const reader = await TokenReader.at(helperAddress);

	// CSV header
	const csv_header = "tokenId,plotId,color,level,grade,grade type,grade value,age,owner";
	// CSV data to be stored here
	const csv_data = [];

	// define arrays to store the data
	const owners = [];
	const data = [];

	// read all the gems in 500 items pages
	const length = 500;
	for(let offset = 0, read = length; read !== 0; offset += length) {
		// read tha page
		console.log("reading page at offset " + offset);
		const page = await reader.readGemV1Data(gemAddress, auctionAddress, offset, length);
		// update how many data we've read
		read = page[0].length;

		owners.push(...page[0]);
		data.push(...page[1]);
	}

	// determine unique owners
	const uniqueOwners = [...new Set(owners)];
	console.log("total records: " + owners.length);
	console.log("unique owners: " + uniqueOwners.length);

	// owned gems for each unique owner in the array
	const ownedGems = new Array(uniqueOwners.length).fill([]);

	// output the data
	for(let i = 0; i < owners.length; i++) {
		const tokenId = data[i].shrn(96).mod(toBN(1).shln(32)).toNumber();
		const plotId = data[i].shrn(80).mod(toBN(1).shln(16)).toNumber();
		const color = data[i].shrn(72).mod(toBN(256)).toNumber();
		const level = data[i].shrn(64).mod(toBN(256)).toNumber();
		const grade = data[i].shrn(32).mod(toBN(1).shln(32)).toNumber();
		const age = data[i].mod(toBN(1).shln(32)).toNumber();
		const owner = owners[i];

		const gradeType = grade >> 24;
		const gradeValue = grade & 0xFFFFFF;

		const items = [
			tokenId,
			plotId,
			color,
			level,
			grade,
			gradeType,
			gradeValue,
			gradeType > 3? age: 0,
			owner
		];

		ownedGems[uniqueOwners.indexOf(owner)].push(items);

		// push the CSV data
		csv_data.push(items);
	}

	ownedGems.sort((a, b) => a.length - b.length);

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
