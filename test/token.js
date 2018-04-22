const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000008;

const ROLE_TOKEN_MANAGER = 0x00000010;
const ROLE_STATE_PROVIDER = 0x00000080;
const ROLE_ROLE_MANAGER = 0x01000000;
const ROLE_FEATURE_MANAGER = 0x08000000;

const FULL_PRIVILEGES_MASK = 0xFFFFFFFF;

const Token = artifacts.require("./Token");

contract('Token', function(accounts) {
	it("initial state: creator has full initial permissions", async function() {
		const token = await Token.new();
		assert.equal(await token.userRoles(accounts[0]), FULL_PRIVILEGES_MASK, "token creator doesn't have full permissions");
	});
	it("initial state: all features are initially disabled", async function() {
		const token = await Token.new();
		assert.equal(await token.f(), 0, "token features are not disabled initially");
	});
	it("initial state: creator can enable/disable all the features", async function() {
		const token = await Token.new();
		assert.equal(await token.f(), 0, "token features are not disabled initially");
		await token.updateFeatures(FULL_PRIVILEGES_MASK);
		assert.equal(await token.f(), FULL_PRIVILEGES_MASK, "creator cannot enable all the features");
		await token.updateFeatures(0);
		assert.equal(await token.f(), 0, "creator cannot disable all the features");
	});
	it("initial state: no tokens exist initially", async function() {
		const token = await Token.new();
		assert.equal(await token.totalSupply(), 0, "initial totalSupply is not zero");
		assert.equal(await token.balanceOf(accounts[0]), 0, "initial creator balance is not zero");
	});
	it("initial state: it is impossible to mint token initially", async function() {
		const token = await Token.new();
		await assertThrowsAsync(async function() {await token.mint(0x1, accounts[0]);});
	});
	it("initial state: it is impossible to transfer token initially", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await assertThrowsAsync(async function() {await token.transfer(accounts[1], 0x1);});
	});
	it("initial state: token ownership modified is zero", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		assert.equal(await token.getOwnershipModified(0x1), 0, "initial last token transfer block is not zero");
	});
	it("initial state: token state is undefined (zero)", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		assert.equal(await token.getState(0x1), 0, "initial state is not zero");
	});
	it("initial state: token creation time is greater then zero", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		assert(await token.getCreationTime(0x1) > 0, "initial token creation block is not greater then zero");
	});

	it("token creation routine: it is possible to mint a token", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		assert.equal(await token.exists(0x1), true, "newly created token doesn't exist");
		assert.equal(await token.totalSupply(), 1, "wrong total supply after creating first token");
		assert.equal(await token.balanceOf(accounts[0]), 1, "wrong creator balance after creating first token");
		assert.equal(await token.ownerOf(0x1), accounts[0], "wrong token owner after creating first token");
	});
	it("token destruction routine: it is possible to burn existing token", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.burn(0x1);
		assert.equal(await token.exists(0x1), false, "newly created and destroyed token still exists");
		assert.equal(await token.totalSupply(), 0, "wrong total supply after creating and destroying first token");
		assert.equal(await token.balanceOf(accounts[0]), 0, "wrong creator balance after creating and destroying first token");
	});
	it("token destruction routine: it is impossible to burn non-existing token", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await assertThrowsAsync(async function() {await token.burn(0x1);});
	});

	it("permissions: arbitrary user doesn't have any permissions", async function() {
		const token = await Token.new();
		await assertThrowsAsync(async function() {await token.updateFeatures.sendTransaction(ROLE_TOKEN_MANAGER, {from: accounts[1]});});
		await assertThrowsAsync(async function() {await token.mint.sendTransaction(0x1, accounts[1], {from: accounts[1]});});
	});
	it("permissions: locked token cannot be burnt", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(ROLE_STATE_PROVIDER);
		await token.setState(0x1, 0x8000);
		await token.setLockedBitmask(0x8000);
		assert(await token.isLocked(0x1), "locked token is not locked");
		await assertThrowsAsync(async function() {await token.burn(0x1);});
	});
	it("permissions: locked token cannot be transferred", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(ROLE_STATE_PROVIDER);
		await token.setState(0x1, 0x8000);
		await token.setLockedBitmask(0x8000);
		assert(await token.isLocked(0x1), "locked token is not locked");
		await token.updateFeatures(FEATURE_TRANSFERS);
		await assertThrowsAsync(async function() {await token.transfer(accounts[1], 0x1);});
	});

	it("token transfers: token can be transferred", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(FEATURE_TRANSFERS);
		await token.transfer(accounts[1], 0x1);
		assert.equal(await token.exists(0x1), true, "transferred token doesn't exist");
		assert.equal(await token.ownerOf(0x1), accounts[1], "transferred token doesn't belong to a proper owner");
		await token.transfer.sendTransaction(accounts[0], 0x1, {from: accounts[1]});
		assert.equal(await token.exists(0x1), true, "transferred token doesn't exist");
		assert.equal(await token.ownerOf(0x1), accounts[0], "transferred token doesn't belong to a proper owner");
	});
	it("token transfers: it is impossible to transfer non-existing token", async function() {
		const token = await Token.new();
		await token.updateFeatures(FEATURE_TRANSFERS);
		await assertThrowsAsync(async function() {await token.transfer(accounts[1], 0x1);});
	});
	it("token transfers: it is impossible to transfer another's owner token", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(FEATURE_TRANSFERS);
		await token.transfer(accounts[1], 0x1);
		await assertThrowsAsync(async function() {await token.transfer(accounts[2], 0x1);});
	});
	it("token transfers: token ownership modified is greater then zero after transfer", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(FEATURE_TRANSFERS);
		await token.transfer(accounts[1], 0x1);
		assert(
			await token.getOwnershipModified(0x1) > 0,
			"transferred token's ownership modified is not greater then zero"
		);
	});
	it("token transfers: token ownership modified is greater then token creation block after transfer", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(FEATURE_TRANSFERS);
		await token.transfer(accounts[1], 0x1);
		assert(
			await token.getOwnershipModified(0x1) > await token.getCreationTime(0x1),
			"transferred token's ownership modified is not greater then token creation block"
		);
	});
	it("token transfers: indexes check after transferring a token", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.mint(0x2, accounts[0]);
		await token.mint(0x3, accounts[0]);
		await token.mint(0x4, accounts[0]);
		await token.mint(0x5, accounts[0]);
		await token.updateFeatures(FEATURE_TRANSFERS);
		await token.transfer(accounts[1], 0x2); // [1, 2, 3, 4, 5], [] -> [1, 5, 3, 4], [2]
		assert.equal(4, await token.balanceOf(accounts[0]), accounts[0] + "has wrong balance after token transfer");
		assert.equal(0x5, await token.collections(accounts[0], 1), "wrong token ID in the collection idx 1 after transfer");
		assert.equal(1, await token.indexes(0x5), "shifted token 0x5 has wrong index in the collection");
		assert.equal(0, await token.indexes(0x2), "transferred token 0x2 has wrong index in the collection");
		await token.transfer(accounts[1], 0x1); // [1, 5, 3, 4], [2] -> [4, 5, 3], [2, 1]
		assert.equal(3, await token.balanceOf(accounts[0]), accounts[0] + "has wrong balance after 2 token transfers");
		assert.equal(0x4, await token.collections(accounts[0], 0), "wrong token ID in the collection idx 0 after second transfer");
		assert.equal(0, await token.indexes(0x4), "shifted token 0x4 has wrong index in the collection");
		assert.equal(1, await token.indexes(0x1), "second transferred token 0x1 has wrong index in the collection");
		await token.transfer(accounts[1], 0x3); // [4, 5, 3], [2, 1] -> [4, 5], [2, 1, 3]
		await token.transfer(accounts[1], 0x5); // [4, 5], [2, 1, 3] -> [4], [2, 1, 3, 5]
		await token.transfer(accounts[1], 0x4); // [4], [2, 1, 3, 5] -> [], [2, 1, 3, 5, 4]
		assert.equal(0, await token.balanceOf(accounts[0]), accounts[0] + "has wrong balance after all token transfers");
		assert.equal(0x2, await token.collections(accounts[1], 0), "wrong token ID in the collection idx 0 after all transfers");
		assert.equal(0x1, await token.collections(accounts[1], 1), "wrong token ID in the collection idx 1 after all transfers");
		assert.equal(0x3, await token.collections(accounts[1], 2), "wrong token ID in the collection idx 2 after all transfers");
		assert.equal(0x5, await token.collections(accounts[1], 3), "wrong token ID in the collection idx 3 after all transfers");
		assert.equal(0x4, await token.collections(accounts[1], 4), "wrong token ID in the collection idx 4 after all transfers");
		assert.equal(1, await token.indexes(0x1), "token 0x1 has wrong index after all transfers");
		assert.equal(0, await token.indexes(0x2), "token 0x2 has wrong index after all transfers");
		assert.equal(2, await token.indexes(0x3), "token 0x3 has wrong index after all transfers");
		assert.equal(4, await token.indexes(0x4), "token 0x4 has wrong index after all transfers");
		assert.equal(3, await token.indexes(0x5), "token 0x5 has wrong index after all transfers");
	});

	it("approvals: approve and transfer on behalf", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await token.approve(accounts[1], 0x1);
		await token.transferFrom.sendTransaction(accounts[0], accounts[1], 0x1, {from: accounts[1]});
		assert.equal(await token.balanceOf(accounts[0]), 0, "wrong balance after token has left");
		assert.equal(await token.balanceOf(accounts[1]), 1, "wrong balance after token was received");
		assert.equal(await token.ownerOf(0x1), accounts[1], "wrong token owner after the transfer");
	});
	it("approvals: approve for all and transfer from", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await token.approveForAll(accounts[1], 1);
		await token.transferFrom.sendTransaction(accounts[0], accounts[1], 0x1, {from: accounts[1]});
		assert.equal(await token.balanceOf(accounts[0]), 0, "wrong balance after token has left");
		assert.equal(await token.balanceOf(accounts[1]), 1, "wrong balance after token was received");
		assert.equal(await token.ownerOf(0x1), accounts[1], "wrong token owner after the transfer");
	});
	it("approvals: approve for all and transfer 2 tokens", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.mint(0x2, accounts[0]);
		await token.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await token.approveForAll(accounts[1], 2);
		await token.transferFrom.sendTransaction(accounts[0], accounts[1], 0x1, {from: accounts[1]});
		await token.transferFrom.sendTransaction(accounts[0], accounts[1], 0x2, {from: accounts[1]});
		assert.equal(await token.balanceOf(accounts[0]), 0, "wrong balance after token has left");
		assert.equal(await token.balanceOf(accounts[1]), 2, "wrong balance after token was received");
		assert.equal(await token.ownerOf(0x1), accounts[1], "wrong token 0x1 owner after the transfer");
		assert.equal(await token.ownerOf(0x2), accounts[1], "wrong token 0x2 owner before the transfer");
	});
	it("approvals: approve for all with transfer limit", async function() {
		const token = await Token.new();
		await token.updateFeatures(ROLE_TOKEN_MANAGER);
		await token.mint(0x1, accounts[0]);
		await token.mint(0x2, accounts[0]);
		await token.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await token.approveForAll(accounts[1], 1);
		await token.transferFrom.sendTransaction(accounts[0], accounts[1], 0x1, {from: accounts[1]});
		assert.equal(await token.balanceOf(accounts[0]), 1, "wrong balance after token has left");
		assert.equal(await token.balanceOf(accounts[1]), 1, "wrong balance after token was received");
		assert.equal(await token.ownerOf(0x1), accounts[1], "wrong token 0x1 owner after the transfer");
		assert.equal(await token.ownerOf(0x2), accounts[0], "wrong token 0x2 owner before the transfer");
		assertThrowsAsync(async function() {
			await token.transferFrom.sendTransaction(accounts[0], accounts[1], 0x2, {from: accounts[1]});
		});
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
