const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
const ROLE_TOKEN_CREATOR = 0x00040000;

const Token = artifacts.require("./GemERC721.sol");

contract('GemERC721', function(accounts) {
	it("initial state: no tokens exist initially", async function() {
		const tk = await Token.new();
		assert.equal(0, await tk.totalSupply(), "wrong initial totalSupply value");
		assert.equal(0, await tk.balanceOf(accounts[0]), "wrong initial totalSupply value");
	});

	it("mint: creating a token", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await assertThrowsAsync(async function() {await tk.mint(accounts[0], 0x400, 1, 0, 1, 1, 1, 1, 1);});
		await assertThrowsAsync(async function() {await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);});
		await assertThrowsAsync(async function() {await tk.mint(0, 0x402, 1, 0, 1, 1, 1, 1, 1);});
		await assertThrowsAsync(async function() {await tk.mint(tk.address, 0x403, 1, 0, 1, 1, 1, 1, 1);});
		assert.equal(1, await tk.totalSupply(), "wrong totalSupply value after minting a token");
		await assertThrowsAsync(async function() {await tk.mint.sendTransaction(accounts[1], 0x402, 1, 0, 1, 1, 1, 1, 1, {from: accounts[1]});});
		await tk.mint(accounts[1], 0x402, 1, 0, 1, 1, 1, 1, 1);
		assert.equal(2, await tk.totalSupply(), "wrong totalSupply value after minting two tokens");
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " has wrong balance after minting a token");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " has wrong balance after minting a token");
		assert.equal(0, await tk.balanceOf(accounts[2]), accounts[2] + " has wrong initial balance");
	});
	it("mint: integrity of a created a token", async function() {
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
		assert.equal(0x030A, await tk.getGrade(0x401), "gem 0x401 wrong grade");
		assert.equal(0x0405030A, await tk.getProperties(0x401), "gem 0x401 has wrong properties");

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

		const packed = await tk.getPacked(0x401);
		assert(packed[0].eq("0x00000011000D000B04000000000500000000030A000000000000000000000000"), "gem 0x401 wrong high");
		assert(packed[1].eq("0x" + creationTime.toString(16) + "0000000000000000" + accounts[0].substr(2, 40)), "gem 0x401 wrong high");

		const collection = await tk.getCollection(accounts[0]);
		assert.equal(1, collection.length, "wrong collection length for " + accounts[0]);
		assert.equal(0x401, collection[0], "wrong token ID at index 0");

		const packedCollection = await tk.getPackedCollection(accounts[0]);
		assert.equal(1, packedCollection.length, "wrong packed collection length for " + accounts[0]);
		assert.equal(0x000004010405030A, packedCollection[0], "wrong token packed data at index 0");
	});

	it("transfer: transferring a token", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await assertThrowsAsync(async function() {await tk.transferToken(accounts[1], 0x401);});
		await tk.updateFeatures(0);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance before token transfer");
		assert.equal(0, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		await assertThrowsAsync(async function() {await tk.transferToken(accounts[1], 0x401);});
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await assertThrowsAsync(async function() {await tk.transferToken(0x0, 0x401);});
		await assertThrowsAsync(async function() {await tk.transferToken(accounts[0], 0x401);});
		await tk.transferToken(accounts[1], 0x401);
		assert.equal(0, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance after token transfer");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		assert.equal(accounts[1], await tk.ownerOf(0x401), "wrong token 0x401 owner after token transfer");
	});
	it("transfer: transferring a locked token", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 0, 1, 1, 1, 1, 1);
		await assertThrowsAsync(async function() {await tk.setLockedBitmask.sendTransaction(0x1, {from: accounts[1]});});
		await tk.setLockedBitmask(0x1);
		await tk.setState(0x401, 0x1);
		await tk.setState(0x402, 0x1);
		await assertThrowsAsync(async function() {await tk.transferToken(accounts[1], 0x401);});
		await assertThrowsAsync(async function() {await tk.transferToken(accounts[1], 0x402);});
		await tk.setState(0x401, 0x2);
		await tk.transferToken(accounts[1], 0x401);
		await tk.setLockedBitmask(0x2);
		await tk.transferToken(accounts[1], 0x402);
		await assertThrowsAsync(async function() {await tk.transferToken.sendTransaction(accounts[2], 0x401, {from: accounts[1]});});
		await tk.setLockedBitmask(0x3);
		await assertThrowsAsync(async function() {await tk.transferToken.sendTransaction(accounts[2], 0x401, {from: accounts[1]});});
		await tk.setLockedBitmask(0x4);
		await tk.transferToken.sendTransaction(accounts[2], 0x401, {from: accounts[1]});
		assert.equal(accounts[1], await tk.ownerOf(0x402), "wrong token 0x402 owner");
		assert.equal(accounts[2], await tk.ownerOf(0x401), "wrong token 0x401 owner");
	});

	it("transferFrom: transferring on behalf", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[1], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 0, 1, 1, 1, 1, 1);
		await assertThrowsAsync(async function() {await tk.approveToken(accounts[0], 0x401);});
		await assertThrowsAsync(async function() {await tk.approveToken(accounts[0], 0x402);});
		await assertThrowsAsync(async function() {await tk.transferTokenFrom(accounts[1], accounts[2], 0x401);});
		await tk.approveToken.sendTransaction(accounts[0], 0x401, {from: accounts[1]});
		await tk.revokeApproval.sendTransaction(0x401, {from: accounts[1]});
		await assertThrowsAsync(async function() {await tk.revokeApproval.sendTransaction(0x401, {from: accounts[1]});});
		await assertThrowsAsync(async function() {await tk.transferTokenFrom(accounts[1], accounts[2], 0x401);});
		await tk.approveToken.sendTransaction(accounts[0], 0x401, {from: accounts[1]});
		await tk.transferTokenFrom(accounts[1], accounts[2], 0x401);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await assertThrowsAsync(async function() {await tk.transferTokenFrom(accounts[0], accounts[1], 0x402);});
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await assertThrowsAsync(async function() {await tk.transferTokenFrom(accounts[0], accounts[1], 0x402);});
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.transferTokenFrom(accounts[0], accounts[1], 0x402);
		assert.equal(accounts[1], await tk.ownerOf(0x402), "wrong token 0x402 owner after transfer on behalf");
		assert.equal(accounts[2], await tk.ownerOf(0x401), "wrong token 0x401 owner after transfer on behalf");
	});

	it("approve: approve and transfer on behalf", async function () {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x402, 1, 0, 1, 1, 1, 1, 1);
		await tk.mint(accounts[0], 0x403, 1, 0, 1, 1, 1, 1, 1);
		await assertThrowsAsync(async function() {await tk.approve(0x0, 2);});
		await assertThrowsAsync(async function() {await tk.approve(accounts[0], 2);});
		await tk.approve(accounts[1], 2);
		await tk.transferTokenFrom.sendTransaction(accounts[0], accounts[1], 0x401, {from: accounts[1]});
		await tk.transferTokenFrom.sendTransaction(accounts[0], accounts[1], 0x402, {from: accounts[1]});
		await assertThrowsAsync(async function() {
			await tk.transferTokenFrom.sendTransaction(accounts[0], accounts[1], 0x403, {from: accounts[1]});
		});
		await tk.setApprovalForAll(accounts[1], true);
		assert((await tk.UNLIMITED_APPROVALS()).eq(await tk.allowance(accounts[0], accounts[1])), "wrong number of approvals");
		await tk.setApprovalForAll(accounts[1], false);
		assert.equal(0, await tk.allowance(accounts[0], accounts[1]), "wrong number of approvals");
	});

	it("level up: full cycle", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.levelUp(0x401);
		assert.equal(2, await tk.getLevel(0x401), "wrong gem 0x401 level after leveling up");
		await assertThrowsAsync(async function() {await tk.levelUp(0x402);});
		await assertThrowsAsync(async function() {await tk.levelUp.sendTransaction(0x402, {from: accounts[1]});});
	});

	it("update grade: full cycle", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.upgradeGrade(0x401, 0x0102);
		assert.equal(0x0102, await tk.getGrade(0x401), "wrong gem 0x401 grade after modifying a grade");
		await assertThrowsAsync(async function() {await tk.upgradeGrade(0x401, 0x0102);});
		await assertThrowsAsync(async function() {await tk.upgradeGrade(0x402, 0x0103);});
		await assertThrowsAsync(async function() {await tk.upgradeGrade.sendTransaction(0x401, 0x0103, {from: accounts[1]});});
		await tk.upgradeGrade(0x401, 0x0103);
	});

	it("set state: full cycle", async function() {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 1, 1);
		await tk.setState(0x401, 0x0102);
		assert.equal(0x0102, await tk.getState(0x401), "wrong gem 0x401 state after setting a state");
		await assertThrowsAsync(async function() {await tk.setState(0x402, 0x0103);});
		await assertThrowsAsync(async function() {await tk.setState.sendTransaction(0x401, 0x0103, {from: accounts[1]});});
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
