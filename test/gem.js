const Gem = artifacts.require("./Gem");

contract('Gem', function(accounts) {
	it("initial state: creator has full initial permissions", async function() {
		const gem = await Gem.new();
		assert.equal(await gem.operators(accounts[0]), 0xFFFFFFFF, "gem creator doesn't have full permissions");
	});
	it("initial state: all features are initially disabled", async function() {
		const gem = await Gem.new();
		assert.equal(await gem.f(), 0, "gem features are not disabled initially");
	});
	it("initial state: creator can enable/disable all the features", async function() {
		const gem = await Gem.new();
		assert.equal(await gem.f(), 0, "gem features are not disabled initially");
		await gem.updateFeatures(0xFFFFFFFF);
		assert.equal(await gem.f(), 0xFFFFFFFF, "creator cannot enable all the features");
		await gem.updateFeatures(0);
		assert.equal(await gem.f(), 0, "creator cannot disable all the features");
	});
	it("initial state: no tokens exist initially", async function() {
		const gem = await Gem.new();
		assert.equal(await gem.totalSupply(), 0, "initial totalSupply is not zero");
		assert.equal(await gem.balanceOf(accounts[0]), 0, "initial creator balance is not zero");
	});
	it("initial state: it is impossible to mint token initially", async function() {
		const gem = await Gem.new();
		await assertThrowsAsync(async function() {await gem.mint(0x1, accounts[0]);});
	});
	it("initial state: it is impossible to transfer token initially", async function() {
		const gem = await Gem.new();
		await gem.updateFeatures(0x00000008);
		await gem.mint(0x1, accounts[0]);
		await assertThrowsAsync(async function() {await gem.transfer(accounts[1], 0x1);});
	});

	it("token creation routine: it is possible to mint a token", async function() {
		const gem = await Gem.new();
		await gem.updateFeatures(0x00000008);
		await gem.mint(0x1, accounts[0]);
		assert.equal(await gem.exists(0x1), true, "newly created token doesn't exist");
		assert.equal(await gem.totalSupply(), 1, "wrong total supply after creating first token");
		assert.equal(await gem.balanceOf(accounts[0]), 1, "wrong creator balance after creating first token");
		assert.equal(await gem.ownerOf(0x1), accounts[0], "wrong token owner after creating first token");
	});
	it("token destruction routine: it is possible to burn existing token", async function() {
		const gem = await Gem.new();
		await gem.updateFeatures(0x00000008);
		await gem.mint(0x1, accounts[0]);
		await gem.updateFeatures(0x00000010);
		await gem.burn(0x1);
		assert.equal(await gem.exists(0x1), false, "newly created and destroyed token still exists");
		assert.equal(await gem.totalSupply(), 0, "wrong total supply after creating and destroying first token");
		assert.equal(await gem.balanceOf(accounts[0]), 0, "wrong creator balance after creating and destroying first token");
	});
	it("token destruction routine: it is impossible to burn non-existing token", async function() {
		const gem = await Gem.new();
		await gem.updateFeatures(0x00000010);
		await assertThrowsAsync(async function() {await gem.burn(0x1);});
	});

	it("permissions: arbitrary user doesn't have any permissions", async function() {
		const gem = await Gem.new();
		await assertThrowsAsync(async function() {await gem.updateFeatures.sendTransaction(0x00000008, {from: accounts[1]});});
		await assertThrowsAsync(async function() {await gem.mint.sendTransaction(0x1, accounts[1], {from: accounts[1]});});
	});

	it("token transfers: token can be transferred", async function() {
		const gem = await Gem.new();
		await gem.updateFeatures(0x00000008);
		await gem.mint(0x1, accounts[0]);
		await gem.updateFeatures(0x00000040);
		await gem.transfer(accounts[1], 0x1);
		assert.equal(await gem.exists(0x1), true, "transferred gem doesn't exist");
		assert.equal(await gem.ownerOf(0x1), accounts[1], "transferred gem doesn't belong to a proper owner");
		await gem.transfer.sendTransaction(accounts[0], 0x1, {from: accounts[1]});
		assert.equal(await gem.exists(0x1), true, "transferred gem doesn't exist");
		assert.equal(await gem.ownerOf(0x1), accounts[0], "transferred gem doesn't belong to a proper owner");
	});
	it("token transfers: it is impossible to transfer non-existing token", async function() {
		const gem = await Gem.new();
		await gem.updateFeatures(0x00000040);
		await assertThrowsAsync(async function() {await gem.transfer(accounts[1], 0x1);});
	});
	it("token transfers: it is impossible to transfer another's owner token", async function() {
		const gem = await Gem.new();
		await gem.updateFeatures(0x00000008);
		await gem.mint(0x1, accounts[0]);
		await gem.updateFeatures(0x00000040);
		await gem.transfer(accounts[1], 0x1);
		await assertThrowsAsync(async function() {await gem.transfer(accounts[2], 0x1);});
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
