// Writer Dependencies: ERC721 Tokens and RefPointsTracker
const GemV2 = artifacts.require("./GemERC721.sol");
const CountryV2 = artifacts.require("./CountryERC721.sol");
const RefV2 = artifacts.require("./RefPointsTracker.sol");

// Token Reader and Writer smart contracts
const Reader = artifacts.require("./TokenReader.sol");
const Writer = artifacts.require("./TokenWriter.sol");

// country dependency
import {COUNTRY_DATA} from "../data/country_data";

// permissions
import {ROLE_TOKEN_CREATOR, ROLE_AGE_PROVIDER} from "../test/erc721_core";
const ROLE_REF_POINTS_ISSUER = 0x00000001;
const ROLE_REF_POINTS_CONSUMER = 0x00000002;
const ROLE_SELLER = 0x00000004;

// V1 -> V2 Migration Tests
contract('V1 -> V2 Migration', (accounts) => {
/*
	it("migration: write gem data from CSV (write by owner)", async() => {
		// deploy GemV2
		const gemV2 = await GemV2.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// grant writer permission to mint gems and set energetic age
		await gemV2.updateRole(writer.address, ROLE_TOKEN_CREATOR | ROLE_AGE_PROVIDER);

		// CSV header
		const csv_header = "tokenId,plotId,color,level,grade,grade type,grade value,age,owner";
		// read CSV data
		const csv_data = read_csv("./data/gems.csv", csv_header);
		console.log("\t%o bytes CSV data read", csv_data.length);

		// define arrays to store the data
		const gemsByOwner = {};

		// split CSV data by lines: each line is a token
		const csv_lines = csv_data.split(/[\r\n]+/);
		// iterate over array of tokens
		for(let i = 0; i < csv_lines.length; i++) {
			// extract token properties
			const gem_props = csv_lines[i].split(",").map((a) => a.trim());

			// skip malformed line
			if(gem_props.length !== 9) {
				continue;
			}

			// extract owner
			const owner = gem_props.pop(); // remove last element

			// initialize owner entry if required
			if(!gemsByOwner[owner]) {
				gemsByOwner[owner] = [];
			}

			// add gem to owner
			gemsByOwner[owner].push(gem_props);
		}
		console.log("\t%o token(s) belong to %o account(s)", csv_lines.length, Object.keys(gemsByOwner).length);

		// track cumulative gas usage
		let cumulativeGasUsed = 0;

		// now we have all the gems assigned to their owners in "owners" array
		// iterate the array
		for(let owner of Object.keys(gemsByOwner)) {
			const tokens = gemsByOwner[owner];

			// pack gem data into uint128
			const packed = tokens.map(packGemData);

			// write all the tokens and measure gas
			const gasUsed = (await writer.writeOwnerGemV2Data(gemV2.address, owner, packed)).receipt.gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log("\t%o token(s) for %o written: %o gas used", tokens.length, owner, gasUsed);
		}

		// print the cumulative gas usage result
		console.log("\tcumulative gas used: %o", cumulativeGasUsed);
	});
*/

	it("migration: write gem data from CSV (bulk write)", async() => {
		// deploy GemV2
		const token = await GemV2.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// grant writer permission to mint gems and set energetic age
		await token.updateRole(writer.address, ROLE_TOKEN_CREATOR | ROLE_AGE_PROVIDER);

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

		// print the cumulative gas usage result
		console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
	});

	it("migration: write country data from CSV", async() => {
		// deploy Country V2
		const token = await CountryV2.new(COUNTRY_DATA);
		// deploy Token Writer
		const writer = await Writer.new();

		// grant writer permission to mint gems and set energetic age
		await token.updateRole(writer.address, ROLE_TOKEN_CREATOR);

		// CSV header
		const csv_header = "tokenId,owner";
		// read CSV data
		const csv_data = read_csv("./data/countries.csv", csv_header);
		console.log("\t%o bytes CSV data read", csv_data.length);

		// define arrays to store the data
		const owners = [];
		const ids = [];

		// split CSV data by lines: each line is a token
		const csv_lines = csv_data.split(/[\r\n]+/);
		// iterate over array of tokens
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

		// track cumulative gas usage
		let cumulativeGasUsed = 0;

		// iterate the arrays in bulks
		const bulkSize = 64;
		for(let offset = 0; offset < owners.length; offset += bulkSize) {
			// extract portion of owners array
			const owners_to_write = owners.slice(offset, offset + bulkSize);

			// check token existence at the offset
			if(!await token.exists(offset + 1)) {
				// write all the gems and measure gas
				const gasUsed = (await writer.writeCountryV2Data(token.address, offset, owners_to_write)).receipt.gasUsed;

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

		// print the cumulative gas usage result
		console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
	});

	it("migration: write ref points data from CSV", async() => {
		// deploy RefPointsTracker V2
		const tracker = await RefV2.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// grant writer permission to mint gems and set energetic age
		await tracker.updateRole(writer.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);

		// CSV header
		const csv_header = "issued,consumed,available,address,raw256";
		// read CSV data
		const csv_data = read_csv("./data/ref_points.csv", csv_header);
		console.log("\t%o bytes CSV data read", csv_data.length);

		// define array to store the data
		const data256 = [];

		// split CSV data by lines: each line is a tracker
		const csv_lines = csv_data.split(/[\r\n]+/);
		// iterate over array of tokens
		for(let i = 0; i < csv_lines.length; i++) {
			// extract tracker properties
			const props = csv_lines[i].split(",").map((a) => a.trim());

			// skip malformed line
			if(props.length !== 5) {
				continue;
			}

			// extract raw256 data
			data256.push(web3.utils.toBN(props.pop()));
		}
		console.log("\t%o of %o records parsed", data256.length, csv_lines.length);

		// write all the gems and measure gas
		const gasUsed = (await writer.writeRefPointsData(tracker.address, data256)).receipt.gasUsed;

		// log the result
		console.log("\t%o record(s) written: %o gas used", data256.length, gasUsed);
		console.log("\tcumulative gas used: %o (%o ETH)", gasUsed, Math.ceil(gasUsed / 1000000) / 1000);
	});

	it("migration: write known addr data from CSV", async() => {
		// deploy RefPointsTracker V2
		const tracker = await RefV2.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// grant writer permission to mint gems and set energetic age
		await tracker.updateRole(writer.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);

		// CSV header
		const csv_header = "address,raw256";
		// read CSV data
		const csv_data = read_csv("./data/known_addresses.csv", csv_header);
		console.log("\t%o bytes CSV data read", csv_data.length);

		// define array to store the data
		const data256 = [];

		// split CSV data by lines: each line is a tracker
		const csv_lines = csv_data.split(/[\r\n]+/);
		// iterate over array of tokens
		for(let i = 0; i < csv_lines.length; i++) {
			// extract tracker properties
			const props = csv_lines[i].split(",").map((a) => a.trim());

			// skip malformed line
			if(props.length !== 2) {
				continue;
			}

			// extract raw256 data
			data256.push(web3.utils.toBN(props.pop()));
		}
		console.log("\t%o of %o records parsed", data256.length, csv_lines.length);

		// track cumulative gas usage
		let cumulativeGasUsed = 0;

		// iterate the arrays in bulks
		const bulkSize = 100;
		for(let offset = 0; offset < data256.length; offset += bulkSize) {
			// extract portion of owners array
			const data_to_write = data256.slice(offset, offset + bulkSize);

			// write all the gems and measure gas
			const gasUsed = (await writer.writeKnownAddrData(tracker.address, data_to_write)).receipt.gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log(
				"\t%o record(s) written (%o total): %o gas used",
				Math.min(bulkSize, data256.length - offset),
				Math.min(offset + bulkSize, data256.length),
				gasUsed
			);
		}

		// log the result
		console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
	});
});

// auxiliary function to pack gem data from array into uint128
function packGemData(p) {
	assert.equal(8, p.length, "wrong array length");
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack gem ID, plot ID, color, level, grade, energetic age and return
	return toBN(p[0]).shln(24).or(p[1]).shln(8).or(p[2]).shln(8).or(p[3]).shln(32).or(p[4]).shln(32).or(p[7]);
}


// import shared functions
import {read_csv, toBN} from "../scripts/shared_functions";
