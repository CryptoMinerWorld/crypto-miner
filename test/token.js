const Token = artifacts.require("./Token");

contract('Token', function(accounts) {
	it("initial state: creator has full initial permissions", async function() {
		const token = await Token.new();
		assert.equal(await token.operators(accounts[0]), 0xFFFFFFFF, "token creator doesn't have full permissions");
	});
	it("initial state: all features are initially disabled", async function() {
		const token = await Token.new();
		assert.equal(await token.f(), 0, "token features are not disabled initially");
	});
	it("initial state: creator can enable/disable all the features", async function() {
		const token = await Token.new();
		assert.equal(await token.f(), 0, "token features are not disabled initially");
		await token.updateFeatures(0xFFFFFFFF);
		assert.equal(await token.f(), 0xFFFFFFFF, "creator cannot enable all the features");
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
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		await assertThrowsAsync(async function() {await token.transfer(accounts[1], 0x1);});
	});
	it("initial state: last token transfer block is zero", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		assert.equal(await token.getLastTransferredBlock(0x1), 0, "initial last token transfer block is not zero");
	});
	it("initial state: token mining state is undefined (zero)", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		assert.equal(await token.getMiningState(0x1), 0, "initial mining state is not zero");
	});
	it("initial state: token creation block is greater then zero", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		assert(await token.getTokenCreationBlock(0x1) > 0, "initial token creation block is not greater then zero");
	});

	it("token creation routine: it is possible to mint a token", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		assert.equal(await token.exists(0x1), true, "newly created token doesn't exist");
		assert.equal(await token.totalSupply(), 1, "wrong total supply after creating first token");
		assert.equal(await token.balanceOf(accounts[0]), 1, "wrong creator balance after creating first token");
		assert.equal(await token.ownerOf(0x1), accounts[0], "wrong token owner after creating first token");
	});
	it("token destruction routine: it is possible to burn existing token", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(0x00000010);
		await token.burn(0x1);
		assert.equal(await token.exists(0x1), false, "newly created and destroyed token still exists");
		assert.equal(await token.totalSupply(), 0, "wrong total supply after creating and destroying first token");
		assert.equal(await token.balanceOf(accounts[0]), 0, "wrong creator balance after creating and destroying first token");
	});
	it("token destruction routine: it is impossible to burn non-existing token", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000010);
		await assertThrowsAsync(async function() {await token.burn(0x1);});
	});

	it("permissions: arbitrary user doesn't have any permissions", async function() {
		const token = await Token.new();
		await assertThrowsAsync(async function() {await token.updateFeatures.sendTransaction(0x00000008, {from: accounts[1]});});
		await assertThrowsAsync(async function() {await token.mint.sendTransaction(0x1, accounts[1], {from: accounts[1]});});
	});

	it("token transfers: token can be transferred", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(0x00000040);
		await token.transfer(accounts[1], 0x1);
		assert.equal(await token.exists(0x1), true, "transferred token doesn't exist");
		assert.equal(await token.ownerOf(0x1), accounts[1], "transferred token doesn't belong to a proper owner");
		await token.transfer.sendTransaction(accounts[0], 0x1, {from: accounts[1]});
		assert.equal(await token.exists(0x1), true, "transferred token doesn't exist");
		assert.equal(await token.ownerOf(0x1), accounts[0], "transferred token doesn't belong to a proper owner");
	});
	it("token transfers: it is impossible to transfer non-existing token", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000040);
		await assertThrowsAsync(async function() {await token.transfer(accounts[1], 0x1);});
	});
	it("token transfers: it is impossible to transfer another's owner token", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(0x00000040);
		await token.transfer(accounts[1], 0x1);
		await assertThrowsAsync(async function() {await token.transfer(accounts[2], 0x1);});
	});
	it("token transfers: token transfer block is greater then zero after transfer", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(0x00000040);
		await token.transfer(accounts[1], 0x1);
		assert(
			await token.getLastTransferredBlock(0x1) > 0,
			"transferred token's last token transfer block is not greater then zero"
		);
	});
	it("token transfers: token transfer block is greater then token creation block after transfer", async function() {
		const token = await Token.new();
		await token.updateFeatures(0x00000008);
		await token.mint(0x1, accounts[0]);
		await token.updateFeatures(0x00000040);
		await token.transfer(accounts[1], 0x1);
		assert(
			await token.getLastTransferredBlock(0x1) > await token.getTokenCreationBlock(0x1),
			"transferred token's last token transfer block is not greater then token creation block"
		);
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
