// Writer Dependencies: ERC721 Tokens and RefPointsTracker
const GemERC721 = artifacts.require("./GemERC721.sol");
const CountryERC721 = artifacts.require("./CountryERC721.sol");
const RefPointsTracker = artifacts.require("./RefPointsTracker.sol");
const SilverERC20 = artifacts.require("./SilverERC20.sol");
const GoldERC20 = artifacts.require("./GoldERC20.sol");

// Token Reader and Writer smart contracts
const Reader = artifacts.require("./TokenReader.sol");
const Writer = artifacts.require("./TokenWriter.sol");

// country dependency
import {COUNTRY_DATA} from "../data/country_data";

// permissions
import {ROLE_TOKEN_CREATOR, ROLE_AGE_PROVIDER} from "./erc721_core";

const ROLE_REF_POINTS_ISSUER = 0x00000001;
const ROLE_REF_POINTS_CONSUMER = 0x00000002;
const ROLE_SELLER = 0x00000004;

// V1 -> V2 Migration Tests
contract('V1 -> V2 Migration', (accounts) => {

	it("migration: write ERC20 data from CSV (Silver)", async() => {
		// deploy Token V2
		const token = await SilverERC20.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// process the data
		await processERC20Data("silver.csv", token, writer, accounts);
	});

	it("migration: write ERC20 data from CSV (Gold)", async() => {
		// deploy Token V2
		const token = await GoldERC20.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// process the data
		await processERC20Data("gold.csv", token, writer, accounts);
	});

	it("migration: write ref points data from CSV", async() => {
		// deploy RefPointsTracker V2
		const tracker = await RefPointsTracker.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// write referral points
		await writeRefPoints(tracker, writer, accounts);
	});

	it("migration: write known addr data from CSV", async() => {
		// deploy RefPointsTracker V2
		const tracker = await RefPointsTracker.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// write known addresses
		await writeKnownAddresses(tracker, writer, accounts);
	});

	it("migration: write country data from CSV", async() => {
		// deploy Country V2
		const token = await CountryERC721.new(COUNTRY_DATA);
		// deploy Token Writer
		const writer = await Writer.new();

		// write CountryERC721 data
		await writeCountryERC721Data(token, writer, accounts);
	});

	it("migration: write gem data from CSV (bulk write)", async() => {
		// deploy GemV2
		const token = await GemERC721.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// write GemERC721 data
		await writeGemERC721Data(token, writer, accounts);
	});

});

// auxiliary function to pack ERC20 data from array into uint256
function packERC20Data(p) {
	assert.equal(2, p.length, "wrong array length");
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack address and amount
	return p[1].shln(160).or(p[0]);
}

// auxiliary function to pack ref data from array into uint256
function packRefData(p) {
	assert.equal(4, p.length, "wrong array length");
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack issued, consumed, balance and owner
	return p[0].shln(32).or(p[1]).shln(32).or(p[2]).shln(160).or(p[3]);
}

// auxiliary function to pack gem data from array into uint128
function packGemData(p) {
	assert.equal(8, p.length, "wrong array length");
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack gem ID, plot ID, color, level, grade, energetic age and return
	return p[0].shln(24).or(p[1]).shln(8).or(p[2]).shln(8).or(p[3]).shln(32).or(p[4]).shln(32).or(p[7]);
}

// waits for all transactions in the array and outputs gas usage stats
async function waitForAll(txs) {
	// track cumulative gas usage
	let cumulativeGasUsed = 0;

	console.log("\twaiting for %o transactions to complete", txs.length);
	// wait for all pending transactions and gather results
	if(txs.length > 0) {
		(await Promise.all(txs)).forEach((tx) => {
			// measure gas used
			const gasUsed = tx.receipt.gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log("\ttransaction complete, %o gas used", gasUsed);
		});
	}

	// log cumulative gas used
	console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
}

// all ERC20 tokens have same processing logic, only CSV file name differs
async function processERC20Data(file_name, token, writer, accounts) {
	// CSV header
	const csv_header = "address,amount";
	// read CSV data
	const csv_data = read_csv(`./data/${file_name}`, csv_header);
	console.log("\t%o bytes CSV data read from %s", csv_data.length, file_name);

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

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// grant writer permission to mint gems and set energetic age
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("granting Writer %o permission to mint ERC20 token %o", writer.address, token.address);
		txs.push(token.updateRole(writer.address, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}

	// check if tokens are already written
	if((await token.balanceOf(data[0][0])).isZero()) {
		// schedule writing all token ownerships
		console.log("\twriting %o token ownerships, nonce %o", data.length, nonce);
		txs.push(writer.writeERC20Data(token.address, data.map(packERC20Data), {nonce: nonce++}));
	}
	else {
		console.log("\t%o record(s) skipped", data.length);
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used
	if(!(await token.userRoles(writer.address)).isZero()) {
		console.log("revoking Writer %o permission to mint ERC20 token %o", writer.address, token.address);
		await token.updateRole(writer.address, 0);
	}
}

// aux function to write referral points data
async function writeRefPoints(tracker, writer, accounts) {
	// CSV header
	const csv_header = "issued,consumed,available,address";
	// read CSV data
	const csv_data = read_csv("./data/ref_points.csv", csv_header);
	console.log("\t%o bytes CSV data read from ref_points.csv", csv_data.length);

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

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// grant writer permission to issue and consume referral points
	if((await tracker.userRoles(writer.address)).isZero()) {
		console.log("granting Writer %o permission to update RefPointsTracker %o, nonce %o", writer.address, tracker.address, nonce);
		txs.push(tracker.updateRole(writer.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER, {nonce: nonce++}));
	}

	// check if ref points are already written
	if(!await tracker.isKnown(data[0][3])) {
		// schedule writing all ref points
		console.log("\twriting %o ref points, nonce %o", data.length, nonce);
		txs.push(writer.writeRefPointsData(tracker.address, data.map(packRefData), {nonce: nonce++}));
	}
	else {
		console.log("\t%o record(s) skipped", data.length);
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used - sync mode
	if(!(await tracker.userRoles(writer.address)).isZero()) {
		console.log("revoking Writer %o permission to update RefPointsTracker %o", writer.addres, tracker.address);
		await tracker.updateRole(writer.address, 0);
	}
}

// aux function to write referral points data
async function writeKnownAddresses(tracker, writer, accounts) {
	// CSV header
	const csv_header = "issued,consumed,available,address";
	// read CSV data
	const csv_data = read_csv("./data/known_addresses.csv", csv_header);
	console.log("\t%o bytes CSV data read from known_addresses.csv", csv_data.length);

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

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];
	// grant writer permission to add known addresses
	if((await tracker.userRoles(writer.address)).isZero()) {
		console.log("\tgranting Writer %o permission to update RefPointsTracker %o, nonce %o", writer.address, tracker.address);
		txs.push(tracker.updateRole(writer.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER, {nonce: nonce++}));
	}

	// iterate the arrays in bulks
	const bulkSize = 100;
	for(let offset = 0; offset < data.length; offset += bulkSize) {
		// extract portion of owners array
		const data_to_write = data.slice(offset, offset + bulkSize).map(packRefData);

		// check if ref points are already written
		if(!await tracker.isKnown(data[offset][3])) {
			// schedule writing all the known addresses
			console.log("\twriting %o known addresses at offset %o, nonce %o", data_to_write.length, offset, nonce);
			txs.push(writer.writeKnownAddrData(tracker.address, data_to_write, {nonce: nonce++}));
		}
		else {
			console.log("\t%o record(s) skipped", Math.min(bulkSize, data.length - offset));
		}
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used - sync mode
	if(!(await tracker.userRoles(writer.address)).isZero()) {
		console.log("\trevoking Writer %o permission to update RefPointsTracker %o", writer.address, tracker.address);
		await tracker.updateRole(writer.address, 0);
	}
}

// aux function to write CountryERC721 data
async function writeCountryERC721Data(token, writer, accounts) {
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

	// verify IDs
	for(let i = 0; i < ids.length; i++) {
		if(i + 1 != ids[i]) {
			console.log("Unexpected token ID! %o at %o", ids[i], i + 1);
			return;
		}
	}

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// grant writer permission to mint countries
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("\tgranting Writer %o permission to mint CountryERC721 %o, nonce %o", writer.address, token.address, nonce);
		txs.push(token.updateRole(writer.address, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}

	// iterate the arrays in bulks
	const bulkSize = 64;
	for(let offset = 0; offset < owners.length; offset += bulkSize) {
		// extract portion of owners array
		const owners_to_write = owners.slice(offset, offset + bulkSize);

		// check token existence at the offset
		if(!await token.exists(offset + 1)) {
			// schedule writing all the tokens
			console.log("\twriting %o tokens at offset %o, nonce %o", owners_to_write.length, offset, nonce);
			txs.push(writer.writeCountryV2Data(token.address, offset, owners_to_write, {nonce: nonce++}));
		}
		else {
			// log the message
			console.log("\t%o token(s) skipped", Math.min(bulkSize, owners.length - offset));
		}
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used - sync mode
	if(!(await token.userRoles(writer.address)).isZero()) {
		console.log("\trevoking Writer %o permission to mint CountryERC721 %o", writer.address, token.address);
		await token.updateRole(writer.address, 0);
	}
}

// aux function to write GemERC721 data
async function writeGemERC721Data(token, writer, accounts) {
	// CSV header
	const csv_header = "tokenId,plotId,color,level,grade,grade type,grade value,age,owner";
	// read CSV data
	const csv_data = read_csv("./data/gems.csv", csv_header);
	console.log("\t%o bytes CSV data read from gems.csv", csv_data.length);

	// define arrays to store the data
	const owners = [];
	const gems = [];

	// split CSV data by lines: each line is a record
	const csv_lines = csv_data.split(/[\r\n]+/);
	// iterate over array of records
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

	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// grant writer permission to mint gems and set energetic age
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("\tgranting Writer %o permission to mint GemERC721 %o, nonce %o",  writer.address, token.address, nonce);
		txs.push(token.updateRole(writer.address, ROLE_TOKEN_CREATOR | ROLE_AGE_PROVIDER, {nonce: nonce++}));
	}

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
			// schedule writing all the tokens
			console.log("\twriting %o tokens at offset %o, nonce %o", owners_to_write.length, offset, nonce);
			txs.push(writer.writeBulkGemV2Data(token.address, owners_to_write, gems_to_write, {nonce: nonce++}));
		}
		else {
			// log the message
			console.log("\t%o token(s) skipped", Math.min(bulkSize, owners.length - offset));
		}
	}

	// wait for all transactions to complete and output gas usage
	await waitForAll(txs);

	// clean the permissions used - sync mode
	if(!(await token.userRoles(writer.address)).isZero()) {
		console.log("\trevoking Writer %o permission to mint GemERC721 %o", writer.address, token.address);
		await token.updateRole(writer.address, 0);
	}
}


// import shared functions
import {read_csv, toBN} from "../scripts/shared_functions";
