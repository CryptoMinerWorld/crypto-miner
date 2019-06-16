// Now provider is used to play with current time
const NowProvider = artifacts.require("./__NowProvider.sol");

// Miner smart contract dependencies
const Gem = artifacts.require("./__GemERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");
const Artifact = artifacts.require("./PlotERC721.sol"); // TODO
const Silver = artifacts.require("./SilverERC20.sol");
const Gold = artifacts.require("./GoldERC20.sol");
const ArtifactERC20 = artifacts.require("./ArtifactERC20.sol");
const FoundersKey = artifacts.require("./FoundersKeyERC20.sol");
const ChestKey = artifacts.require("./ChestKeyERC20.sol");

// Miner smart contract itself
const Miner = artifacts.require("./__Miner.sol");

// import ERC721Core dependencies
import {ROLE_TOKEN_CREATOR, ROLE_STATE_PROVIDER} from "./erc721_core";
// import Gem ERC721 dependencies
import {ROLE_AGE_PROVIDER, ROLE_MINED_STATS_PROVIDER, ROLE_NEXT_ID_INC} from "./erc721_core";
// import Plot ERC721 features
import {ROLE_OFFSET_PROVIDER} from "./erc721_core";
// import Miner dependencies
const FEATURE_MINING_ENABLED = 0x00000001;

// Miner smart contract tests requiring time manipulation
contract('Miner (NowProvider)', (accounts) => {
	it("mining: mining properties of the 25 min old gem(s)", async() => {
		// now provider
		const np = await NowProvider.new();

		// define miner dependencies
		const gem = await Gem.new(np.address);
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
			chestKey.address,
			np.address
		);

		// create few different gems
		// low grade high level gem (level 5, grade D)
		await gem.mint(accounts[0], 1, 1, 1, 5, 0x10C3500);
		// mid level mid grade gem (level 3, grade A)
		await gem.mint(accounts[0], 2, 1, 1, 3, 0x4061A80);
		// high grade low level gem (level 1, grade AAA+)
		await gem.mint(accounts[0], 3, 1, 1, 1, 0x60F423F);

		// rewind 25 minutes forward
		await np.incTime(1500);
		// expected values
		const a = 25; // energetic age in seconds
		const R = restingEnergy(a); // resting energy

		// resting energy should be calculated as R = -7 * 10^-6 * a^2 + 0.5406 * a, where a = 30,000
		// energetic age of all gems is 30,000
		assert.equal(a, await miner.energeticAgeOf(1), "wrong energetic age for gem ID 1 after 5 minutes");
		assert.equal(a, await miner.energeticAgeOf(2), "wrong energetic age for gem ID 2 after 5 minutes");
		assert.equal(a, await miner.energeticAgeOf(3), "wrong energetic age for gem ID 3 after 5 minutes");

		// resting energy is as calculated by JS formula
		assert.equal(0, await miner.restingEnergyOf(1), "non-zero resting energy for gem ID 1 after 5 minutes");
		assert.equal(R, await miner.restingEnergyOf(2), "wrong resting energy for gem ID 2 after 5 minutes");
		assert.equal(R, await miner.restingEnergyOf(3), "wrong resting energy for gem ID 3 after 5 minutes");

		// verify effective resting energy
		assert.equal(0, await miner.effectiveRestingEnergyOf(1), "non-zero effective resting energy for gem ID 1 after 5 minutes");
		assert.equal(Math.floor(1.46 * R), await miner.effectiveRestingEnergyOf(2), "wrong effective resting energy for gem ID 2 after 5 minutes");
		assert.equal(Math.floor(4.99 * R), await miner.effectiveRestingEnergyOf(3), "wrong effective resting energy for gem ID 3 after 5 minutes");

		// verify effective mining energy
		assert(Math.floor(1.04 * a) > a, "not enough precision for effective mining energy test");
		assert.equal(Math.floor(1.04 * a), await miner.effectiveMiningEnergyOf(1), "wrong effective mining energy for gem ID 1 after 5 minutes");
		assert.equal(Math.floor(1.46 * a), await miner.effectiveMiningEnergyOf(2), "wrong effective mining energy for gem ID 2 after 5 minutes");
		assert.equal(Math.floor(4.99 * a), await miner.effectiveMiningEnergyOf(3), "wrong effective mining energy for gem ID 3 after 5 minutes");
	});

	it("mining: mining with resting energy only (bind without locking)", async() => {
		// now provider
		const np = await NowProvider.new();

		// define miner dependencies
		const gem = await Gem.new(np.address);
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
			chestKey.address,
			np.address
		);

		// enable mining feature on the miner
		await miner.updateFeatures(FEATURE_MINING_ENABLED);
		// grant miner permissions to modify gem's state and mint gems
		await gem.updateRole(miner.address,  ROLE_TOKEN_CREATOR | ROLE_NEXT_ID_INC | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_MINED_STATS_PROVIDER);
		// grant miner permission(s) to update plot
		await plot.updateRole(miner.address, ROLE_STATE_PROVIDER | ROLE_OFFSET_PROVIDER);
		// grant miner permission(s) to mint silver
		await silver.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		// grant miner permission(s) to mint gold
		await gold.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		// grant miner permission(s) to mint artifacts
		await artifactErc20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		// grant miner permission(s) to mint founder's chest keys
		await foundersKey.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		// grant miner permission(s) to mint chest keys
		await chestKey.updateRole(miner.address, ROLE_TOKEN_CREATOR);

		// create plot in Antarctica with only 1 block of snow and 99 blocks of ice
		await plot.mint(accounts[0], 0, toBN("0x0200016464646400"));
		// create a high grade low level gem
		await gem.mint(accounts[0], 1, 1, 1, 1,0x60F423F);

		// rewind 13 minutes forward to accumulate enough resting energy
		await np.incTime(780);

		// verify plot is mined by one block
		assert.equal(0, await plot.getOffset(1), "wrong initial plot offset");

		// verify initially states are zeros and tokens are transferable
		assert.equal(0, await gem.getState(1), "non-zero gem's state");
		assert.equal(0, await plot.getState(1), "non-zero plot's state");
		assert(await plot.isTransferable(1), "plot is not transferable");

		// verify gem level allows to mine only one block
		assert.equal(1, await miner.gemMinesTo(1, 1), "wrong gem mines to calc");
		// verify energetic properties of the gem and mining rate
		assert.equal(13, await miner.energeticAgeOf(1), "wrong energetic age of");
		assert.equal(7, await miner.restingEnergyOf(1), "wrong resting energy of");
		assert.equal(499999900, await miner.miningRateOf(1), "wrong mining rate of a gem");
		assert.equal(34, await miner.effectiveRestingEnergyOf(1), "wrong effective resting energy of a gem");
		// verify plot structure
		assert.equal(1, await plot.getTierDepth(1, 1), "wrong tier 1 depth");

		// bind gem to a plot, it should release immediately (resting energy mining)
		await miner.bind(1, 1);

		// verify all the tokens are still not locked
		assert.equal(0, await gem.getState(1), "non-zero gem's state after mining");
		assert(await gem.isTransferable(1), "gem is not transferable after mining");
		assert.equal(0, await plot.getState(1), "non-zero plot's state after mining");
		assert(await plot.isTransferable(1), "plot is not transferable after mining");

		// verify plot is mined by one block
		assert.equal(1, await plot.getOffset(1), "wrong plot offset after mining");
	});

	it("mining: evaluating plot offset", async() => {
		// now provider
		const np = await NowProvider.new();

		// define miner dependencies
		const gem = await Gem.new(np.address);
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
			chestKey.address,
			np.address
		);

		// enable mining feature on the miner
		await miner.updateFeatures(FEATURE_MINING_ENABLED);
		// grant miner permissions to modify gem's state and age
		await gem.updateRole(miner.address, ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER);
		// grant miner permission(s) to update plot
		await plot.updateRole(miner.address, ROLE_STATE_PROVIDER | ROLE_OFFSET_PROVIDER);

		// create plot in Antarctica
		await plot.mint(accounts[0], 0, toBN("0x0200236464646400"));
		// create a high grade high level gem
		await gem.mint(accounts[0], 1, 1, 1, 5, 0x60F423F);

		// bind gem to a plot
		await miner.bind(1, 1);

		// initially evaluate returns zero
		assert.equal(0, await miner.evaluate(1), "non-zero evaluated offset");

		// rewind 7 minutes forward to mine one block
		await np.incTime(420);

		// evaluate now should return 1 block
		assert.equal(1, await miner.evaluate(1), "wrong evaluated offset");
	});

	it("mining: updating plot offset and releasing", async() => {
		// now provider
		const np = await NowProvider.new();

		// define miner dependencies
		const gem = await Gem.new(np.address);
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
			chestKey.address,
			np.address
		);

		// enable mining feature on the miner
		await miner.updateFeatures(FEATURE_MINING_ENABLED);
		// grant miner permissions to modify gem's state and mint gems
		await gem.updateRole(miner.address, ROLE_TOKEN_CREATOR | ROLE_NEXT_ID_INC | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_MINED_STATS_PROVIDER);
		// grant miner permission(s) to update plot
		await plot.updateRole(miner.address, ROLE_STATE_PROVIDER | ROLE_OFFSET_PROVIDER);
		// grant miner permission(s) to mint silver
		await silver.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		// grant miner permission(s) to mint gold
		await gold.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		// grant miner permission(s) to mint artifacts
		await artifactErc20.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		// grant miner permission(s) to mint founder's chest keys
		await foundersKey.updateRole(miner.address, ROLE_TOKEN_CREATOR);
		// grant miner permission(s) to mint chest keys
		await chestKey.updateRole(miner.address, ROLE_TOKEN_CREATOR);

		// create plot in Antarctica
		await plot.mint(accounts[0], 0, toBN("0x0200236464646400"));
		// create a high grade high level gem
		await gem.mint(accounts[0], 1, 1, 1, 5, 0x60F423F);

		// bind gem to a plot
		await miner.bind(1, 1);


		// initially update fails
		await assertThrows(miner.update, 1);

		// rewind 7 minutes forward to mine one block
		await np.incTime(420);

		// update succeeds now by mining one block
		await miner.update(1);
		// second call fails - nothing to update
		await assertThrows(miner.update, 1);

		// verify plot is mined by one block
		assert.equal(1, await plot.getOffset(1), "wrong plot offset after mining");

		// verify all the tokens are still in a locked state
		assert.equal(1, await gem.getState(1), "wrong gem's state");
		assert(!await gem.isTransferable(1), "gem is still transferable");
		assert.equal(1, await plot.getState(1), "wrong plot's state");
		assert(!await plot.isTransferable(1), "plot is still transferable");

		// release
		await miner.release(1);
		// releasing unlocked token fails
		await assertThrows(miner.release, 1);

		// verify all the tokens are unlocked
		assert.equal(0, await gem.getState(1), "non-zero gem's state after releasing it");
		assert(await gem.isTransferable(1), "gem is not transferable after releasing it");
		assert.equal(0, await plot.getState(1), "non-zero plot's state after releasing it");
		assert(await plot.isTransferable(1), "plot is not transferable after releasing it");

		// verify plot is mined by one block
		assert.equal(1, await plot.getOffset(1), "wrong plot offset after releasing");
	});
});

// a function to calculate resting energy of the gem based on its energetic age
function restingEnergy(a) {
	const h = 37193;
	return Math.min(
		Math.floor(-7 / 1000000 * Math.pow(Math.min(a, h), 2) + 0.5406 * Math.min(a, h) + 0.0199 * Math.max(a - h, 0)),
		65535
	);
}


// import auxiliary function to ensure function `fn` throws
import {assertThrows, toBN} from "../scripts/shared_functions";
