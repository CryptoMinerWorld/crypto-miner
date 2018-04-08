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

	it("token creation routine: it is possible to mint a token", async function() {
		const gem = await Gem.new();
		assert.equal(await gem.totalSupply(), 0, "initial totalSupply is not zero");
		assert.equal(await gem.balanceOf(accounts[0]), 0, "initial creator balance is not zero");
		await gem.updateFeatures(0x00000008);
		await gem.mint(0x1, accounts[0]);
		assert.equal(await gem.exists(0x1), true, "newly created token doesn't exist");
		assert.equal(await gem.totalSupply(), 1, "wrong total supply after creating first token");
		assert.equal(await gem.balanceOf(accounts[0]), 1, "wrong creator balance after creating first token");
		assert.equal(await gem.ownerOf(0x1), accounts[0], "wrong token owner after creating first token");
	});

	it("token destruction routine: it is possible to burn a token", async function() {
		const gem = await Gem.new();
		assert.equal(await gem.totalSupply(), 0, "initial totalSupply is not zero");
		assert.equal(await gem.balanceOf(accounts[0]), 0, "initial creator balance is not zero");
		await gem.updateFeatures(0x00000008);
		await gem.mint(0x1, accounts[0]);
		assert.equal(await gem.exists(0x1), true, "newly created token doesn't exist");
		assert.equal(await gem.totalSupply(), 1, "wrong total supply after creating first token");
		assert.equal(await gem.balanceOf(accounts[0]), 1, "wrong creator balance after creating first token");
		assert.equal(await gem.ownerOf(0x1), accounts[0], "wrong token owner after creating first token");
		await gem.updateFeatures(0x00000010);
		await gem.burn(0x1);
		assert.equal(await gem.exists(0x1), false, "newly created and destroyed token still exists");
		assert.equal(await gem.totalSupply(), 0, "wrong total supply after creating and destroying first token");
		assert.equal(await gem.balanceOf(accounts[0]), 0, "wrong creator balance after creating and destroying first token");
	});
});
