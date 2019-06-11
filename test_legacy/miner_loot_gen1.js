// Miner smart contract dependencies
const Gem = artifacts.require("./GemERC721.sol");
const GemExt = artifacts.require("./GemExtension.sol");
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

// test depth - number of blocks
const BLOCKS = 10000;

// Loot Generator tests - raw blocks
contract('Loot Gen (RAW)', (accounts) => {
	it("rnd: loot generator - tier 1", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const ext = await GemExt.new();
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
			ext.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// gen loot for 10,000 blocks in tier 1
		const loot = await miner.genLoot(1, BLOCKS, false, new Array(9));

		// CSV file data
		const csv_data = `1,${BLOCKS},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/loot_raw.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
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

	it("rnd: loot generator - tier 2", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const ext = await GemExt.new();
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
			ext.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// gen loot for 10,000 blocks in tier 2
		const loot = await miner.genLoot(2, BLOCKS, false, new Array(9));

		// CSV file data
		const csv_data = `2,${BLOCKS},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/loot_raw.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert.equal(0, loot[3], "level 4 gem(s) present");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		assert.equal(0, loot[6], "gold present");
		assert(loot[7] > 0, "no artifact(s)");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("rnd: loot generator - tier 3", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const ext = await GemExt.new();
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
			ext.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// gen loot for 10,000 blocks in tier 3
		const loot = await miner.genLoot(3, BLOCKS, false, new Array(9));

		// CSV file data
		const csv_data = `3,${BLOCKS},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/loot_raw.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifact(s)");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("rnd: loot generator - tier 4", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const ext = await GemExt.new();
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
			ext.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// gen loot for 10,000 blocks in tier 4
		const loot = await miner.genLoot(4, BLOCKS, false, new Array(9));

		// CSV file data
		const csv_data = `4,${BLOCKS},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/loot_raw.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert.equal(0, loot[4], "level 5 gem(s) present");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifact(s) present");
		assert.equal(0, loot[8], "key(s) present");
	});

	it("rnd: loot generator - tier 5", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const ext = await GemExt.new();
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
			ext.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// gen loot for 10,000 blocks in tier 5
		const loot = await miner.genLoot(5, BLOCKS, false, new Array(9));

		// CSV file data
		const csv_data = `5,${BLOCKS},${loot.join()}`;
		// write statistical raw data into the file
		write_csv("./data/loot_raw.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
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
});


// import function to write CSV data
import {write_csv} from "../scripts/shared_functions";
