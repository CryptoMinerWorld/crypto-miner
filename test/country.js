const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
const FEATURE_ALLOW_TAX_UPDATE = 0x00000004;
const ROLE_TOKEN_CREATOR = 0x00040000;

const Token = artifacts.require("./CountryERC721.sol");

// import country data
import {COUNTRY_DATA, TOTAL_PLOTS} from "../data/country_data";

// default token ID to work with
const token1 = 1;
const token2 = 2;
const token3 = 3;

// auxiliary constant "2"
const two = web3.toBigNumber(2);

contract('CountryERC721', (accounts) => {
	it("config: total number of plots", async() => {
		const expectedTotal = 500000;
		assert.equal(expectedTotal, TOTAL_PLOTS, "invalid total number of plots");
	});

	it("initial state: no tokens exist initially", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// check that number of countries is correct
		assert.equal(COUNTRY_DATA.length, await tk.getNumberOfCountries(), "wrong number of countries");

		// check that total number of plots is correct
		assert.equal(TOTAL_PLOTS, await tk.getTotalNumberOfPlots(), "wrong total number of plots");

		// check that initial number of plots for some country owner is zero
		assert.equal(0, await tk.getNumberOfPlotsByCountryOwner(accounts[0]), "wrong initial number of plots for account 0");

		// check that initial total supply and balance are both zeros
		assert.equal(0, await tk.totalSupply(), "wrong initial totalSupply value");
		assert.equal(0, await tk.balanceOf(accounts[0]), "wrong initial balanceOf() value");

		// balanceOf(0) throws:
		await assertThrowsAsync(async () => await tk.balanceOf(0));

		// check the token map
		assert.equal(0, await tk.tokenMap(), "wrong initial token map");

		// ensure it is not possible to get token at index 0
		await assertThrowsAsync(async () => await tk.tokenByIndex(0));
		await assertThrowsAsync(async () => await tk.tokenOfOwnerByIndex(accounts[0], 0));
	});

	it("mint: creating a token", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// minting with invalid parameters
		await assertThrowsAsync(async() => await tk.mint(0, token1));
		await assertThrowsAsync(async() => await tk.mint(tk.address, token1));

		// mint token 1 with correct params
		await tk.mint(accounts[0], token1);

		// check its impossible to mint with incorrect params
		await assertThrowsAsync(async () => await tk.mint(accounts[0], 0));
		await assertThrowsAsync(async () => await tk.mint(accounts[0], 191));
		await assertThrowsAsync(async () => await tk.mint(accounts[1], token2, {from: accounts[1]}));

		// ensure total supply is 1
		assert.equal(1, await tk.totalSupply(), "wrong totalSupply value after minting a token");

		// mint token 2
		await tk.mint(accounts[1], token2);

		// validate the data
		assert.equal(token1, await tk.tokenByIndex(0), "wrong token ID at index 0");
		assert.equal(token1, await tk.tokenOfOwnerByIndex(accounts[0], 0), "wrong token ID at index 0 for account 0");
		assert.equal(2, await tk.totalSupply(), "wrong totalSupply value after minting two tokens");
		assert.equal(1, await tk.balanceOf(accounts[0]), "account 0 has wrong balance after minting a token");
		assert.equal(1, await tk.balanceOf(accounts[1]), "account 1 has wrong balance after minting a token");
		assert.equal(0, await tk.balanceOf(accounts[2]), "account 2 has wrong initial balance");
		assert(await tk.exists(token1), "token 1 doesn't exist");
		assert(await tk.exists(2), "token 2 doesn't exist");
		assert(!await tk.exists(3), "token 3 exists while it should not");
	});
	it("mint: integrity of newly created token", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// define functions to read token properties
		const getPacked = async() => await tk.getPacked(token1);
		const getNumberOfPlots = async() => await tk.getNumberOfPlots(token1);
		const getTax = async() => await tk.getTax(token1);
		const getTaxPercent = async() => await tk.getTaxPercent(token1);
		const calculateTaxValueFor = async() => await tk.calculateTaxValueFor(token1, 100);

		// initially all functions throw
		await assertThrowsAsync(getPacked);
		await assertThrowsAsync(getNumberOfPlots);
		await assertThrowsAsync(getTax);
		await assertThrowsAsync(getTaxPercent);
		await assertThrowsAsync(calculateTaxValueFor);

		await tk.mint(accounts[0], token1);

		// check data integrity
		assert(two.pow(16).times(COUNTRY_DATA[0]).plus(0x010A).eq(await getPacked()), "token 1 has wrong packed attributes");
		assert.equal(COUNTRY_DATA[0], await getNumberOfPlots(), "token 1 has wrong number of plots");
		assert.deepEqual([web3.toBigNumber(1), web3.toBigNumber(10)], await getTax(), "token 1 has wrong tax");
		assert.equal(10, await getTaxPercent(), "token 1 has wrong tax percent");
		assert.equal(10, await calculateTaxValueFor(), "token 1 calculated tax value is wrong");

		const tokenCollection = await tk.getCollection(accounts[0]);
		assert.equal(1, tokenCollection.length, "wrong token collection size for account 0");
		assert.equal(token1, tokenCollection[0], "wrong element 0 in the token collection for account 0");

		assert.equal("http://cryptominerworld.com/country/1", await tk.tokenURI(1), "wrong token 1 tokenURI");

		// check the token map
		assert.equal(1, await tk.tokenMap(), "wrong token map after minting token 1");
	});
	it("mint: token map", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// define token IDs to mint:
		const tokens = [187, 115, 39];

		// expected will hold the expected token bitmap value
		let expected = web3.toBigNumber(0);

		// mint several tokens and calculate the expected bitmap
		for(const token of tokens) {
			await tk.mint(accounts[0], token);
			expected = expected.plus(two.pow(token - 1));
		}

		// read the token bit map
		const bitmap = await tk.tokenMap();

		// check the token bitmap is as expected
		assert(bitmap.eq(expected), "unexpected bitmap");
	});

	it("taxes: check the tax rate is set correctly initially", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// mint token 1 with correct params
		await tk.mint(accounts[0], token1);

		// ensure correct tax rate on the token 1
		assert.equal(1, (await tk.getTax(token1))[0], "wrong tax rate nominator set on token 1");
		assert.equal(10, (await tk.getTax(token1))[1], "wrong tax rate denominator set on token 1");
		assert.equal(10, await tk.getTaxPercent(token1), "wrong tax rate set on token 1");
		assert.equal(0, await tk.calculateTaxValueFor(token1, 9), "wrong calculated tax value on token 1 for value 9");
		assert.equal(1, await tk.calculateTaxValueFor(token1, 10), "wrong calculated tax value on token 1 for value 10");
	});
	it("taxes: update tax rate, maximum rate", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// mint token 1
		await tk.mint(accounts[0], token1);

		// define tax update functions
		const updateTaxRate = async () => await tk.updateTaxRate(token1, 1, 15);
		const updateMaxTaxChangeFreq = async () => await tk.updateMaxTaxChangeFreq(0);

		await assertThrowsAsync(updateTaxRate);
		await tk.updateFeatures(FEATURE_ALLOW_TAX_UPDATE);
		await updateTaxRate();
		await assertThrowsAsync(updateTaxRate);
		await updateMaxTaxChangeFreq();
		await updateTaxRate();

		// validate tax change
		assert.equal(3, await tk.calculateTaxValueFor(token1, 45), "wrong tax value after update (45)");
		assert.equal(2, await tk.calculateTaxValueFor(token1, 44), "wrong tax value after update (44)");
	});

	it("integrity: create few tokens, check the integrity", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// define token IDs to mint to account0:
		const tokens0 = [187, 115, 39, 13, 7];

		// define token IDs to mint to account1:
		const tokens1 = [99, 55, 44];

		// mint the tokens to account 0
		for(const token of tokens0) {
			await tk.mint(accounts[0], token);
		}
		// mint the tokens to account 1
		for(const token of tokens1) {
			await tk.mint(accounts[1], token);
		}

		assert.deepEqual(tokens0, (await tk.getCollection(accounts[0])).map(Number), "wrong token ID collection for account 0");
		assert.deepEqual(tokens1, (await tk.getCollection(accounts[1])).map(Number), "wrong token ID collection for account 1");
		//assert.deepEqual(tokens0.concat(tokens1), (await tk.allTokens()).map(Number), "wrong all tokens collection");

		// construct expected packed struct for tokens0
		const expectedPacked0 = [];
		for(const token of tokens0) {
			expectedPacked0.push(two.pow(32).times(token).plus(two.pow(16).times(COUNTRY_DATA[token - 1])).plus(256).plus(10));
		}

		assert.deepEqual(expectedPacked0, await tk.getPackedCollection(accounts[0]), "wrong token packed collection for account 0");
	});


	it("transfer: transferring a token", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		const fn = async () => await tk.transfer(accounts[1], token1);
		await assertThrowsAsync(fn);
		await tk.updateFeatures(0);
		await tk.mint(accounts[0], token1);
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance before token transfer");
		assert.equal(0, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		await assertThrowsAsync(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await assertThrowsAsync(async () => await tk.transfer(0x0, token1));
		await assertThrowsAsync(async () => await tk.transfer(accounts[0], token1));
		await fn();
		assert.equal(0, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance after token transfer");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		assert.equal(accounts[1], await tk.ownerOf(token1), "wrong token token1 owner after token transfer");
	});

	it("transferFrom: transferring on behalf", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[1], token1);
		await tk.mint(accounts[0], token2);
		const fn1 = async () => await tk.transferFrom(accounts[1], accounts[2], token1);
		await assertThrowsAsync(async () => await tk.approve(accounts[0], token1));
		await assertThrowsAsync(async () => await tk.approve(accounts[0], token2));
		await assertThrowsAsync(fn1);
		await tk.approve(accounts[0], token1, {from: accounts[1]});
		await tk.revokeApproval(token1, {from: accounts[1]});
		await assertThrowsAsync(async () => await tk.revokeApproval(token1, {from: accounts[1]}));
		await tk.approve(accounts[0], token1, {from: accounts[1]});
		await fn1();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR);
		const fn = async () => await tk.transferFrom(accounts[0], accounts[1], token2);
		await assertThrowsAsync(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await assertThrowsAsync(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await fn();
		assert.equal(accounts[1], await tk.ownerOf(token2), "wrong token token2 owner after transfer on behalf");
		assert.equal(accounts[2], await tk.ownerOf(token1), "wrong token token1 owner after transfer on behalf");
	});

	it("safeTransferFrom: safe transfer token to address", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS);
		await tk.mint(accounts[0], token1);
		await tk.safeTransferFrom(accounts[0], accounts[1], token1, "");
		assert.equal(accounts[1], await tk.ownerOf(token1), "token token1 has wrong owner after safely transferring it");
	});
	it("safeTransferFrom: impossible to safe transfer to a smart contract", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		const another = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS);
		await tk.mint(accounts[0], token1);
		await assertThrowsAsync(async () => await tk.safeTransferFrom(accounts[0], another.address, token1, ""));
		await assertThrowsAsync(async () => await tk.safeTransferFrom(accounts[0], tk.address, token1, ""));
		assert.equal(accounts[0], await tk.ownerOf(token1), "card token1 has wrong owner after bad attempt to transfer it");
		await tk.safeTransferFrom(accounts[0], accounts[1], token1, "");
		assert.equal(accounts[1], await tk.ownerOf(token1), "token token1 has wrong owner after safely transferring it");
	});

	it("approve: approve and transfer on behalf", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], token1);
		await tk.mint(accounts[0], token2);
		await tk.mint(accounts[0], token3);
		await assertThrowsAsync(async () => await tk.approve(0x0, 0x0));
		await assertThrowsAsync(async () => await tk.approve(accounts[0], token1));
		await tk.approve(accounts[1], token1);
		await tk.approve(accounts[1], token2);
		assert.equal(accounts[1], await tk.getApproved(token1), "wrong approved operator for token token1");
		await tk.transferFrom(accounts[0], accounts[1], token1, {from: accounts[1]});
		await tk.transferFrom(accounts[0], accounts[1], token2, {from: accounts[1]});
		assert.equal(0, await tk.getApproved(token1), "wrong approved operator for token token1 after transfer");
	});
	it("approve: approve all and transfer on behalf", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], token1);
		await tk.mint(accounts[0], token2);
		await tk.mint(accounts[0], token3);
		await assertThrowsAsync(async () => await tk.setApprovalForAll(0x0, true));
		await assertThrowsAsync(async () => await tk.setApprovalForAll(accounts[0], true));
		await tk.setApprovalForAll(accounts[1], true);
		await tk.transferFrom(accounts[0], accounts[1], token1, {from: accounts[1]});
		await tk.transferFrom(accounts[0], accounts[1], token2, {from: accounts[1]});
		assert(await tk.isApprovedForAll(accounts[0], accounts[1]), "should be approved operator");
		await tk.setApprovalForAll(accounts[1], false);
		assert(!await tk.isApprovedForAll(accounts[0], accounts[1]), "should not be approved operator");
	});

});



// auxiliary function to ensure function `fn` throws
async function assertThrowsAsync(fn, ...args) {
	let f = () => {};
	try {
		await fn(args);
	}
	catch(e) {
		f = () => {
			throw e;
		};
	}
	finally {
		assert.throws(f);
	}
}
