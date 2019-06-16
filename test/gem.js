const Token = artifacts.require("./GemERC721.sol");

// import ERC721Core dependencies
import {
	InterfaceId_ERC165,
	InterfaceId_ERC721Enumerable,
	InterfaceId_ERC721Exists,
	InterfaceId_ERC721Metadata,
	FEATURE_TRANSFERS,
	FEATURE_TRANSFERS_ON_BEHALF,
	ROLE_TOKEN_CREATOR,
	ROLE_EXT_WRITER,
	ROLE_STATE_PROVIDER,
	ROLE_TRANSFER_LOCK_PROVIDER
} from "./erc721_core";

// GemERC721 specific Features and Roles
import {
	ROLE_LEVEL_PROVIDER,
	ROLE_GRADE_PROVIDER,
	ROLE_AGE_PROVIDER,
	ROLE_NEXT_ID_INC,
	ROLE_AVAILABLE_COLORS_PROVIDER
} from "./erc721_core";

// some default gem props
const token1 = 0x401;
const token2 = 0x402;
const grade1 = 0x1000001;
// a function to mint default grade gem
async function mint1(tk, acc) {
	await tk.mint(acc, token1, 1, 1, 1, grade1);
}

contract('GemERC721', function(accounts) {

	it("initial state: initial zero values, supported interfaces", async() => {
		// instantiate token instance
		const tk = await Token.new();

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
		assert.equal(0x12500, await tk.nextId(), "wrong initial value of nextId");
		assertArraysEqual([1, 2, 5, 6, 7, 9, 10], await tk.getAvailableColors(), "incorrect initial value for available colors array");
		assert.equal(0, await tk.read(1, 0, 8), "wrong initial read for 1/0/8");
		assert.equal(0, await tk.read(1, 0, 256), "wrong initial read for 1/0/256");
	});
	it("initial state: throwable functions", async() => {
		// instantiate token instance
		const tk = await Token.new();

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
		const tk = await Token.new();

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
		assert(creation1.gt(toBN(0)), "token1 has zero creation time");
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
	it("mint: creating a token", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 1, 1, grade1);
		await assertThrows(tk.mint, accounts[0], 0x000, 1, 1, 1, grade1);
		await assertThrows(tk.mint, accounts[0], 0x401, 1, 1, 1, grade1);
		await assertThrows(tk.mint, 0, 0x402, 1, 1, 1, grade1);
		await assertThrows(tk.mint, tk.address, 0x403, 1, 1, 1, grade1);
		assert.equal(1, await tk.totalSupply(), "wrong totalSupply value after minting a token");
		await assertThrows(tk.mint, accounts[1], 0x402, 1, 1, 1, grade1, {from: accounts[1]});
		await tk.mint(accounts[1], 0x402, 1, 1, 1, grade1);
		assert.equal(2, await tk.totalSupply(), "wrong totalSupply value after minting two tokens");
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " has wrong balance after minting a token");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " has wrong balance after minting a token");
		assert.equal(0, await tk.balanceOf(accounts[2]), accounts[2] + " has wrong initial balance");
	});

	it("transfer: transferring a token", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(FEATURE_TRANSFERS);
		const fn = async () => await tk.transfer(accounts[1], 0x401);
		await assertThrows(fn);
		await tk.updateFeatures(0);
		await tk.mint(accounts[0], 0x401, 1, 1, 1, 1);
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance before token transfer");
		assert.equal(0, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		await assertThrows(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await assertThrows(tk.transfer, 0x0, 0x401);
		await assertThrows(tk.transfer, accounts[0], 0x401);
		await fn();
		assert.equal(0, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance after token transfer");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		assert.equal(accounts[1], await tk.ownerOf(0x401), "wrong token 0x401 owner after token transfer");
	});
	it("transfer: transferring a locked token", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await tk.mint(accounts[0], 0x401, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 1, 1, 1);
		await assertThrows(tk.setTransferLock, 0x1, {from: accounts[1]});
		await tk.setTransferLock(0x1);
		await tk.setState(0x401, 0x1);
		await tk.setState(0x402, 0x1);
		const fn1 = async () => await tk.transfer(accounts[1], 0x401);
		const fn2 = async () => await tk.transfer(accounts[1], 0x402);
		await assertThrows(fn1);
		await assertThrows(fn2);
		await tk.setState(0x401, 0x2);
		await fn1();
		await tk.setTransferLock(0x2);
		await fn2();
		const fn = async () => await tk.transfer(accounts[2], 0x401, {from: accounts[1]});
		await assertThrows(fn);
		await tk.setTransferLock(0x3);
		await assertThrows(fn);
		await tk.setTransferLock(0x4);
		await fn();
		assert.equal(accounts[1], await tk.ownerOf(0x402), "wrong token 0x402 owner");
		assert.equal(accounts[2], await tk.ownerOf(0x401), "wrong token 0x401 owner");
	});

	it("transferFrom: transferring on behalf", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[1], 0x401, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 1, 1, 1);
		const fn1 = async () => await tk.transferFrom(accounts[1], accounts[2], 0x401);
		await assertThrows(tk.approve, accounts[0], 0x401);
		await assertThrows(tk.approve, accounts[0], 0x402);
		await assertThrows(fn1);
		await tk.approve(accounts[0], 0x401, {from: accounts[1]});
		await tk.revokeApproval(0x401, {from: accounts[1]});
		await assertThrows(tk.revokeApproval, 0x401, {from: accounts[1]});
		await tk.approve(accounts[0], 0x401, {from: accounts[1]});
		await fn1();
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await tk.approve(accounts[2], 0x402);
		const fn = async () => await tk.transferFrom(accounts[0], accounts[1], 0x402, {from: accounts[2]});
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await assertThrows(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await fn();
		assert.equal(accounts[1], await tk.ownerOf(0x402), "wrong token 0x402 owner after transfer on behalf");
		assert.equal(accounts[2], await tk.ownerOf(0x401), "wrong token 0x401 owner after transfer on behalf");
	});

	it("safeTransferFrom: safe transfer token to address", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], 0x401, 1, 1, 1, 1);
		await tk.safeTransferFrom(accounts[0], accounts[1], 0x401);
		assert.equal(accounts[1], await tk.ownerOf(0x401), "token 0x401 has wrong owner after safely transferring it");
	});
	it("safeTransferFrom: impossible to safe transfer to a smart contract", async function() {
		const tk = await Token.new();
		const another = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], 0x401, 1, 1, 1, 1);
		await assertThrows(tk.safeTransferFrom, accounts[0], another.address, 0x401);
		await assertThrows(tk.safeTransferFrom, accounts[0], tk.address, 0x401);
		assert.equal(accounts[0], await tk.ownerOf(0x401), "card 0x401 has wrong owner after bad attempt to transfer it");
		await tk.safeTransferFrom(accounts[0], accounts[1], 0x401);
		assert.equal(accounts[1], await tk.ownerOf(0x401), "token 0x401 has wrong owner after safely transferring it");
	});

	it("approve: approve and transfer on behalf", async function () {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], 0x401, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x403, 1, 1, 1, 1);
		await assertThrows(tk.approve, 0x0, 0x0);
		await assertThrows(tk.approve, accounts[0], 0x401);
		await tk.approve(accounts[1], 0x401);
		await tk.approve(accounts[1], 0x402);
		assert.equal(accounts[1], await tk.getApproved(0x401), "wrong approved operator for token 0x401");
		await tk.transferFrom(accounts[0], accounts[1], 0x401, {from: accounts[1]});
		await tk.transferFrom(accounts[0], accounts[1], 0x402, {from: accounts[1]});
		assert.equal(0, await tk.getApproved(0x401), "wrong approved operator for token 0x401 after transfer");
	});
	it("approve: approve all and transfer on behalf", async function () {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], 0x401, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x403, 1, 1, 1, 1);
		await assertThrows(tk.setApprovalForAll, 0x0, true);
		await assertThrows(tk.setApprovalForAll, accounts[0], true);
		await tk.setApprovalForAll(accounts[1], true);
		await tk.transferFrom(accounts[0], accounts[1], 0x401, {from: accounts[1]});
		await tk.transferFrom(accounts[0], accounts[1], 0x402, {from: accounts[1]});
		assert(await tk.isApprovedForAll(accounts[0], accounts[1]), "should be approved operator");
		await tk.setApprovalForAll(accounts[1], false);
		assert(!await tk.isApprovedForAll(accounts[0], accounts[1]), "should not be approved operator");
	});

	it("level up: full cycle", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 1, 1, 1);
		await tk.levelUpBy(0x401, 1);
		assert.equal(2, await tk.getLevel(0x401), "wrong gem 0x401 level after leveling up");
		await assertThrows(tk.levelUpBy, 0x402, 1);
		await assertThrows(tk.levelUpBy, 0x402, 1, {from: accounts[1]});
	});

	it("update grade: full cycle", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 1, 1, 1);
		await tk.upgrade(0x401, 0x01000002);
		assert.equal(0x01000002, await tk.getGrade(0x401), "wrong gem 0x401 grade after modifying a grade");
		assert.equal(0x01, await tk.getGradeType(0x401), "wrong gem 0x401 grade level after modifying a grade");
		assert.equal(0x02, await tk.getGradeValue(0x401), "wrong gem 0x401 grade value after modifying a grade");
		await assertThrows(tk.upgrade, 0x401, 0x01000002);
		await assertThrows(tk.upgrade, 0x402, 0x01000003);
		await assertThrows(tk.upgrade, 0x401, 0x01000003, {from: accounts[1]});
		await tk.upgrade(0x401, 0x01000003);
	});

	it("set state: full cycle", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 1, 1, 1);
		await tk.setState(0x401, 0x0102);
		assert.equal(0x0102, await tk.getState(0x401), "wrong gem 0x401 state after setting a state");
		await assertThrows(tk.setState, 0x402, 0x0103);
		await assertThrows(tk.setState, 0x401, 0x0103, {from: accounts[1]});
		await tk.setState(0x401, 0x0103);
	});

	it("getters: throw on non-existent token", async function() {
		const tk = await Token.new();
		await assertThrows(tk.getPacked, 0x401);
		await assertThrows(tk.getPlotId, 0x401);
		await assertThrows(tk.getProperties, 0x401);
		await assertThrows(tk.getColor, 0x401);
		await assertThrows(tk.getLevelModified, 0x401);
		await assertThrows(tk.getLevel, 0x401);
		await assertThrows(tk.getGradeModified, 0x401);
		await assertThrows(tk.getGrade, 0x401);
		await assertThrows(tk.getAgeModified, 0x401);
		await assertThrows(tk.getAge, 0x401);
		await assertThrows(tk.getStateModified, 0x401);
		await assertThrows(tk.getState, 0x401);
		await assertThrows(tk.getCreationTime, 0x401);
		await assertThrows(tk.getOwnershipModified, 0x401);
		await assertThrows(tk.ownerOf, 0x401);
	});

	it("security: incrementId requires ROLE_NEXT_ID_INC permission", async() => {
		// deploy Gem Extension
		const tk = await Token.new();

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await tk.incrementId({from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await tk.updateRole(operator, ROLE_NEXT_ID_INC);
		// fn succeeds
		await fn();

		// next Id counter incremented by one
		assert.equal(0x12501, await tk.nextId(), "wrong nextId counter value");
	});
	it("security: write requires ROLE_EXT_WRITER permission", async() => {
		// deploy Gem Extension
		const tk = await Token.new();

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
	it("security: setAvailableColors requires ROLE_AVAILABLE_COLORS_PROVIDER permission", async() => {
		// deploy Gem Extension
		const tk = await Token.new();

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await tk.setAvailableColors([1, 2, 3], {from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await tk.updateRole(operator, ROLE_AVAILABLE_COLORS_PROVIDER);
		// fn succeeds
		await fn();

		// available colors array updated
		assertArraysEqual([1, 2, 3], await tk.getAvailableColors(), "incorrect value for available colors array");
	});

	it("read/write: verify integrity of read/write operation", async() => {
		// deploy Gem Extension
		const tk = await Token.new();

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

	it("colors: verify integrity of set/get available colors operation", async() => {
		// deploy Gem Extension
		const tk = await Token.new();

		// ensure empty colors array cannot be set
		await assertThrows(tk.setAvailableColors, []);

		// set and get several colors randomly
		for(let i = 0; i < 10; i++) {
			const length = Math.ceil(Math.random() * 12);
			const colors = new Array(length);
			for(let j = 0; j < length; j++) {
				colors[j] = Math.ceil(Math.random() * 12);
			}
			// set the available colors
			await tk.setAvailableColors(colors);
			// verify available colors are set correctly
			assertArraysEqual(colors, await tk.getAvailableColors(), "incorrect available colors array " + i);
		}
	});
});


// import auxiliary function to ensure function `fn` throws
import {assertThrows, assertArraysEqual, toBN} from "../scripts/shared_functions";
