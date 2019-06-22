/**
 * Test depth defines how many random values will be generated
 * and analyzed to verify loot generation random properties
 * Number of randoms to be generated is equal to 10^TEST_DEPTH
 */
const TEST_DEPTH = 4;

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

// CSV file headers
const CSV_HEADER = "tier,blocks,gems1,gems2,gems3,gems4,gems5,silver,gold,artifacts,keys";

// Loot Generator tests - raw blocks
contract('Miner: Tier Loot', (accounts) => {
	it("tier loot (1) Antarctica", async() => {
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

		// estimate number of blocks required for this test based on the depth
		// this test contains items with 0.01% drop chance
		// increase number of blocks by factor of 3 therefore
		const blocks = 3 * Math.pow(10, TEST_DEPTH);

		// gen loot for 10,000 blocks in tier 1
		const loot = await miner.tierLoot(1, blocks, true, 0, toBNs(9));

		// CSV file data
		const csv_data = `1,${blocks},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/tier_loot_2.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		// item chance is 0.01%:
		// 37% chance of not getting an item in 10,000 blocks
		// 5% chance of not getting an item in 30,000 blocks
		assert(loot[1] > 0, "no level 2 gems");
		assert.equal(0, loot[2], "level 3 gem(s) present");
		assert.equal(0, loot[3], "level 4 gem(s) present");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		assert.equal(0, loot[6], "gold present");
		assert.equal(0, loot[7], "artifact(s) present");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("tier loot (2) Antarctica", async() => {
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

		// estimate number of blocks required for this test based on the depth
		// this test contains items with 0.01% drop chance
		// increase number of blocks by factor of 3 therefore
		const blocks = 3 * Math.pow(10, TEST_DEPTH);

		// gen loot for 10,000 blocks in tier 2
		const loot = await miner.tierLoot(2, blocks, true, 0, toBNs(9));

		// CSV file data
		const csv_data = `2,${blocks},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/tier_loot_2.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		// item chance is 0.02%:
		// 13.5% chance of not getting an item in 10,000 blocks
		assert(loot[3] > 0, "no level 4 gems");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		// item chance is 0.01%:
		// 37% chance of not getting an item in 10,000 blocks
		// 5% chance of not getting an item in 30,000 blocks
		assert(loot[6] > 0, "no gold");
		// item chance is 0.02%:
		// 13.5% chance of not getting an item in 10,000 blocks
		assert(loot[7] > 0, "no artifact(s)");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("tier loot (2) Antarctica - BOS", async() => {
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

		// estimate number of blocks required for this test based on the depth
		// for Antarctica BOS drop rates are order of magnitude bigger – reduce test depth by one
		const blocks = Math.pow(10, TEST_DEPTH - 1);

		// gen loot for 10,000 blocks in tier 2
		const loot = await miner.tierLoot(2, blocks, true, blocks, toBNs(9));

		// CSV file data
		const csv_data = `2B,${blocks},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/tier_loot_2.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifacts");
		assert(loot[8] > 0, "no keys");
	});

	it("tier loot (1)", async() => {
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

		// estimate number of blocks required for this test based on the depth
		// this test contains items with 0.01% drop chance
		// increase number of blocks by factor of 3 therefore
		const blocks = 3 * Math.pow(10, TEST_DEPTH);

		// gen loot for 10,000 blocks in tier 1
		const loot = await miner.tierLoot(1, blocks, false, 0, toBNs(9));

		// CSV file data
		const csv_data = `1,${blocks},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/tier_loot_5.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		// item chance is 0.01%:
		// 37% chance of not getting an item in 10,000 blocks
		// 5% chance of not getting an item in 30,000 blocks
		assert(loot[1] > 0, "no level 2 gems");
		assert.equal(0, loot[2], "level 3 gem(s) present");
		assert.equal(0, loot[3], "level 4 gem(s) present");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		assert.equal(0, loot[6], "gold present");
		assert.equal(0, loot[7], "artifact(s) present");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("tier loot (2)", async() => {
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

		// estimate number of blocks required for this test based on the depth
		// this test contains items with 0.01% drop chance
		// increase number of blocks by factor of 3 therefore
		const blocks = 3 * Math.pow(10, TEST_DEPTH);

		// gen loot for 10,000 blocks in tier 2
		const loot = await miner.tierLoot(2, blocks, false, 0, toBNs(9));

		// CSV file data
		const csv_data = `2,${blocks},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/tier_loot_5.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert.equal(0, loot[2], "level 3 gem(s) present");
		assert.equal(0, loot[3], "level 4 gem(s) present");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		assert.equal(0, loot[6], "gold present");
		// item chance is 0.01%:
		// 37% chance of not getting an item in 10,000 blocks
		// 5% chance of not getting an item in 30,000 blocks
		assert(loot[7] > 0, "no artifact(s)");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("tier loot (3)", async() => {
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

		// estimate number of blocks required for this test based on the depth
		// this test contains items with 0.01% drop chance
		// increase number of blocks by factor of 3 therefore
		const blocks = 3 * Math.pow(10, TEST_DEPTH);

		// gen loot for 10,000 blocks in tier 3
		const loot = await miner.tierLoot(3, blocks, false, 0, toBNs(9));

		// CSV file data
		const csv_data = `3,${blocks},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/tier_loot_5.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert.equal(0, loot[3], "level 4 gem(s) present");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		// item chance is 0.01%:
		// 37% chance of not getting an item in 10,000 blocks
		// 5% chance of not getting an item in 30,000 blocks
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifacts");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("tier loot (4)", async() => {
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

		// estimate number of blocks required for this test based on the depth
		const blocks = Math.pow(10, TEST_DEPTH);

		// gen loot for 10,000 blocks in tier 4
		const loot = await miner.tierLoot(4, blocks, false, 0, toBNs(9));

		// CSV file data
		const csv_data = `4,${blocks},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/tier_loot_5.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert.equal(0, loot[0], "level 1 gem(s) present");
		assert.equal(0, loot[1], "level 2 gem(s) present");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		// item chance is 0.03%:
		// 5% chance of not getting an item in 10,000 blocks
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifacts");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("tier loot (5)", async() => {
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

		// estimate number of blocks required for this test based on the depth
		// this test contains items with 0.02% drop chance
		// increase number of blocks by factor of 1.5 therefore
		const blocks = 1.5 * Math.pow(10, TEST_DEPTH);

		// gen loot for 10,000 blocks in tier 5
		const loot = await miner.tierLoot(5, blocks, false, 0, toBNs(9));

		// CSV file data
		const csv_data = `5,${blocks},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/tier_loot_5.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert.equal(0, loot[0], "level 1 gem(s) present");
		assert.equal(0, loot[1], "level 2 gem(s) present");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		// item chance is 0.02%:
		// 5% chance of not getting an item in 15,000 blocks
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifacts");
		// item chance is 0.02%:
		// 5% chance of not getting an item in 15,000 blocks
		assert(loot[8] > 0, "no keys");
	});

	it("tier loot (5) – BOS", async() => {
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

		// estimate number of blocks required for this test based on the depth
		const blocks = Math.pow(10, TEST_DEPTH);

		// gen loot for 10,000 blocks in tier 5
		const loot = await miner.tierLoot(5, blocks, false, blocks, toBNs(9));

		// CSV file data
		const csv_data = `5B,${blocks},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/tier_loot_5.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifacts");
		// item chance is 0.03%:
		// 5% chance of not getting an item in 10,000 blocks
		assert(loot[8] > 0, "no keys");
	});
});


// import function to write CSV data
import {write_csv, toBNs} from "../scripts/shared_functions";
