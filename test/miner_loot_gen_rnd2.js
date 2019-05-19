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
const CSV_HEADER = "tiers,plots,gems1,gems2,gems3,gems4,gems5,silver,gold,artifacts,keys";

// test depth - number of plots to simulate
const PLOTS = 100;

// Loot Generator tests - plot simulation
contract('Loot Generator RND', (accounts) => {
	it("rnd: loot generator check – Antarctica", async() => {
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

		// variable to store loot in
		let loot = new Array(9);

		// Antarctica consists of two tiers
		// for 100 plots there is
		// 3,500 blocks in tier 1
		loot = await miner.genLoot(1, 35 * PLOTS, false, loot);
		// 6,500 blocks in tier 2 (for 1,000 plots)
		loot = await miner.genLoot(2, 65 * PLOTS, true, loot);

		// CSV file data
		const csv_data = `2,${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/loot_plots.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[5] > 0, "no silver");
	});

	it("rnd: loot generator check – Rest of the World", async() => {
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

		// variable to store loot in
		let loot = new Array(9);

		// Rest of the World consists of five tiers
		// for 100 plots there is
		// 3,500 blocks in tier 1
		loot = await miner.genLoot(1, 35 * PLOTS, false, loot);
		// 3,000 blocks in tier 2
		loot = await miner.genLoot(2, 30 * PLOTS, false, loot);
		// 2,000 blocks in tier 3
		loot = await miner.genLoot(3, 20 * PLOTS, false, loot);
		// 1,000 blocks in tier 4
		loot = await miner.genLoot(4, 10 * PLOTS, false, loot);
		// 500 blocks in tier 5
		loot = await miner.genLoot(5, 5 * PLOTS, true, loot);

		// CSV file data
		const csv_data = `5,${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/loot_plots.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[5] > 0, "no silver");
	});
});


// import function to write CSV data
import {write_csv} from "../scripts/shared_functions";
