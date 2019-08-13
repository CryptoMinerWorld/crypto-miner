// import ERC721Core dependencies
import {ROLE_TOKEN_CREATOR} from "./erc721_core";

// Writer Dependency: GemERC721
const GemERC721 = artifacts.require("./GemERC721.sol");
// Token Writer smart contract
const Writer = artifacts.require("./TokenWriter.sol");

// Writing 190 Country Gems Test
contract('Writing 190 Country Gems', (accounts) => {

	it("country gems: writing 190 country gems, verifying their properties", async() => {
		// deploy Gem SC
		const token = await GemERC721.new();
		// deploy Token Writer
		const writer = await Writer.new();

		// an account to receive all the 190 tokens
		const seller = accounts[1];

		// perform the operation
		await writeCountryGems(token, writer, accounts, seller);

		// verify if tokens were written correctly
		const n = 190;
		console.log("verifying minted gems properties...");
		assert.equal(n, await token.totalSupply(), "wrong total number of tokens created");
		for(let i = 0; i < n; i++) {
			// recall to gem properties defined previously
			const tokenId = 0xF101 + i;
			const color = 1;
			const level = 1;
			const grade = 0x01000000;

			// verify gem properties written
			assert.equal(color, await token.getColor(tokenId), "wrong color for token " + tokenId + " (" + i + ")");
			assert.equal(level, await token.getLevel(tokenId), "wrong level for token " + tokenId + " (" + i + ")");
			assert.equal(grade, await token.getGrade(tokenId), "wrong grade for token " + tokenId + " (" + i + ")");
			assert.equal(0, await token.getAge(tokenId), "wrong age for token " + tokenId + " (" + i + ")");
		}
	});

});


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

// aux function to write country gems
async function writeCountryGems(token, writer, accounts, seller) {
	// we'll be tracking nonce, yeah!
	let nonce = await web3.eth.getTransactionCount(accounts[0]);
	// a place to store pending transactions (promises)
	const txs = [];

	// grant writer permission to mint gems
	if((await token.userRoles(writer.address)).isZero()) {
		console.log("\tgranting Writer %o permission to mint GemERC721 %o, nonce %o",  writer.address, token.address, nonce);
		txs.push(token.updateRole(writer.address, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
	}

	// define gem owners array – single address
	const n = 190;
	const owners = new Array(n).fill(seller);
	// define gems array
	const gems = [];
	for(let i = 0; i < n; i++) {
		// define gem properties
		const tokenId = toBN(0xF101 + i);
		const color = toBN(1);
		const level = toBN(1);
		const grade = toBN(0x01000000);

		// add gem into array
		gems.push(tokenId.shln(24)/*plotID=0*/.shln(8).or(color).shln(8).or(level).shln(32).or(grade).shln(32)/*age=0*/);
	}

	// write 190 tokens in bulks
	const bulkSize = 50;
	for(let offset = 0; offset < owners.length; offset += bulkSize) {
		// extract portion of owners array
		const owners_to_write = owners.slice(offset, offset + bulkSize);
		// extract portion of data array
		const gems_to_write = gems.slice(offset, offset + bulkSize);

		// check token existence at the offset
		if(!await token.exists(gems[offset].shrn(104))) {
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
import {toBN} from "../scripts/shared_functions";
