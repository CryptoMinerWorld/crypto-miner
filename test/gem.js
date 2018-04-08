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

});
