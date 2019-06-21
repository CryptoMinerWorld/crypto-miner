const Token = artifacts.require("./CountryERC721.sol");

// import ERC721Core dependencies
import {
	ERC721Receiver,
	InterfaceId_ERC165,
	InterfaceId_ERC721Enumerable,
	InterfaceId_ERC721Exists,
	InterfaceId_ERC721Metadata,
	FEATURE_TRANSFERS,
	FEATURE_TRANSFERS_ON_BEHALF,
	ROLE_EXT_WRITER,
	ROLE_TOKEN_CREATOR,
} from "./erc721_core";

// CountryERC721 specific Features and Roles
import {FEATURE_ALLOW_TAX_UPDATE, ROLE_TAX_MANAGER} from "./erc721_core";

// import country data
import {COUNTRY_DATA, TOTAL_PLOTS} from "../data/country_data";

// default token IDs to work with
const token1 = 1;
const token2 = 2;
const token3 = 3;

// a function to mint some default token
async function mint1(tk, acc) {
	await await tk.mint(acc, token1);
}

// standard function to instantiate token
async function deployToken() {
	return await Token.new(COUNTRY_DATA);
}

// timestamp right before the test begins
const now = new Date().getTime() / 1000 | 0;

// tests for Country ERC721 token
contract('CountryERC721', (accounts) => {
	it("config: total number of plots", async() => {
		const expectedTotal = 500000;
		assert.equal(expectedTotal, TOTAL_PLOTS, "invalid total number of plots");
	});

	it("initial state: no tokens exist initially", async () => {
		const tk = await deployToken();

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
		await assertThrows(async () => await tk.balanceOf(0));

		// check the token map
		assert.equal(0, await tk.tokenMap(), "wrong initial token map");

		// ensure it is not possible to get token at index 0
		await assertThrows(async () => await tk.tokenByIndex(0));
		await assertThrows(async () => await tk.tokenOfOwnerByIndex(accounts[0], 0));
	});

	it("mint: creating a token", async () => {
		const tk = await deployToken();

		// minting with invalid parameters
		await assertThrows(async() => await tk.mint(0, token1));
		await assertThrows(async() => await tk.mint(tk.address, token1));

		// mint token 1 with correct params
		await mint1(tk, accounts[0]);

		// check its impossible to mint with incorrect params
		await assertThrows(async () => await tk.mint(accounts[0], 0));
		await assertThrows(async () => await tk.mint(accounts[0], 191));
		await assertThrows(async () => await tk.mint(accounts[1], token2, {from: accounts[1]}));

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
		const tk = await deployToken();

		// define functions to read token properties
		const getPacked = async() => await tk.getPacked(token1);
		const getNumberOfPlots = async() => await tk.getNumberOfPlots(token1);
		const getTax = async() => await tk.getTax(token1);
		const getTaxPercent = async() => await tk.getTaxPercent(token1);
		const calculateTaxValueFor = async() => await tk.calculateTaxValueFor(token1, 100);

		// initially all functions throw
		await assertThrows(getPacked);
		await assertThrows(getNumberOfPlots);
		await assertThrows(getTax);
		await assertThrows(getTaxPercent);
		await assertThrows(calculateTaxValueFor);

		await mint1(tk, accounts[0]);

		// check data integrity
		assert(toBN(COUNTRY_DATA[0]).shln(8).or(toBN(0x4A)).eq(await getPacked()), "token 1 has wrong packed attributes");
		assert.equal(COUNTRY_DATA[0], await getNumberOfPlots(), "token 1 has wrong number of plots");
		assert.deepEqual({0: toBN(1), 1: toBN(10)}, await getTax(), "token 1 has wrong tax");
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
		const tk = await deployToken();

		// define token IDs to mint:
		const tokens = [187, 115, 39];

		// expected will hold the expected token bitmap value
		const expected = toBN(0);

		// mint several tokens and calculate the expected bitmap
		for(const token of tokens) {
			await tk.mint(accounts[0], token);
			expected.bincn(token - 1);
		}

		// read the token bit map
		const bitmap = await tk.tokenMap();

		// check the token bitmap is as expected
		assert(bitmap.eq(expected), "unexpected bitmap");
	});

	it("taxes: check the tax rate is set correctly initially", async () => {
		const tk = await deployToken();

		// mint token 1 with correct params
		await mint1(tk, accounts[0]);

		// ensure correct tax rate on the token 1
		assert.equal(1, (await tk.getTax(token1))[0], "wrong tax rate nominator set on token 1");
		assert.equal(10, (await tk.getTax(token1))[1], "wrong tax rate denominator set on token 1");
		assert.equal(10, await tk.getTaxPercent(token1), "wrong tax rate set on token 1");
		assert.equal(0, await tk.calculateTaxValueFor(token1, 9), "wrong calculated tax value on token 1 for value 9");
		assert.equal(1, await tk.calculateTaxValueFor(token1, 10), "wrong calculated tax value on token 1 for value 10");
	});
	it("taxes: update tax rate, maximum rate", async () => {
		const tk = await deployToken();

		// mint token 1
		await mint1(tk, accounts[0]);

		// define tax update functions
		const updateTaxRate = async () => await tk.updateTaxRate(token1, 1, 15);
		const updateMaxTaxChangeFreq = async () => await tk.updateMaxTaxChangeFreq(0);

		await assertThrows(updateTaxRate);
		await tk.updateFeatures(FEATURE_ALLOW_TAX_UPDATE);
		await updateTaxRate();
		await assertThrows(updateTaxRate);
		await updateMaxTaxChangeFreq();
		await updateTaxRate();

		// validate tax change
		assert.equal(3, await tk.calculateTaxValueFor(token1, 45), "wrong tax value after update (45)");
		assert.equal(2, await tk.calculateTaxValueFor(token1, 44), "wrong tax value after update (44)");
	});

	it("integrity: create few tokens, check the integrity", async () => {
		const tk = await deployToken();

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
			expectedPacked0.push(toBN(COUNTRY_DATA[token - 1]).shln(8).or(toBN(0x4A)).shln(8).or(toBN(token)));
		}

		assert.deepEqual(
			expectedPacked0.map(a => a.toString(16)),
			(await tk.getPackedCollection(accounts[0])).map(a => a.toString(16)),
			"wrong token packed collection for account 0"
		);
	});


	// ========== ERC721 ext256 tests ==========

	it("ext256: write requires ROLE_EXT_WRITER permission", async() => {
		// deploy token
		const tk = await deployToken();

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await tk.write(1, 17, 0, 8, {from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await tk.updateRole(operator, ROLE_EXT_WRITER);
		// fn succeeds
		await fn();

		// verify read returns 17
		assert.equal(17, await tk.read(1, 0, 8), "wrong value read");
	});
	it("ext265: verify integrity of read/write operation", async() => {
		// deploy token
		const tk = await deployToken();

		// operate on the first bit
		assert.equal(0, await tk.read(1, 0, 1), "wrong read 0, 0/1");
		await tk.write(1, 1, 0, 1);
		assert.equal(1, await tk.read(1, 0, 1), "wrong read 1, 0/1");

		// operate on the first byte
		assert.equal(1, await tk.read(1, 0, 8), "wrong read 0, 0/8");
		await tk.write(1, 17, 0, 8); // 0x11
		assert.equal(17, await tk.read(1, 0, 8), "wrong read 1, 0/8");

		// operate on the n-th byte
		assert.equal(0, await tk.read(1, 16, 8), "wrong read 0, 16/8");
		await tk.write(1, 117, 16, 8); // 0x750000
		assert.equal(117, await tk.read(1, 16, 8), "wrong read 1, 16/8");

		// operate on n-th bits
		assert.equal(0, await tk.read(1, 7, 5), "wrong read 0, 7/5");
		await tk.write(1, 112, 7, 5); // 112 will be truncated to 5 bits which is 16
		assert.equal(16, await tk.read(1, 7, 5), "wrong read 1, 7/5");
		assert.equal(16, await tk.read(1, 7, 8), "wrong read 2, 7/8");
		await tk.write(1, 112, 7, 8); // 0x3800
		assert.equal(16, await tk.read(1, 7, 5), "wrong read 3, 171/5");
		assert.equal(112, await tk.read(1, 7, 8), "wrong read 4, 171/8");

		// erase some bits
		assert.equal(0, await tk.read(1, 24, 32), "wrong read 0, 32/32");
		await tk.write(1, 65537, 24, 32); // write 0x00010001000000
		await tk.write(1, 0, 40, 16); // erase high 16 bits of the written data - 0x00010000
		assert.equal(1, await tk.read(1, 24, 32), "wrong read 1, 32/32");

		// verify whole number
		assert.equal(0x1753811, await tk.read(1, 0, 256), "wrong whole read");

		// perform few random read/write operations
		for(let i = 0; i < 32; i++) {
			const value = Math.floor(Math.random() * 256);
			const offset = Math.floor(Math.random() * 248);
			const length = Math.ceil(Math.random() * 8);
			await tk.write(1, value, offset, length);
			assert.equal(
				value & ((1 << length) - 1),
				await tk.read(1, offset, length),
				`wrong read ${i}, ${value}/${offset}/${length}`
			);
		}
		console.log(`\t0x${(await tk.read(1, 0, 0)).toString(16)}`);

		// erase everything
		await tk.write(1, 0, 0, 256);
		assert.equal(0, await tk.read(1, 0, 0), "wrong read 1, 0/0 (after erase)");
	});

	// ---------- ERC721 tests ----------

	it("unsafe transfer: transferring a token", async() => {
		// analogue to smart contract deployment
		const tk = await deployToken();

		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];

		// define transfer token functions
		const transfer1 = async() => await tk.transfer(account2, token1, {from: account1});
		const transfer2 = async() => await tk.transfer(account3, token1, {from: account2});

		// initially transfer fails (no token minted)
		await assertThrows(transfer1);
		await assertThrows(transfer2);

		// create one token
		await mint1(tk, account1);

		// wrong inputs check
		await assertThrows(tk.transfer, 0, token1, {from: account1});
		await assertThrows(tk.transfer, account1, token1, {from: account1});

		// transferring someone's else token throws
		await assertThrows(transfer2);
		// once token is minted it can be transferred by its owner
		await transfer1();
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// disable transfers
		await tk.updateFeatures(0);
		// ensure transfer will fail now
		await assertThrows(transfer2);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// transfer token to account3
		await transfer2();
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");
	});

	it("unsafe transfer: transferring own token using transferFrom", async() => {
		// analogue to smart contract deployment
		const tk = await deployToken();

		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];

		// define transfer token functions
		const transfer1 = async() => await tk.transferFrom(account1, account2, token1, {from: account1});
		const transfer2 = async() => await tk.transferFrom(account2, account3, token1, {from: account2});

		// initially transfer fails (no token minted)
		await assertThrows(transfer1);
		await assertThrows(transfer2);

		// create one token
		await mint1(tk, account1);

		// transferring someone's else token throws
		await assertThrows(transfer2);
		// once token is minted it can be transferred by its owner
		await transfer1();
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// disable transfers, leaving transfers on behalf enabled
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		// ensure transfer will fail now
		await assertThrows(transfer2);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// transfer token to account3
		await transfer2();
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");
	});

	it("safe transfer: transferring a token", async() => {
		// analogue to smart contract deployment
		const tk = await deployToken();
		// another instance will be used to verify ERC721 Receiver requirement
		const blackHole = await deployToken();
		// ERC721 valid receiver
		const erc721Rc = (await ERC721Receiver.new()).address;

		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];

		// define transfer token functions
		const transfer1 = async() => await tk.safeTransferFrom(account1, account2, token1, {from: account1});
		const transfer2 = async() => await tk.safeTransferFrom(account2, account3, token1, {from: account2});
		const transfer3 = async() => await tk.safeTransferFrom(account3, erc721Rc, token1, {from: account3});
		const unsafeTransfer1 = async() => await tk.safeTransferFrom(account1, blackHole, token1, {from: account1});
		const unsafeTransfer2 = async() => await tk.safeTransferFrom(account2, blackHole, token1, {from: account2});

		// initially transfer fails (no token minted)
		await assertThrows(transfer1);
		await assertThrows(transfer2);

		// create one token
		await mint1(tk, account1);

		// transferring someone's else token throws
		await assertThrows(transfer2);
		// unsafe transfer will always fail
		await assertThrows(unsafeTransfer1);
		// token can be transferred safely by its owner
		await transfer1();
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// disable transfers, leaving transfers on behalf enabled
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		// ensure transfer will fail now
		await assertThrows(transfer2);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// unsafe transfer will always fail
		await assertThrows(unsafeTransfer2);
		// transfer token to account3
		await transfer2();
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");

		// now transfer token to the smart contract supporting ERC721
		await transfer3();
		// verify token ownership
		assert.equal(erc721Rc, await tk.ownerOf(token1), "wrong token1 owner after transfer3");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer3");
	});

	it("approvals: grant and revoke token approval", async() => {
		// analogue to smart contract deployment
		const tk = await deployToken();

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const operator = accounts[4]; // approved operator

		// approve functions
		const approve1 = async() => await tk.approve(operator, token1, {from: account1});
		const approve2 = async() => await tk.approve(operator, token1, {from: account2});
		const revoke1 = async() => await tk.revokeApproval(token1, {from: account1});
		const revoke2 = async() => await tk.revokeApproval(token1, {from: account2});

		// impossible to approve non-existent token
		await assertThrows(approve1);

		// create a token
		await mint1(tk, account1);

		// wrong inputs check
		await assertThrows(tk.approve, 0, token1, {from: account1});
		await assertThrows(tk.approve, account1, token1, {from: account1});

		// impossible to approve token which belongs to someone else
		await assertThrows(approve2);
		// impossible to revoke a non-existent approval
		await assertThrows(revoke1);
		// approve own token
		await approve1();
		// verify approval state
		assert.equal(operator, await tk.getApproved(token1), "token1 is not approved");

		// impossible to revoke approval on the token which belongs to someone else
		await assertThrows(revoke2);
		// revoke an approval
		await revoke1();
		// verify approval state
		assert.equal(0, await tk.getApproved(token1), "token1 is still approved");

		// approve own token again
		await approve1();
		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// transfer it to account2
		await tk.transfer(account2, token1, {from: account1});
		// ensure an approval is erased
		assert.equal(0, await tk.getApproved(token1), "token1 is approval is not erased");

		// impossible to approve token which belongs to someone else
		await assertThrows(approve1);
		// impossible to revoke a non-existent approval
		await assertThrows(revoke2);
		// approve the token
		await approve2();
		// verify approval state
		assert.equal(operator, await tk.getApproved(token1), "token1 is not approved (2)");

		// impossible to revoke approval on the token which belongs to someone else
		await assertThrows(revoke1);
		// revoke an approval
		await revoke2();
		// verify approval state
		assert.equal(0, await tk.getApproved(token1), "token1 is still approved (2)");
	});

	it("approvals: add and remove operator", async() => {
		// analogue to smart contract deployment
		const tk = await deployToken();

		// some accounts to work with
		const account1 = accounts[1];
		const operator = accounts[4]; // approved operator

		// wrong inputs check
		await assertThrows(tk.setApprovalForAll, 0, true, {from: account1});
		await assertThrows(tk.setApprovalForAll, account1, true, {from: account1});

		// approve an operator for account 1
		await tk.setApprovalForAll(operator, true, {from: account1});
		// verify operator state
		assert(await tk.isApprovedForAll(account1, operator), "operator is not approved to act on behalf of account1");

		// revoke an approval
		await tk.setApprovalForAll(operator, false, {from: account1});
		// verify approval state
		assert(!await tk.isApprovedForAll(account1, operator), "operator is still approved to act on behalf of account1");
	});

	it("approvals: operator in action", async() => {
		// analogue to smart contract deployment
		const tk = await deployToken();

		// enable transfers on behalf
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];
		const operator = accounts[4]; // approved operator
		const intruder = accounts[5]; // someone who pretends to be an operator

		// create a token
		await mint1(tk, account1);

		// approve an operator for account 1
		await tk.setApprovalForAll(operator, true, {from: account1});

		// define some functions to perform transfer on behalf
		const transfer1 = async(account) => await tk.transferFrom(account1, account2, token1, {from: account});
		const transfer2 = async(account) => await tk.transferFrom(account2, account3, token1, {from: account});

		// intruder cannot perform transfer on behalf
		await assertThrows(transfer1, intruder);
		// nor intruder neither operator cannot transfer token
		// which doesn't belong to an owner specified
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// operator can make a transfer
		await transfer1(operator);
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// account 2 didn't get any approval to an operator
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);

		// approve an operator for account 2
		await tk.setApprovalForAll(operator, true, {from: account2});

		// intruder cannot perform the transfer
		await assertThrows(transfer1, intruder);
		// and operator can
		await transfer2(operator);
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");
	});

	it("transfer on behalf: transferring a token", async() => {
		// analogue to smart contract deployment
		const tk = await deployToken();

		// enable transfers on behalf
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];
		const operator = accounts[4]; // approved operator
		const intruder = accounts[5]; // someone who pretends to be an operator

		// create a token
		await mint1(tk, account1);

		// define approval functions
		const approve1 = async(account) => await tk.approve(account, token1, {from: account1});
		const approve2 = async(account) => await tk.approve(account, token1, {from: account2});

		// approve transfer on behalf
		await approve1(operator);

		// define some functions to perform transfer on behalf
		const transfer1 = async(account) => await tk.transferFrom(account1, account2, token1, {from: account});
		const transfer2 = async(account) => await tk.transferFrom(account2, account3, token1, {from: account});

		// intruder cannot perform transfer on behalf
		await assertThrows(transfer1, intruder);
		// nor intruder neither operator cannot transfer token
		// which doesn't belong to an owner specified
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// operator can make a transfer
		await transfer1(operator);
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// approval is erased after the transfer, transfer on behalf is impossible
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);

		// first token owner cannot approve transfers anymore
		await assertThrows(approve1, intruder);
		// but token owner can
		await approve2(operator);
		// disable transfers on behalf, leaving transfers enabled
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// ensure transfer will fail now
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		// intruder cannot perform the transfer
		await assertThrows(transfer1, intruder);
		// and operator can
		await transfer2(operator);
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");
	});

	it("safe transfer on behalf: transferring a token", async() => {
		// analogue to smart contract deployment
		const tk = await deployToken();
		// another instance will be used to verify ERC721 Receiver requirement
		const blackHole = await deployToken();
		// ERC721 valid receiver
		const erc721Rc = (await ERC721Receiver.new()).address;

		// enable transfers on behalf
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];
		const operator = accounts[4]; // approved operator
		const intruder = accounts[5]; // someone who pretends to be an operator

		// create a token
		await mint1(tk, account1);

		// define approval function
		const approve = async(owner, operator) => await tk.approve(operator, token1, {from: owner});

		// approve transfer on behalf
		await approve(account1, operator);

		// define some functions to perform transfer on behalf
		const transfer1 = async(account) => await tk.safeTransferFrom(account1, account2, token1, {from: account});
		const transfer2 = async(account) => await tk.safeTransferFrom(account2, account3, token1, {from: account});
		const transfer3 = async(account) => await tk.safeTransferFrom(account3, erc721Rc, token1, {from: account});
		const unsafeTransfer1 = async(account) => await tk.safeTransferFrom(account1, blackHole, token1, {from: account});
		const unsafeTransfer2 = async(account) => await tk.safeTransferFrom(account2, blackHole, token1, {from: account});

		// unsafe transfer will always fail
		await assertThrows(unsafeTransfer1, operator);
		// intruder cannot perform transfer on behalf
		await assertThrows(transfer1, intruder);
		// nor intruder neither operator cannot transfer token
		// which doesn't belong to an owner specified
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// operator can make a transfer
		await transfer1(operator);
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// operator is erased after the transfer, transfer on behalf is impossible
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);

		// first token owner cannot approve transfers anymore
		await assertThrows(approve, account1, intruder);
		// but token owner can
		await approve(account2, operator);
		// disable transfers on behalf, leaving transfers enabled
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// ensure transfer will fail now
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		// unsafe transfer will always fail
		await assertThrows(unsafeTransfer2, operator);
		// intruder cannot perform the transfer
		await assertThrows(transfer1, intruder);
		// and operator can
		await transfer2(operator);
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");

		// approve operator again
		await approve(account3, operator);
		// and transfer token to the smart contract supporting ERC721
		await transfer3(operator);
		// verify token ownership
		assert.equal(erc721Rc, await tk.ownerOf(token1), "wrong token1 owner after transfer3");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer3");
	});

});


// import auxiliary functions
import {assertThrows, toBN} from "../scripts/shared_functions";
