// Writer Dependencies: ERC721 Tokens
const GemV2 = artifacts.require("./GemERC721.sol");
const CountryV2 = artifacts.require("./CountryERC721.sol");

// Token Reader and Writer smart contracts
const Reader = artifacts.require("./TokenReader.sol");
const Writer = artifacts.require("./TokenWriter.sol");

// permissions
import {ROLE_TOKEN_CREATOR, ROLE_AGE_PROVIDER} from "../test/erc721_core";

// V1 -> V2 Migration Tests
contract('V1 -> V2 Migration', (accounts) => {
	it("migration: write by owner – creating all the gems from CSV", async() => {
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

		// split CSV data by lines: each line is a gem
		const csv_lines = csv_data.split(/[\r\n]+/);
		// iterate over array of gems
		for(let i = 0; i < csv_lines.length; i++) {
			// extract gem properties
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
		console.log("\t%o gems belong to %o accounts", csv_lines.length, Object.keys(gemsByOwner).length);

		// track cumulative gas usage
		let cumulativeGasUsed = 0;

		// now we have all the gems assigned to their owners in "owners" array
		// iterate the array
		for(let owner of Object.keys(gemsByOwner)) {
			const gems = gemsByOwner[owner];

			// pack gem data into uint128
			const packed = gems.map(packGemData);

			// write all the gems and measure gas
			const gasUsed = (await writer.writeOwnerGemV2Data(gemV2.address, owner, packed)).receipt.gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log("\t%o gem(s) for %o written: %o gas used", gems.length, owner, gasUsed);
		}

		// print the cumulative gas usage result
		console.log("\tcumulative gas used: %o", cumulativeGasUsed);
	});

	it("migration: bulk write – creating all the gems from CSV", async() => {
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
		const owners = [];
		const gems = [];

		// split CSV data by lines: each line is a gem
		const csv_lines = csv_data.split(/[\r\n]+/);
		// iterate over array of gems
		for(let i = 0; i < csv_lines.length; i++) {
			// extract gem properties
			const gem_props = csv_lines[i].split(",").map((a) => a.trim());

			// skip malformed line
			if(gem_props.length !== 9) {
				continue;
			}

			// add gem's owner
			owners.push(gem_props.pop()); // remove last element)
			// add the gem itself
			gems.push(gem_props);
		}
		console.log("\t%o of %o gems parsed", gems.length, csv_lines.length);

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

			// check gem existence at the offset
			if(!await gemV2.exists(gems[offset][0])) {
				// write all the gems and measure gas
				const gasUsed = (await writer.writeBulkGemV2Data(gemV2.address, owners_to_write, gems_to_write)).receipt.gasUsed;

				// update cumulative gas used
				cumulativeGasUsed += gasUsed;

				// log the result
				console.log(
					"\t%o gem(s) written (%o total): %o gas used",
					Math.min(bulkSize, owners.length - offset),
					Math.min(offset + bulkSize, owners.length),
					gasUsed
				);
			}
			else {
				// log the message
				console.log("\t%o gem(s) skipped", Math.min(bulkSize, owners.length - offset));
			}
		}

		// print the cumulative gas usage result
		console.log("\tcumulative gas used: %o", cumulativeGasUsed);
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
