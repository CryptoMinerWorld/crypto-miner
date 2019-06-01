// ERC721 and ERC20 Token smart contracts
const GemERC721 = artifacts.require("./GemERC721");
const CountryERC721 = artifacts.require("./CountryERC721");
const PlotERC721 = artifacts.require("./PlotERC721");
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");
const ArtifactERC20 = artifacts.require("./ArtifactERC20");
const ChestKeyERC20 = artifacts.require("./ChestKeyERC20");
const FoundersKeyERC20 = artifacts.require("./FoundersKeyERC20");
const RefPointsTracker = artifacts.require("./RefPointsTracker");

// Token Reader and Writer smart contracts
const TokenReader = artifacts.require("./TokenReader.sol");
const TokenWriter = artifacts.require("./TokenWriter.sol");

// TODO: import from shared_functions.js
// Roles required for GemERC721 minting
const ROLE_TOKEN_CREATOR = 0x00000001;
const ROLE_AGE_PROVIDER = 0x00000100;

// a process to mint tokens in test network
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[mint migration tokens] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[mint migration tokens] coverage network - skipping the migration script");
		return;
	}

	// deployed instances' addresses
	const conf = network === "ropsten"?
		{ // Ropsten Addresses
			GemERC721: "0x3ACd26F0b5080C30c066a2055A4254A5BB05F22a",
			CountryERC721: "0x785b1246E57b9f72C6bb19e5aC3178aEffb0Fe73",
			PlotERC721: "0x8920Df4215934E5f6c8935F0049E9b9d8dDF3656",
			SilverERC20: "0x63d49c8D35C9fB523515756337cef0991B304696",
			GoldERC20: "0x761A2430FA69158c24Cb92CE4bc5d55F82931911",
			ArtifactERC20: "0x307015ef34a1baEb9Bf6fcbED03611235Bdd01aD",
			ChestKeyERC20: "0x18E29d4a0339D4a2e8D70408FE53cf9B07B09F38",
			FoundersKeyERC20: "0xBE0d479710274735Ebd361E90e56E0604a879700",
			RefPointsTracker: "0x731d55CD90762c02535fF410427Dd280A1B74397",
			TokenReader: "0x7DA1b0552c0CAf7A72d8a7bc7F7813B3AC2FcC35",
			TokenWriter: "0x4822b1172217875272d918e93076339193462E06",
		}:
		{ // Rinkeby Addresses
			GemERC721: "0x874828Da14178e4C07Fd32FA37cDFC8BbE5bDb6E",
			CountryERC721: "0xD6c9bf5b99B18D8ff48d6E8B622624ea98b9AB46",
			PlotERC721: "0x7d45f25636BcF3B19e0527ab0F7cFB7839ba74ac",
			SilverERC20: "0xeb5aBE47DD8766443D6d386bDe8117098BAadAF4",
			GoldERC20: "0x17787355dd0ACD6f890051a1BddF1659Ce63C022",
			ArtifactERC20: "0x06D32F8E3792a7F08f54A165Cb302b0c0612B689",
			ChestKeyERC20: "0x62Ef1c0f809e7dEbc866c3EBdDF89d2B61AE6C48",
			FoundersKeyERC20: "0x9ac197768D4bC204aD83CC8c9E564F6B66a98170",
			RefPointsTracker: "0x3E73B24CBfbc0C14eaE581384E0D1681f80e88bf",
			TokenReader: "0x81527e0d830881aa55e820D9f1792c8c012cf4d7",
			TokenWriter: "0x2fd5CEC72400f48F05C11aBf0D0B1bFf83681E58",
		};

	// deployed instances
	const instances = {
		GemERC721: await GemERC721.at(conf.GemERC721),
		CountryERC721: await CountryERC721.at(conf.CountryERC721),
		PlotERC721: await PlotERC721.at(conf.PlotERC721),
		SilverERC20: await SilverERC20.at(conf.SilverERC20),
		GoldERC20: await GoldERC20.at(conf.GoldERC20),
		ArtifactERC20: await ArtifactERC20.at(conf.ArtifactERC20),
		ChestKeyERC20: await ChestKeyERC20.at(conf.ChestKeyERC20),
		FoundersKeyERC20: await FoundersKeyERC20.at(conf.FoundersKeyERC20),
		RefPointsTracker: await RefPointsTracker.at(conf.RefPointsTracker),
		TokenReader: await TokenReader.at(conf.TokenReader),
		TokenWriter: await TokenWriter.at(conf.TokenWriter),
	};


	// grant writer permission to mint gems and set energetic age
	await instances.GemERC721.updateRole(conf.TokenWriter, ROLE_TOKEN_CREATOR | ROLE_AGE_PROVIDER);

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
		if(!await instances.GemERC721.exists(gems[offset][0])) {
			// write all the gems and measure gas
			const gasUsed = (await instances.TokenWriter.writeBulkGemV2Data(conf.GemERC721, owners_to_write, gems_to_write)).receipt.gasUsed;

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

};

// auxiliary function to pack gem data from array into uint128
function packGemData(p) {
	// ensure all elements are converted to BNs
	p = p.map((a) => toBN(a));
	// pack gem ID, plot ID, color, level, grade, energetic age and return
	return toBN(p[0]).shln(24).or(p[1]).shln(8).or(p[2]).shln(8).or(p[3]).shln(32).or(p[4]).shln(32).or(p[7]);
}


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
	if(data.indexOf(`${header}\n`) === 0) {
		return data.substring(header.length + 1)
	}
	return data;
}

// short name for web3.utils.toBN
// TODO: import from shared_functions.js
const toBN = web3.utils.toBN;
