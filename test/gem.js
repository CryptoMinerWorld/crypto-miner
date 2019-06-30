const Token = artifacts.require("./GemERC721.sol");

// import ERC721Core dependencies
import {
	ERC721Receiver,
	InterfaceId_ERC165,
	InterfaceId_ERC721,
	InterfaceId_ERC721Exists,
	InterfaceId_ERC721Enumerable,
	InterfaceId_ERC721Metadata,
	FEATURE_TRANSFERS,
	FEATURE_TRANSFERS_ON_BEHALF,
	ROLE_EXT_WRITER,
	ROLE_TOKEN_CREATOR,
	ROLE_STATE_PROVIDER,
	ROLE_TRANSFER_LOCK_PROVIDER,
} from "./erc721_core";

// GemERC721 specific Features and Roles
import {
	ROLE_LEVEL_PROVIDER,
	ROLE_GRADE_PROVIDER,
	ROLE_AGE_PROVIDER,
	ROLE_MINED_STATS_PROVIDER,
	ROLE_NEXT_ID_PROVIDER,
} from "./erc721_core";

// initial nextId is 0x20001
const NEXT_ID = 0x20001;

// some default gem props
const token1 = 0x401;
const token2 = 0x402;
const gradeType1 = 1;
const gradeValue1 = 1;
const grade1 = gradeType1 << 24 | gradeValue1;
// a function to mint some default token
async function mint1(tk, acc) {
	await tk.mint(acc, token1, 1, 1, 1, grade1);
}

// standard function to instantiate token
async function deployToken() {
	return await Token.new();
}

// timestamp right before the test begins
const now = new Date().getTime() / 1000 | 0;

// tests for Gem ERC721 token
contract('GemERC721', function(accounts) {

	it("initial state: initial zero values, supported interfaces", async() => {
		// instantiate token instance
		const tk = await deployToken();

		// some account to work with
		const account1 = accounts[1];

		// verify supported interfaces
		assert(await tk.supportsInterface(InterfaceId_ERC165), "InterfaceId_ERC165 not found");
		//assert(await tk.supportsInterface(InterfaceId_ERC721), "InterfaceId_ERC721 not found");
		assert(await tk.supportsInterface(InterfaceId_ERC721Exists), "InterfaceId_ERC721Exists not found");
		assert(await tk.supportsInterface(InterfaceId_ERC721Enumerable), "InterfaceId_ERC721Enumerable not found");
		assert(await tk.supportsInterface(InterfaceId_ERC721Metadata), "InterfaceId_ERC721Metadata not found");

		// verify zero values
		assert.equal(0, (await tk.getPackedCollection(account1)).length, "non-empty initial packed collection for account1");
		assert.equal(0, (await tk.getCollection(account1)).length, "non-empty initial token collection for account1");
		assert.equal(0, await tk.totalSupply(), "non-zero initial token total supply");
		assert.equal(0, await tk.balanceOf(account1), "non-zero initial balance for account1");
		assert(!await tk.exists(0x401), "token 1 already exists initially");

		// create one token
		await mint1(tk, account1);

		// verify same values to be equal one
		assert.equal(1, (await tk.getAllTokens()).length, "empty all tokens collection");
		assert.equal(1, (await tk.getPackedCollection(account1)).length, "empty packed collection for account1");
		assert.equal(1, (await tk.getCollection(account1)).length, "empty token collection for account1");
		assert.equal(1, await tk.totalSupply(), "zero token total supply");
		assert.equal(1, await tk.balanceOf(account1), "zero balance for account1");
		assert(await tk.exists(0x401), "token doesn't exist after minting");

		// balance of zero address fails
		await assertThrows(tk.balanceOf, 0);

		// extended functions
		assert.equal(NEXT_ID, await tk.nextId(), "wrong initial value of nextId");
		assert.equal(0, await tk.read(1, 0, 8), "wrong initial read for 1/0/8");
		assert.equal(0, await tk.read(1, 0, 256), "wrong initial read for 1/0/256");
	});
	it("initial state: throwable functions", async() => {
		// instantiate token instance
		const tk = await deployToken();

		// some account to work with
		const account1 = accounts[1];

		// define function that throw initially
		const getPacked = async() => await tk.getPacked(token1);
		const getPlotId = async() => await tk.getPlotId(token1);
		const getPropertiesModified = async() => await tk.getPropertiesModified(token1);
		const getProperties = async() => await tk.getProperties(token1);
		const getColor = async() => await tk.getColor(token1);
		const getLevel = async() => await tk.getLevel(token1);
		const getGrade = async() => await tk.getGrade(token1);
		const getGradeType = async() => await tk.getGradeType(token1);
		const getGradeValue = async() => await tk.getGradeValue(token1);
		const getPlotsMined = async() => await tk.getPlotsMined(token1);
		const getBlocksMined = async() => await tk.getBlocksMined(token1);
		const getAge = async() => await tk.getAge(token1);
		const getModified = async() => await tk.getModified(token1);
		const getStateModified = async() => await tk.getStateModified(token1);
		const getState = async() => await tk.getState(token1);
		const isTransferable = async() => await tk.isTransferable(token1);
		const getCreationTime = async() => await tk.getCreationTime(token1);
		const getOwnershipModified = async() => await tk.getOwnershipModified(token1);
		const tokenByIndex = async() => await tk.tokenByIndex(0);
		const tokenOfOwnerByIndex = async() => await tk.tokenOfOwnerByIndex(account1, 0);
		const ownerOf = async() => await tk.ownerOf(token1);
		const getApproved = async() => await tk.getApproved(token1);
		const tokenURI = async() => await tk.tokenURI(token1);

		// check all these functions throw
		await assertThrows(getPacked);
		await assertThrows(getPlotId);
		await assertThrows(getPropertiesModified);
		await assertThrows(getProperties);
		await assertThrows(getColor);
		await assertThrows(getLevel);
		await assertThrows(getGrade);
		await assertThrows(getGradeType);
		await assertThrows(getGradeValue);
		await assertThrows(getPlotsMined);
		await assertThrows(getBlocksMined);
		await assertThrows(getAge);
		await assertThrows(getModified);
		await assertThrows(getStateModified);
		await assertThrows(getState);
		await assertThrows(isTransferable);
		await assertThrows(getCreationTime);
		await assertThrows(getOwnershipModified);
		await assertThrows(tokenByIndex);
		await assertThrows(tokenOfOwnerByIndex);
		await assertThrows(ownerOf);
		await assertThrows(getApproved);
		await assertThrows(tokenURI);

		// create one token
		await mint1(tk, account1);

		// now the functions which throw should not throw anymore
		await getPacked();
		await getPlotId();
		await getPropertiesModified();
		await getProperties();
		await getColor();
		await getLevel();
		await getGrade();
		await getGradeType();
		await getGradeValue();
		await getPlotsMined();
		await getBlocksMined();
		await getAge();
		await getModified();
		await getStateModified();
		await getState();
		await isTransferable();
		await getCreationTime();
		await getOwnershipModified();
		await tokenByIndex();
		await tokenOfOwnerByIndex();
		await ownerOf();
		await getApproved();
		await tokenURI();
	});

	it("integrity: verify minted token data integrity", async() => {
		// instantiate token instance
		const tk = await deployToken();

		// some account to work with
		const account1 = accounts[1];

		// define some token properties
		const plotId = 17;
		const colorId = 11;
		const levelId = 5;
		const gradeType = 3;
		const gradeValue = 11;
		const age = 60;
		const grade = gradeType << 24 | gradeValue;
		const properties = toBN(colorId).shln(8).or(toBN(levelId)).shln(32).or(toBN(grade));

		// create two tokens
		await tk.mintWith(account1, token1, plotId, colorId, levelId, grade, age);
		await tk.mint(account1, token2, plotId, colorId, levelId, grade);

		// extract token1 creation time to be used later
		const creation1 = await tk.getCreationTime(token1);
		const creation2 = await tk.getCreationTime(token2);

		// verify simple (non-packed) getters
		assert.equal(plotId, await tk.getPlotId(token1), "token1 has wrong plotId");
		assert.equal(0, await tk.getPropertiesModified(token1), "token1 has non-zero propertiesModified");
		assert(properties.eq(await tk.getProperties(token1)), "token1 has wrong properties");
		assert.equal(colorId, await tk.getColor(token1), "token1 has wrong color");
		assert.equal(levelId, await tk.getLevel(token1), "token1 has wrong level");
		assert.equal(grade, await tk.getGrade(token1), "token1 has wrong grade");
		assert.equal(gradeType, await tk.getGradeType(token1), "token1 has wrong gradeType");
		assert.equal(gradeValue, await tk.getGradeValue(token1), "token1 has wrong gradeValue");
		assert.equal(age, await tk.getAge(token1), "token1 has wrong age");
		assert.equal(0, await tk.getAge(token2), "token2 has non-zero age");
		assert(creation1.eq(await tk.getModified(token1)), "token1 has wrong modified time");
		assert.equal(0, await tk.getStateModified(token1), "token1 has wrong stateModified");
		assert.equal(0, await tk.getState(token1), "token1 has non-zero state");
		assert(await tk.isTransferable(token1), "token1 is not transferable");
		assert(!creation1.isZero(), "token1 has zero creation time");
		assert.equal(0, await tk.getOwnershipModified(token1), "token1 1 has wrong ownershipModified");
		assert.equal(token1, await tk.tokenByIndex(0), "wrong token ID at index 0");
		assert.equal(token1, await tk.tokenOfOwnerByIndex(account1, 0), "wrong token ID at index 0 owned by account1");
		assert.equal(account1, await tk.ownerOf(token1), "wrong owner of token1");
		assert.equal(0, await tk.getApproved(token1), "token1 should not be approved yet");
		assert.equal("http://cryptominerworld.com/gem/" + token1, await tk.tokenURI(token1), "wrong token1 URI");

		// complex and packed getters
		assert.deepEqual([toBN(token1), toBN(token2)], await tk.getAllTokens(), "wrong all tokens collection");
		assert.deepEqual([toBN(token1), toBN(token2)], await tk.getCollection(account1), "wrong token collection for account1");

		// calculate token1 and token2 packed structures
		const packed1 = creation1.shln(32).or(creation1).shln(32).or(toBN(grade)).shln(8).or(toBN(levelId)).shln(24).shln(32).shln(32).or(toBN(age)).shln(32).shln(8).or(toBN(colorId)).shln(24).or(toBN(token1));
		const packed2 = creation2.shln(32).or(creation2).shln(32).or(toBN(grade)).shln(8).or(toBN(levelId)).shln(24).shln(32).shln(32).shln(32).shln(8).or(toBN(colorId)).shln(24).or(toBN(token2));
		// compare with packed collection getter
		assertArraysEqual([packed1, packed2], await tk.getPackedCollection(account1), "account1 has wrong packed collection");

		// calculate token1 extended packed structure
		const fullPacked1 = [
			toBN(plotId).shln(8).or(toBN(colorId)).shln(8).or(toBN(levelId)).shln(32).or(toBN(grade)).shln(32).shln(24).shln(32).shln(32).or(toBN(age)).shln(32).shln(32),
			creation1.shln(32).shln(32).shln(160).or(toBN(account1))
		];
		// compare with the packed getter
		assertArraysEqual(fullPacked1, await tk.getPacked(token1), "token1 wrong getPacked");
	});

	it("nextId: incNextId requires ROLE_NEXT_ID_PROVIDER permission", async() => {
		// deploy token
		const tk = await deployToken();

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await tk.incNextId({from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await tk.updateRole(operator, ROLE_NEXT_ID_PROVIDER);
		// fn succeeds
		await fn();

		// next Id counter incremented by one
		assert.equal(NEXT_ID + 1, await tk.nextId(), "wrong nextId counter value");
	});
	it("nextId: setNextId requires ROLE_NEXT_ID_PROVIDER permission", async() => {
		// deploy token
		const tk = await deployToken();

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await tk.setNextId(1, {from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await tk.updateRole(operator, ROLE_NEXT_ID_PROVIDER);
		// fn succeeds
		await fn();

		// next Id counter set to one
		assert.equal(1, await tk.nextId(), "wrong nextId counter value");
	});
	it("nextId: incNextId/setNextId arithmetic overflow checks", async() => {
		// deploy token
		const tk = await deployToken();

		// define the function to check permissions for
		const fn1 = async() => await tk.setNextId(16777214);
		const fn2 = async() => await tk.incNextId();
		const fn3 = async() => await tk.setNextId(0);

		// fn3 always throws
		await assertThrows(fn3);
		// fn1 and fn2 initially succeed
		await fn1();
		await fn2();

		// now counter is 16777215 and is ready to overflow
		await assertThrows(fn2);
		// fn3 always throws
		await assertThrows(fn3);

		// fn2 succeed again after call to fn1
		await fn1();
		await fn2();

		// next Id counter reached its maximum
		assert.equal(16777215, await tk.nextId(), "wrong nextId counter value");
	});

	it("minting: minting a token requires ROLE_TOKEN_CREATOR role", async() => {
		// deploy token
		const tk = await deployToken();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// define a function to check
		const fn = async() => await tk.mint(account1, token1, 1, 1, 1, grade1, {from: account1});

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_TOKEN_CREATOR);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("minting: mintWith() requires ROLE_AGE_PROVIDER role if age is set", async() => {
		// deploy token
		const tk = await deployToken();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// define a function to check
		const fn = async() => await tk.mintWith(account1, token1, 1, 1, 1, grade1, 1, {from: account1});

		// give a permission required to create token
		await tk.updateRole(account1, ROLE_TOKEN_CREATOR);

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_TOKEN_CREATOR | ROLE_AGE_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("minting: mintNext() requires ROLE_NEXT_ID_PROVIDER role", async() => {
		// deploy token
		const tk = await deployToken();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// define a function to check
		const fn = async() => await tk.mintNext(account1, 1, 1, 1, grade1, {from: account1});

		// give a permission required to create token
		await tk.updateRole(account1, ROLE_TOKEN_CREATOR);

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_TOKEN_CREATOR | ROLE_NEXT_ID_PROVIDER);

		// verify that given the permissions required function doesn't fail
		// TODO: according to the ABI, this function returns tokenId – can we validate it?
		await fn();

		// verify token NEXT_ID exists
		assert(await tk.exists(NEXT_ID), "token NEXT_ID doesn't exist after mintNext()");
	});
	it("minting: mint() constraints and function", async() => {
		// deploy token
		const tk = await deployToken();

		// some valid owner address
		const account1 = accounts[1];

		// wrong input parameters fail
		await assertThrows(tk.mint, account1, 0, 1, 1, 1, grade1);
		await assertThrows(tk.mint, ZERO_ADDR, 1, 1, 1, 1, grade1);
		await assertThrows(tk.mint, tk.address, 1, 1, 1, 1, grade1);

		// a function to mint valid token
		const fn = async() => await tk.mint(account1, 1, 1, 1, 1, grade1);

		// valid input succeeds
		await fn();
		// minting same token twice is impossible
		await assertThrows(fn);

		// verify token existence
		assert(await tk.exists(1), "token 1 doesn't exist after minting");
	});
	it("minting: mintNext() increases nextId", async() => {
		// deploy token
		const tk = await deployToken();

		// some valid owner address
		const account1 = accounts[1];

		// define a function to mint next token in a sequence
		const fn = async() => await tk.mintNext(account1, 1, 1, 1, grade1);

		// execute this function few times
		await fn();
		await fn();
		await fn();

		// verify NEXT_ID token existence
		assert(await tk.exists(NEXT_ID), "token NEXT_ID doesn't exist");
		// verify nextId counter increased properly
		assert.equal(NEXT_ID + 3, await tk.nextId(), "wrong nextId() after minting 3 tokens")
	});

	it("leveling: levelUpTo() requires ROLE_LEVEL_PROVIDER role", async() => {
		// deploy token
		const tk = await deployToken();

		// some valid owner address
		const account1 = accounts[1];

		// non-admin account to act on behalf of
		const operator = accounts[2];

		// mint some token
		await mint1(tk, account1);

		// define a function to check
		const fn = async() => await tk.levelUpTo(token1, 2, {from: operator});

		// ensure function fails if operator has no role required
		await assertThrows(fn);

		// give a permission required to the operator
		await tk.updateRole(operator, ROLE_LEVEL_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("leveling: levelUpTo() constraints and function", async() => {
		// deploy token
		const tk = await deployToken();

		// some account to mint token to
		const account1 = accounts[1];

		// mint some token
		await mint1(tk, account1);

		// try wrong inputs
		await assertThrows(tk.levelUpTo, token1, 0); // level must increase
		await assertThrows(tk.levelUpTo, token1, 1); // level must increase

		// define a correct level up function
		const fn = async() => await tk.levelUpTo(token1, 2);

		// execute correct function
		await fn();
		// second call fails - level must increase
		await assertThrows(fn);

		// verify the execution result
		assert.equal(2, await tk.getLevel(token1), "wrong token level after leveling up");
		assert((await tk.getPropertiesModified(token1)).gt(toBN(now)), "wrong properties modified after leveling up");
	});
	it("leveling: levelUpBy() requires ROLE_LEVEL_PROVIDER role", async() => {
		// deploy token
		const tk = await deployToken();

		// some valid owner address
		const account1 = accounts[1];

		// non-admin account to act on behalf of
		const operator = accounts[2];

		// mint some token
		await mint1(tk, account1);

		// define a function to check
		const fn = async() => await tk.levelUpBy(token1, 1, {from: operator});

		// ensure function fails if operator has no role required
		await assertThrows(fn);

		// give a permission required to the operator
		await tk.updateRole(operator, ROLE_LEVEL_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("leveling: levelUpBy() constraints and function", async() => {
		// deploy token
		const tk = await deployToken();

		// some account to mint token to
		const account1 = accounts[1];

		// mint some token
		await mint1(tk, account1);

		// try wrong inputs
		await assertThrows(tk.levelUpBy, token1, 0); // level must increase

		// define a correct level up function
		const fn = async() => await tk.levelUpBy(token1, 200);

		// execute correct function
		await fn();
		// second call fails due to int overflow
		await assertThrows(fn);

		// verify the execution result
		assert.equal(201, await tk.getLevel(token1), "wrong token level after leveling up");
		assert((await tk.getPropertiesModified(token1)).gt(toBN(now)), "wrong properties modified after leveling up");
	});

	it("upgrading: upgrade() requires ROLE_GRADE_PROVIDER role", async() => {
		// deploy token
		const tk = await deployToken();

		// some valid owner address
		const player = accounts[1];

		// non-admin account to act on behalf of
		const operator = accounts[2];

		// mint some token
		await mint1(tk, player);

		// define a function to check
		const fn = async() => await tk.upgrade(token1, grade1 + 1, {from: operator});

		// ensure function fails if operator has no role required
		await assertThrows(fn);

		// give a permission required to the operator
		await tk.updateRole(operator, ROLE_GRADE_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("upgrading: upgrade() constraints and function", async() => {
		// deploy token
		const tk = await deployToken();

		// some account to mint token to
		const account1 = accounts[1];

		// mint some token
		await mint1(tk, account1);

		// try wrong inputs
		await assertThrows(tk.upgrade, token1, 1); // grade must increase
		await assertThrows(tk.upgrade, token1, grade1); // grade must increase

		// define a correct upgrade function
		const fn = async() => await tk.upgrade(token1, grade1 + 1);

		// execute correct function
		await fn();
		// second call fails - grade must increase
		await assertThrows(fn);

		// verify the execution result
		assert.equal(grade1 + 1, await tk.getGrade(token1), "wrong token grade after upgrading");
		assert.equal(gradeType1, await tk.getGradeType(token1), "wrong token grade type after upgrading");
		assert.equal(gradeValue1 + 1, await tk.getGradeValue(token1), "wrong token grade value after upgrading");
		assert((await tk.getPropertiesModified(token1)).gt(toBN(now)), "wrong properties modified after upgrading");
	});

	it("mining stats: updateMinedStats() requires ROLE_MINED_STATS_PROVIDER role", async() => {
		// deploy token
		const tk = await deployToken();

		// some valid owner address
		const account1 = accounts[1];

		// non-admin account to act on behalf of
		const operator = accounts[2];

		// mint some token
		await mint1(tk, account1);

		// define a function to check
		const fn = async() => await tk.increaseMinedCounters(token1, 1, 1, {from: operator});

		// ensure function fails if operator has no role required
		await assertThrows(fn);

		// give a permission required to the operator
		await tk.updateRole(operator, ROLE_MINED_STATS_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("mining stats: updateMinedStats() constraints and function", async() => {
		// deploy token
		const tk = await deployToken();

		// some account to mint token to
		const account1 = accounts[1];

		// mint some token
		await mint1(tk, account1);

		// the only check here is int overflow check
		// define few correct functions which overflow if executed twice
		const fn1 = async() => await tk.increaseMinedCounters(token1, 0, 0xABCDEF00);
		const fn2 = async() => await tk.increaseMinedCounters(token1, 0xABCDEF, 0);

		// in both cases first call succeeds, second overflows
		await fn1();
		await assertThrows(fn1);
		await fn2();
		await assertThrows(fn2);

		// verify the results
		assert.equal(0xABCDEF, await tk.getPlotsMined(token1), "wrong plots mined counter");
		assert.equal(0xABCDEF00, await tk.getBlocksMined(token1), "wrong blocks mined counter");
		assert((await tk.getStateModified(token1)).gt(toBN(now)), "wrong state modified after updating mining stats");
	});

	it("age: setAge() requires ROLE_AGE_PROVIDER role", async() => {
		// deploy token
		const tk = await deployToken();

		// some valid owner address
		const account1 = accounts[1];

		// non-admin account to act on behalf of
		const operator = accounts[2];

		// mint some token
		await mint1(tk, account1);

		// define a function to check
		const fn = async() => await tk.setAge(token1, 1, {from: operator});

		// ensure function fails if operator has no role required
		await assertThrows(fn);

		// give a permission required to the operator
		await tk.updateRole(operator, ROLE_AGE_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("age: setAge() constraints and function", async() => {
		const tk = await deployToken();

		// some account to mint token to
		const account1 = accounts[1];

		// mint some token
		await mint1(tk, account1);

		// set the age
		await tk.setAge(token1, 1);

		// verify the result
		assert.equal(1, await tk.getAge(token1), "wrong token age after setting it to 1");
		assert((await tk.getStateModified(token1)).gt(toBN(now)), "wrong state modified after setting the age");
	});


	// ========== ERC721 Locking tests ==========

	it("state: changing token state requires ROLE_STATE_PROVIDER role", async() => {
		// deploy token
		const tk = await deployToken();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// mint some token
		await mint1(tk, account1);

		// define a function to check
		const fn = async() => await tk.setState(token1, 1, {from: account1});

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_STATE_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("state: modify token state and check", async() => {
		// deploy token
		const tk = await deployToken();

		// some random state value
		const state = Math.floor(Math.random() * 4294967296);

		// a function to set new token state
		const setState = async() => await tk.setState(token1, state);

		// impossible to set state for non-existent token
		await assertThrows(setState);

		// create one token
		await mint1(tk, accounts[1]);

		// first time setting a state succeeds
		await setState();

		// next time setting a state succeeds again - state modification date only
		await setState();

		// verify new state
		assert.equal(state, await tk.getState(token1), "wrong token1 state");

		// verify state modification date
		assert(await tk.getStateModified(token1) > now, "wrong token1 state modification date");
	});

	it("transfer locking: modifying transfer lock requires ROLE_TRANSFER_LOCK_PROVIDER role", async() => {
		// deploy token
		const tk = await deployToken();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// transfer lock value to set
		const lock = Math.floor(Math.random() * 4294967296);

		// define a function to check
		const fn = async() => await tk.setTransferLock(lock, {from: account1});

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_TRANSFER_LOCK_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();

		// verify transfer lock was set correctly
		assert.equal(lock, await tk.transferLock(), "incorrect value for transfer lock");
	});
	it("transfer locking: impossible to transfer locked token", async() => {
		// deploy token
		const tk = await deployToken();

		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];

		// define transfer token functions
		const transfer1 = async() => await tk.transfer(account2, token1, {from: account1});

		// create one token
		await mint1(tk, account1);

		// set token state to 2
		await tk.setState(token1, 2);

		// set token transfer lock to 2 as well
		await tk.setTransferLock(2);

		// ensure token cannot be transferred
		assert(!await tk.isTransferable(token1), "token1 is still transferable");

		// locked token (state & transferLock != 0) cannot be transferred
		await assertThrows(transfer1);

		// set token transfer lock to 4
		await tk.setTransferLock(4);

		// ensure token can be transferred
		assert(await tk.isTransferable(token1), "token1 is not transferable");
		// once token is unlocked (state & transferLock == 0) it can be transferred
		await transfer1();
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");
	});
	it("transfer locking: change transfer lock and check", async() => {
		// deploy token
		const tk = await deployToken();

		// some random transfer lock value
		const lock = Math.floor(Math.random() * 4294967296);

		// a function to set transfer lock
		const setLock = async() => await tk.setTransferLock(lock);

		// first time setting a lock succeeds
		const gasUsed1 = (await setLock()).receipt.gasUsed;

		// next time setting a lock succeeds again,
		// but doesn't modify storage, so the gas consumption is low
		const gasUsed2 = (await setLock()).receipt.gasUsed;

		// verify gas consumption is at least 5,000 lower
		assert(gasUsed1 - gasUsed2 >= 5000, "wrong gas consumption difference");

		// verify new transfer lock
		assert.equal(lock, await tk.transferLock(), "wrong transfer lock");
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
		// deploy token
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
		// deploy token
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
		// deploy token
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
		// deploy token
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
		// deploy token
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
		// deploy token
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
		// deploy token
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
		// deploy token
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
import {assertThrows, assertArraysEqual, toBN, ZERO_ADDR} from "../scripts/shared_functions";
