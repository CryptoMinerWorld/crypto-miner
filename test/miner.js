// Miner smart contract dependencies
const Gem = artifacts.require("./GemERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");
const Artifact = artifacts.require("./PlotERC721.sol"); // TODO
const Silver = artifacts.require("./SilverERC20.sol");
const Gold = artifacts.require("./GoldERC20.sol");
const ArtifactERC20 = artifacts.require("./ArtifactERC20.sol");
const FoundersKey = artifacts.require("./FoundersKeyERC20.sol");
const ChestKey = artifacts.require("./ChestKeyERC20.sol");

// Miner smart contract itself
const Miner = artifacts.require("./Miner.sol");

// Miner smart contract tests
contract('Miner', (accounts) => {
	it("deployment: verify deployment routine", async() => {
		// define miner dependencies
		const g = await Gem.new();
		const p = await Plot.new();
		const a = await Artifact.new();
		const s = await Silver.new();
		const o = await Gold.new();
		const e = await ArtifactERC20.new();
		const f = await FoundersKey.new();
		const c = await ChestKey.new();

		// verify wrong constructor parameters fail
		await assertThrowsAsync(Miner.new, 0, p.address, a.address, s.address, o.address, e.address, f.address, c.address);
		await assertThrowsAsync(Miner.new, g.address, 0, a.address, s.address, o.address, e.address, f.address, c.address);
		await assertThrowsAsync(Miner.new, g.address, p.address, 0, s.address, o.address, e.address, f.address, c.address);
		await assertThrowsAsync(Miner.new, g.address, p.address, a.address, 0, o.address, e.address, f.address, c.address);
		await assertThrowsAsync(Miner.new, g.address, p.address, a.address, s.address, 0, e.address, f.address, c.address);
		await assertThrowsAsync(Miner.new, g.address, p.address, a.address, s.address, o.address, 0, f.address, c.address);
		await assertThrowsAsync(Miner.new, g.address, p.address, a.address, s.address, o.address, e.address, 0, c.address);
		await assertThrowsAsync(Miner.new, g.address, p.address, a.address, s.address, o.address, e.address, f.address, 0);

		// deploy miner smart contract itself
		const miner = await Miner.new(g.address, p.address, a.address, s.address, o.address, e.address, f.address, c.address);

		// verify the setup
		assert.equal(g.address, await miner.gemInstance(), "wrong gem instance address");
		assert.equal(p.address, await miner.plotInstance(), "wrong plot instance address");
		//assert.equal(artifact.address, await miner.artifactInstance(), "wrong artifact instance address");
		assert.equal(s.address, await miner.silverInstance(), "wrong silver instance address");
		assert.equal(o.address, await miner.goldInstance(), "wrong gold instance address");
		//assert.equal(artifactErc20.address, await miner.artifactErc20Instance(), "wrong artifact ERC20 instance address");
		//assert.equal(foundersKey.address, await miner.foundersKeyInstance(), "wrong founder's key instance address");
		//assert.equal(chestKey.address, await miner.chestKeyInstance(), "wrong chest key instance address");
	});

	it("loot: loot generator check tier 1", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// process 1,000 blocks in tier 1
		const loot = await miner.genLoot(1, 1000, false, new Array(9));
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert.equal(0, loot[2], "level 3 gem(s) present");
		assert.equal(0, loot[3], "level 4 gem(s) present");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		assert.equal(0, loot[6], "gold present");
		assert.equal(0, loot[7], "artifact(s) present");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("loot: loot generator check tier 2", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// process 1,000 blocks in tier 2
		const loot = await miner.genLoot(2, 1000, false, new Array(9));
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert.equal(0, loot[3], "level 4 gem(s) present");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		assert.equal(0, loot[6], "gold present");
		// assert(loot[7] > 0, "no artifact(s)"); // artifact may be present or not
		assert.equal(0, loot[8], "key(s) present");
	});

	it("loot: loot generator check tier 3", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// process 1,000 blocks in tier 3
		const loot = await miner.genLoot(3, 1000, false, new Array(9));
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		// assert(loot[3] > 0, "no level 4 gems"); // level 4 gem(s) may be present or not
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		// assert(loot[6] > 0, "no gold"); // gold may be present or not
		// assert(loot[7] > 0, "no artifact(s)"); // artifact may be present or not
		assert.equal(0, loot[8], "key(s) present");
	});

	it("loot: loot generator check tier 4", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// process 1,000 blocks in tier 4
		const loot = await miner.genLoot(4, 1000, false, new Array(9));
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		// assert(loot[6] > 0, "no gold"); // gold may be present or not
		assert(loot[7] > 0, "no artifact(s) present");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("loot: loot generator check tier 5", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// process 10,000 blocks in tier 5
		const loot = await miner.genLoot(5, 10000, false, new Array(9));
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifact(s)");
		assert(loot[8] > 0, "no key(s)");
	});

	it("mining: mining properties of the new gem(s)", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// create few different gems
		// low grade high level gem (level 5, grade D)
		await gem.mint(accounts[0], 1, 1, 0, 1, 1, 5, 1, 800000);
		// mid level mid grade gem (level 3, grade A)
		await gem.mint(accounts[0], 2, 1, 0, 2, 1, 3, 4, 400000);
		// high grade low level gem (level 1, grade AAA+)
		await gem.mint(accounts[0], 3, 1, 0, 3, 1, 1, 6, 999999);

		// energetic age of all gems is zero
		assert.equal(0, await miner.energeticAgeOf(1), "non-zero energetic age for gem ID 1");
		assert.equal(0, await miner.energeticAgeOf(2), "non-zero energetic age for gem ID 2");
		assert.equal(0, await miner.energeticAgeOf(3), "non-zero energetic age for gem ID 3");

		// resting energy is also zero
		assert.equal(0, await miner.restingEnergyOf(1), "non-zero resting energy for gem ID 1");
		assert.equal(0, await miner.restingEnergyOf(2), "non-zero resting energy for gem ID 2");
		assert.equal(0, await miner.restingEnergyOf(3), "non-zero resting energy for gem ID 3");

		// verify mining rate
		assert.equal(104000000, await miner.miningRateOf(1), "incorrect mining rate for gem ID 1");
		assert.equal(146000000, await miner.miningRateOf(2), "incorrect mining rate for gem ID 2");
		assert.equal(499999900, await miner.miningRateOf(3), "incorrect mining rate for gem ID 3");

		// verify effective resting energy is zero
		assert.equal(0, await miner.effectiveRestingEnergyOf(1), "non-zero effective resting energy for gem ID 1");
		assert.equal(0, await miner.effectiveRestingEnergyOf(2), "non-zero effective resting energy for gem ID 2");
		assert.equal(0, await miner.effectiveRestingEnergyOf(3), "non-zero effective resting energy for gem ID 3");

		// verify effective mining energy is zero
		assert.equal(0, await miner.effectiveMiningEnergyOf(1), "non-zero effective mining energy for gem ID 1");
		assert.equal(0, await miner.effectiveMiningEnergyOf(2), "non-zero effective mining energy for gem ID 2");
		assert.equal(0, await miner.effectiveMiningEnergyOf(3), "non-zero effective mining energy for gem ID 3");

		// create few different plots
		// plot in Antarctica, plot ID 1
		await plot.mint(accounts[0], 0, web3.toBigNumber("0x0200236464646400"));
		// plot in Russia, plot ID 0x10001
		await plot.mint(accounts[0], 1, web3.toBigNumber("0x05002341555F6400"));

		// verify how deep can gems mine these plots
		// with the top level gem
		assert.equal(100, await miner.gemMinesTo(1, 1), "wrong mines to calc for (1, 1)");
		assert.equal(100, await miner.gemMinesTo(1, 0x10001), "wrong mine to calc for (1, 0x10001)");

		// with the mid level gem
		assert.equal(100, await miner.gemMinesTo(2, 1), "wrong mines to calc for (2, 1)");
		assert.equal(85, await miner.gemMinesTo(2, 0x10001), "wrong mine to calc for (2, 0x10001)");

		// with the low level gem
		assert.equal(35, await miner.gemMinesTo(3, 1), "wrong mines to calc for (3, 1)");
		assert.equal(35, await miner.gemMinesTo(3, 0x10001), "wrong mine to calc for (3, 0x10001)");
	});

	it("mining: binding gem to a plot", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// create a high grade low level gem
		await gem.mint(accounts[0], 1, 1, 0, 1, 1, 1, 6, 999999);
		// create a plot in Antarctica
		await plot.mint(accounts[0], 0, web3.toBigNumber("0x0200236464646400"));

		// enable mining feature on the miner
		await miner.updateFeatures(0x00000001); // miner feature
		// grant miner permissions to modify gem's state
		await gem.addOperator(miner.address, 0x00400000); // state provider
		// grant miner permission(s) to update plot
		await plot.updateRole(miner.address, 0x00000014); // state provider, offset provider

		// verify initially states are zeros and tokens are transferable
		assert.equal(0, await gem.getState(1), "non-zero gem's state");
		assert.equal(0, (await gem.getState(1)).modulo(2), "gem is not transferable");
		assert.equal(0, await plot.getState(1), "non-zero plot's state");
		assert(await plot.isTransferable(1), "plot is not transferable");

		// bind gem to a plot
		await miner.bind(1, 1, 0);

		// verify all the tokens are locked now
		assert(await gem.getState(1) > 0, "wrong gem's state");
		assert((await gem.getState(1)).modulo(2) > 0, "gem is still transferable");
		assert(await plot.getState(1) > 0, "wrong plot's state");
		assert(!await plot.isTransferable(1), "plot is still transferable");
	});
});

// auxiliary function to ensure function `fn` throws
async function assertThrowsAsync(fn, ...args) {
	let f = () => {};
	try {
		await fn(...args);
	}
	catch(e) {
		f = () => {
			throw e;
		};
	}
	finally {
		assert.throws(f);
	}
}
