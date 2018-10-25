const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
const ROLE_TOKEN_CREATOR = 0x00040000;

const Token = artifacts.require("./GemERC721.sol");

contract('GemERC721', function(accounts) {
	it("initial state: no tokens exist initially", async function() {
		const tk = await Token.new();
		assert.equal(0, await tk.totalSupply(), "wrong initial totalSupply value");
		assert.equal(0, await tk.balanceOf(accounts[0]), "wrong initial balanceOf() value");
		await assertThrowsAsync(async function() {await tk.tokenByIndex(0);});
		await assertThrowsAsync(async function() {await tk.tokenOfOwnerByIndex(accounts[0], 0);});
	});

	it("mint: creating a token", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await assertThrowsAsync(async function() {await tk.mint(accounts[0], 0x000, 1, 0, 1, 1, 1, 1, 1);});
		await assertThrowsAsync(async function() {await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);});
		await assertThrowsAsync(async function() {await tk.mint(0, 0x402, 1, 0, 1, 1, 1, 1, 1);});
		await assertThrowsAsync(async function() {await tk.mint(tk.address, 0x403, 1, 0, 1, 1, 1, 1, 1);});
		assert.equal(1, await tk.totalSupply(), "wrong totalSupply value after minting a token");
		await assertThrowsAsync(async function() {await tk.mint(accounts[1], 0x402, 1, 0, 1, 1, 1, 1, 1, {from: accounts[1]});});
		await tk.mint(accounts[1], 0x402, 1, 0, 1, 1, 1, 1, 1);
		assert.equal(2, await tk.totalSupply(), "wrong totalSupply value after minting two tokens");
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " has wrong balance after minting a token");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " has wrong balance after minting a token");
		assert.equal(0, await tk.balanceOf(accounts[2]), accounts[2] + " has wrong initial balance");
	});
	it("mint: integrity of newly created token", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 17, 13, 11, 4, 5, 3, 10);
		assert.equal(17, await tk.getPlotId(0x401), "gem 0x401 has wrong plotId");
		assert.equal(13, await tk.getDepth(0x401), "gem 0x401 has wrong depth");
		assert.equal(11, await tk.getGemNum(0x401), "gem 0x401 has wrong gemNum");
		assert.equal(0x00000011000D000B, await tk.getCoordinates(0x401), "gem 0x401 wrong coordinates");
		assert.equal(4, await tk.getColor(0x401), "gem 0x401 wrong color");
		assert.equal(5, await tk.getLevel(0x401), "gem 0x401 wrong level");
		assert.equal(3, await tk.getGradeType(0x401), "gem 0x401 wrong gradeType");
		assert.equal(10, await tk.getGradeValue(0x401), "gem 0x401 wrong gradeValue");
		assert.equal(0x0300000A, await tk.getGrade(0x401), "gem 0x401 wrong grade");
		assert.equal(0x04050300000A, await tk.getProperties(0x401), "gem 0x401 has wrong properties");

		const creationTime = await tk.getCreationTime(0x401);
		assert(creationTime.gt(0), "gem 0x401 wrong creation time");
		const ownershipModified = await tk.getOwnershipModified(0x401);
		assert.equal(0, ownershipModified, "gem 0x401 wrong ownership modified");
		const levelModified = await tk.getLevelModified(0x401);
		assert.equal(0, levelModified, "gem 0x401 wrong level modified");
		const gradeModified = await tk.getGradeModified(0x401);
		assert.equal(0, gradeModified, "gem 0x401 wrong grade modified");
		const stateModified = await tk.getStateModified(0x401);
		assert.equal(0, stateModified, "gem 0x401 wrong state modified");

		const tokenURI = await tk.tokenURI(0x401);
		assert.equal("http://cryptominerworld.com/gem/401", tokenURI, "wrong 0x401 tokenURI");

		const packed = await tk.getPacked(0x401);
		assert(packed[0].eq("0x00000011000D000B040000000005000000000300000A00000000000000000000"), "gem 0x401 wrong high");
		assert(packed[1].eq("0x" + creationTime.toString(16) + "0000000000000000" + accounts[0].substr(2, 40)), "gem 0x401 wrong high");

		const collection = await tk.getCollection(accounts[0]);
		assert.equal(1, collection.length, "wrong collection length for " + accounts[0]);
		assert.equal(0x401, collection[0], "wrong token ID at index 0");
		assert.equal(0x401, await tk.tokenByIndex(0), "wrong tokenByIndex at index 0");
		assert.equal(0x401, await tk.tokenOfOwnerByIndex(accounts[0], 0), "wrong tokenOfOwnerByIndex at index 0");

		const packedCollection = await tk.getPackedCollection(accounts[0]);
		assert.equal(1, packedCollection.length, "wrong packed collection length for " + accounts[0]);
		assert.equal(0x0000040104050300000A, packedCollection[0], "wrong token packed data at index 0");
	});

	it("transfer: transferring a token", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(FEATURE_TRANSFERS);
		const fn = async () => await tk.transfer(accounts[1], 0x401);
		await assertThrowsAsync(fn);
		await tk.updateFeatures(0);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance before token transfer");
		assert.equal(0, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		await assertThrowsAsync(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await assertThrowsAsync(async function() {await tk.transfer(0x0, 0x401);});
		await assertThrowsAsync(async function() {await tk.transfer(accounts[0], 0x401);});
		await fn();
		assert.equal(0, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance after token transfer");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		assert.equal(accounts[1], await tk.ownerOf(0x401), "wrong token 0x401 owner after token transfer");
	});
	it("transfer: transferring a locked token", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 0, 1, 1, 1, 1, 1);
		await assertThrowsAsync(async function() {await tk.setLockedBitmask(0x1, {from: accounts[1]});});
		await tk.setLockedBitmask(0x1);
		await tk.setState(0x401, 0x1);
		await tk.setState(0x402, 0x1);
		const fn1 = async () => await tk.transfer(accounts[1], 0x401);
		const fn2 = async () => await tk.transfer(accounts[1], 0x402);
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);
		await tk.setState(0x401, 0x2);
		await fn1();
		await tk.setLockedBitmask(0x2);
		await fn2();
		const fn = async () => await tk.transfer(accounts[2], 0x401, {from: accounts[1]});
		await assertThrowsAsync(fn);
		await tk.setLockedBitmask(0x3);
		await assertThrowsAsync(fn);
		await tk.setLockedBitmask(0x4);
		await fn();
		assert.equal(accounts[1], await tk.ownerOf(0x402), "wrong token 0x402 owner");
		assert.equal(accounts[2], await tk.ownerOf(0x401), "wrong token 0x401 owner");
	});

	it("transferFrom: transferring on behalf", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[1], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 0, 1, 1, 1, 1, 1);
		const fn1 = async () => await tk.transferFrom(accounts[1], accounts[2], 0x401);
		await assertThrowsAsync(async function() {await tk.approve(accounts[0], 0x401);});
		await assertThrowsAsync(async function() {await tk.approve(accounts[0], 0x402);});
		await assertThrowsAsync(fn1);
		await tk.approve(accounts[0], 0x401, {from: accounts[1]});
		await tk.revokeApproval(0x401, {from: accounts[1]});
		await assertThrowsAsync(async function() {await tk.revokeApproval(0x401, {from: accounts[1]});});
		await tk.approve(accounts[0], 0x401, {from: accounts[1]});
		await fn1();
		await tk.updateFeatures(FEATURE_TRANSFERS);
		const fn = async () => await tk.transferFrom(accounts[0], accounts[1], 0x402);
		await assertThrowsAsync(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await assertThrowsAsync(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await fn();
		assert.equal(accounts[1], await tk.ownerOf(0x402), "wrong token 0x402 owner after transfer on behalf");
		assert.equal(accounts[2], await tk.ownerOf(0x401), "wrong token 0x401 owner after transfer on behalf");
	});

	it("safeTransferFrom: safe transfer token to address", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.safeTransferFrom(accounts[0], accounts[1], 0x401, "");
		assert.equal(accounts[1], await tk.ownerOf(0x401), "token 0x401 has wrong owner after safely transferring it");
	});
	it("safeTransferFrom: impossible to safe transfer to a smart contract", async function() {
		const tk = await Token.new();
		const another = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await assertThrowsAsync(async function() {await tk.safeTransferFrom(accounts[0], another.address, 0x401, "");});
		await assertThrowsAsync(async function() {await tk.safeTransferFrom(accounts[0], tk.address, 0x401, "");});
		assert.equal(accounts[0], await tk.ownerOf(0x401), "card 0x401 has wrong owner after bad attempt to transfer it");
		await tk.safeTransferFrom(accounts[0], accounts[1], 0x401, "");
		assert.equal(accounts[1], await tk.ownerOf(0x401), "token 0x401 has wrong owner after safely transferring it");
	});

	it("approve: approve and transfer on behalf", async function () {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x403, 1, 0, 1, 1, 1, 1, 1);
		await assertThrowsAsync(async function() {await tk.approve(0x0, 0x0);});
		await assertThrowsAsync(async function() {await tk.approve(accounts[0], 0x401);});
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
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x403, 1, 0, 1, 1, 1, 1, 1);
		await assertThrowsAsync(async function() {await tk.setApprovalForAll(0x0, true);});
		await assertThrowsAsync(async function() {await tk.setApprovalForAll(accounts[0], true);});
		await tk.setApprovalForAll(accounts[1], true);
		await tk.transferFrom(accounts[0], accounts[1], 0x401, {from: accounts[1]});
		await tk.transferFrom(accounts[0], accounts[1], 0x402, {from: accounts[1]});
		assert(await tk.isApprovedForAll(accounts[0], accounts[1]), "should be approved operator");
		await tk.setApprovalForAll(accounts[1], false);
		assert(!await tk.isApprovedForAll(accounts[0], accounts[1]), "should not be approved operator");
	});

	it("level up: full cycle", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.levelUp(0x401);
		assert.equal(2, await tk.getLevel(0x401), "wrong gem 0x401 level after leveling up");
		await assertThrowsAsync(async function() {await tk.levelUp(0x402);});
		await assertThrowsAsync(async function() {await tk.levelUp(0x402, {from: accounts[1]});});
	});

	it("update grade: full cycle", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.upgradeGrade(0x401, 0x01000002);
		assert.equal(0x01000002, await tk.getGrade(0x401), "wrong gem 0x401 grade after modifying a grade");
		assert.equal(0x01, await tk.getGradeType(0x401), "wrong gem 0x401 grade level after modifying a grade");
		assert.equal(0x02, await tk.getGradeValue(0x401), "wrong gem 0x401 grade value after modifying a grade");
		await assertThrowsAsync(async function() {await tk.upgradeGrade(0x401, 0x01000002);});
		await assertThrowsAsync(async function() {await tk.upgradeGrade(0x402, 0x01000003);});
		await assertThrowsAsync(async function() {await tk.upgradeGrade(0x401, 0x01000003, {from: accounts[1]});});
		await tk.upgradeGrade(0x401, 0x01000003);
	});

	it("set state: full cycle", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.setState(0x401, 0x0102);
		assert.equal(0x0102, await tk.getState(0x401), "wrong gem 0x401 state after setting a state");
		await assertThrowsAsync(async function() {await tk.setState(0x402, 0x0103);});
		await assertThrowsAsync(async function() {await tk.setState(0x401, 0x0103, {from: accounts[1]});});
		await tk.setState(0x401, 0x0103);
	});

	it("getters: throw on non-existent token", async function() {
		const tk = await Token.new();
		await assertThrowsAsync(async function() {await tk.getPacked(0x401);});
		await assertThrowsAsync(async function() {await tk.getCoordinates(0x401);});
		await assertThrowsAsync(async function() {await tk.getProperties(0x401);});
		await assertThrowsAsync(async function() {await tk.getColor(0x401);});
		await assertThrowsAsync(async function() {await tk.getLevelModified(0x401);});
		await assertThrowsAsync(async function() {await tk.getLevel(0x401);});
		await assertThrowsAsync(async function() {await tk.getGradeModified(0x401);});
		await assertThrowsAsync(async function() {await tk.getGrade(0x401);});
		await assertThrowsAsync(async function() {await tk.getStateModified(0x401);});
		await assertThrowsAsync(async function() {await tk.getState(0x401);});
		await assertThrowsAsync(async function() {await tk.getCreationTime(0x401);});
		await assertThrowsAsync(async function() {await tk.getOwnershipModified(0x401);});
		await assertThrowsAsync(async function() {await tk.ownerOf(0x401);});
	});
});

async function assertThrowsAsync(fn) {
	let f = function() {};
	try {
		await fn();
	}
	catch(e) {
		f = function() {
			throw e;
		};
	}
	finally {
		assert.throws(f);
	}
}
