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

// import ERC721Core dependencies
import {
	ROLE_STATE_PROVIDER
} from "./erc721_core";
// import PlotERC721 dependencies
import {
	ROLE_OFFSET_PROVIDER
} from "./plot";
// import Miner dependencies
import {
	FEATURE_MINING_ENABLED
} from "./miner";

// CSV file headers
const CSV_HEADER = "tiers,plots,gems1,gems2,gems3,gems4,gems5,silver,gold,artifacts,keys";

// test depth - number of plots to simulate
const PLOTS = 100;

// Loot Generator tests - plot simulation
contract('Loot Gen', (accounts) => {
	it("rnd: loot generator – Antarctica", async() => {
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

		// variable to store loot in
		let loot = toBNs(9);

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

	it("rnd: loot generator – Rest of the World", async() => {
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

		// variable to store loot in
		let loot = toBNs(9);

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

	it("rnd: loot mining – Antarctica", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// define player account
		const player = accounts[0];

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

		// enable mining feature on the miner
		await miner.updateFeatures(FEATURE_MINING_ENABLED);
		// grant miner permissions to modify gem's state
		await gem.updateRole(miner.address, ROLE_STATE_PROVIDER);
		// grant miner permission(s) to update plot
		await plot.updateRole(miner.address, ROLE_STATE_PROVIDER | ROLE_OFFSET_PROVIDER);

		// mint 100 plots in Antarctica
		for(let i = 0; i < PLOTS; i++) {
			// ID of the minted plot is `i + 1`
			await plot.mint(player, 0, "0x0200236464646400");
		}

		// mint 100 high grade gems to mine plots
		for(let i = 0; i < PLOTS; i++) {
			// ID of the minted plot is `i + 1`
			// TODO: consider minting super big grade value
			await gem.mint(player, i + 1, 0, 1, 5, 0x60F423F);
		}

		// bind gems to plots


	});


});


// import shared functions
import {write_csv, toBNs} from "../scripts/shared_functions";
