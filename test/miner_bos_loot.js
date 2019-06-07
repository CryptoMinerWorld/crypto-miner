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

// test depth - number of blocks
const BLOCKS = 10000;

// Loot Generator tests - raw blocks
contract('Miner: BOS Loot', (accounts) => {
	it("BOS loot - Antarctica (Tier 2 BOS)", async() => {
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

		// gen loot for 10,000 blocks in tier 2 BOS
		let loot = toBNs(9);
		for(let i = 0; i < BLOCKS; i++) {
			loot = await miner.genLoot(2, 1, true, loot);
		}

		// CSV file data
		const csv_data = `BOS2,${BLOCKS},${loot.join(",")}`;
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
	it("BOS loot – Rest of the World (Tier 5 BOS)", async() => {
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

		// gen loot for 10,000 blocks in tier 5 BOS
		let loot = toBNs(9);
		for(let i = 0; i < BLOCKS; i++) {
			loot = await miner.genLoot(5, 1, true, loot);
		}

		// CSV file data
		const csv_data = `BOS5,${BLOCKS},${loot.join(",")}`;
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
import {write_csv, toBNs} from "../scripts/shared_functions";
