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
import {ROLE_STATE_PROVIDER, ROLE_TOKEN_CREATOR} from "./erc721_core";
// import GemERC721 dependencies
import {ROLE_AGE_PROVIDER, ROLE_NEXT_ID_INC} from "./erc721_core";
// import PlotERC721 dependencies
import {ROLE_OFFSET_PROVIDER} from "./erc721_core";
// import Miner dependencies
const FEATURE_MINING_ENABLED = 0x00000001;

// CSV file headers
const CSV_HEADER = "type,tiers,plots,gems1,gems2,gems3,gems4,gems5,silver,gold,artifacts,keys";

// test depth - number of plots to simulate
const PLOTS = 100;
// number of plots in a batch
const BULK_SIZE = 100;

// Loot Generator tests - plot simulation
contract('Miner: Plot Loot', (accounts) => {
	it("tier loot – Antarctica (2 Tiers)", async() => {
		// execute only for PLOTS >= 100
		assert(PLOTS >= BULK_SIZE, "too few PLOTS to test: " + PLOTS);

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

		// process 100 plots in each iteration
		for(let i = 0; i < PLOTS / BULK_SIZE; i ++) {
			// Antarctica consists of two tiers
			// 3,500 blocks in tier 1
			loot = await miner.tierLoot(1, 35 * BULK_SIZE, 0, loot);
			// 6,500 blocks in tier 2
			loot = await miner.tierLoot(2, 65 * BULK_SIZE, BULK_SIZE, loot);
		}

		// CSV file data
		const csv_data = `A,2,${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[5] > 0, "no silver");
	});
	it("tiers loot – Antarctica (2 Tiers)", async() => {
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

		// process 100 plots in each iteration
		for(let i = 0; i < PLOTS; i ++) {
			// process Antarctica tiers structure fully
			loot = await miner.tiersLoot("0x0200236464646400", 100, loot);
		}

		// CSV file data
		const csv_data = `B,2,${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[5] > 0, "no silver");
	});
	it("mining a plot – Antarctica (2 Tiers)", async() => {
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
		// grant miner permissions to modify gem's state and mint gems
		await gem.updateRole(miner.address, ROLE_TOKEN_CREATOR | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_NEXT_ID_INC);
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

		// mint 100 high grade gems to mine plots
		for(let i = 0; i < PLOTS; i++) {
			// mint the plot - ID of the minted plot is `i + 1`
			await plot.mint(player, 0, "0x0200236464646400");

			// mint the gem ID `i + 1` with energetic age
			await gem.mintWith(
				player,
				i + 1, // Token ID
				i + 1, // Plot ID
				1, // Color,
				5, // Level
				0x06FFFFFF, // Grade Type AAA, Grade Value 16,777,215
				2806625 // Energetic Age
			);

			// mine the plot immediately
			await miner.bind(i + 1, i + 1, {from: player});
		}

		// to determine levels of the gems - get full collection
		const gems = await gem.getPackedCollection(player);
		let gs = new Array(5).fill(0);
		for(let i = 0; i < gems.length; i++) {
			// verify gem ID is not one of the already existing ones
			if(gems[i].shrn(88).gte(toBN(PLOTS))) {
				// and unpack each gem's level individually
				gs[gems[i].shrn(72).mod(toBN(256)).toNumber() - 1]++;
			}
		}
		// for the rest of the tokens its straight forward
		const slv = (await silver.balanceOf(player)).div(await silver.ONE_UNIT()).toNumber();
		const gld = (await gold.balanceOf(player)).div(await gold.ONE_UNIT()).toNumber();
		const artifacts20 = (await artifactErc20.balanceOf(player)).toNumber();
		const foundersKeys = (await foundersKey.balanceOf(player)).toNumber();
		const chestKeys = (await chestKey.balanceOf(player)).toNumber();

		// make some console input (without gem level breakthrough)
		console.log("\tmined %o plots; items found:", PLOTS);
		console.log("\tgems: %o", gems.length);
		console.log("\tsilver: %o", slv);
		console.log("\tgold: %o", gld);
		console.log("\tartifacts20: %o", artifacts20);
		console.log("\tfounder's keys: %o", foundersKeys);
		console.log("\tchest keys: %o", chestKeys);

		// CSV file data
		const csv_data = `C,2,${PLOTS},${gs.join(",")},${slv},${gld},${artifacts20},${foundersKeys}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(gs[0] > 0, "no level 1 gems");
		assert(gs[1] > 0, "no level 2 gems");
		assert(gs[2] > 0, "no level 3 gems");
		assert(slv > 0, "no silver");

		// TODO: inspect gem color and grade
	});

	it("tier loot – Rest of the World (5 Tiers)", async() => {
		// execute only for PLOTS >= 100
		assert(PLOTS >= BULK_SIZE, "too few PLOTS to test: " + PLOTS);

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

		// process 100 plots in each iteration
		for(let i = 0; i < PLOTS / BULK_SIZE; i ++) {
			// Rest of the World consists of five tiers
			// for 100 plots there is
			// 3,500 blocks in tier 1
			loot = await miner.tierLoot(1, 35 * BULK_SIZE, 0, loot);
			// 3,000 blocks in tier 2
			loot = await miner.tierLoot(2, 30 * BULK_SIZE, 0, loot);
			// 2,000 blocks in tier 3
			loot = await miner.tierLoot(3, 20 * BULK_SIZE, 0, loot);
			// 1,000 blocks in tier 4
			loot = await miner.tierLoot(4, 10 * BULK_SIZE, 0, loot);
			// 500 blocks in tier 5
			loot = await miner.tierLoot(5, 5 * BULK_SIZE, BULK_SIZE, loot);
		}

		// CSV file data
		const csv_data = `A,5,${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
	});
	it("tiers loot – Rest of the World (5 Tiers)", async() => {
		// execute only for PLOTS >= 100
		assert(PLOTS >= BULK_SIZE, "too few PLOTS to test: " + PLOTS);

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

		// process 100 plots in each iteration
		for(let i = 0; i < PLOTS; i ++) {
			// process Rest of the World tiers structure fully
			loot = await miner.tiersLoot("0x05002341555F6400", 100, loot);
		}

		// CSV file data
		const csv_data = `B,5,${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
	});
	it("mining a plot – Rest of the World (5 Tiers)", async() => {
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
		// grant miner permissions to modify gem's state and mint gems
		await gem.updateRole(miner.address, ROLE_TOKEN_CREATOR | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_NEXT_ID_INC);
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

		// mint 100 high grade gems to mine plots
		for(let i = 0; i < PLOTS; i++) {
			// mint the plot - ID of the minted plot is `i + 1`
			await plot.mint(player, 0, "0x05002341555F6400");

			// mint the gem ID `i + 1` with energetic age
			await gem.mintWith(
				player,
				i + 1, // Token ID
				i + 1, // Plot ID
				1, // Color,
				5, // Level
				0x06FFFFFF, // Grade Type AAA, Grade Value 16,777,215
				2806625 // Energetic Age
			);

			// mine the plot immediately
			await miner.bind(i + 1, i + 1, {from: player});
		}

		// to determine levels of the gems - get full collection
		const gems = await gem.getPackedCollection(player);
		const gs = new Array(5).fill(0);
		for(let i = 0; i < gems.length; i++) {
			// verify gem ID is not one of the already existing ones
			if(gems[i].shrn(88).gte(toBN(PLOTS))) {
				// and unpack each gem's level individually
				gs[gems[i].shrn(72).mod(toBN(256)).toNumber() - 1]++;
			}
		}
		// for the rest of the tokens its straight forward
		const slv = (await silver.balanceOf(player)).div(await silver.ONE_UNIT()).toNumber();
		const gld = (await gold.balanceOf(player)).div(await gold.ONE_UNIT()).toNumber();
		const artifacts20 = (await artifactErc20.balanceOf(player)).toNumber();
		const foundersKeys = (await foundersKey.balanceOf(player)).toNumber();
		const chestKeys = (await chestKey.balanceOf(player)).toNumber();

		// make some console input (without gem level breakthrough)
		console.log("\tmined %o plots; items found:", PLOTS);
		console.log("\tgems: %o", gems.length);
		console.log("\tsilver: %o", slv);
		console.log("\tgold: %o", gld);
		console.log("\tartifacts20: %o", artifacts20);
		console.log("\tfounder's keys: %o", foundersKeys);
		console.log("\tchest keys: %o", chestKeys);

		// CSV file data
		const csv_data = `C,5,${PLOTS},${gs.join(",")},${slv},${gld},${artifacts20},${chestKeys}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(gs[0] > 0, "no level 1 gems");
		assert(gs[1] > 0, "no level 2 gems");
		assert(gs[2] > 0, "no level 3 gems");
		assert(gs[3] > 0, "no level 4 gems");
		assert(gs[4] > 0, "no level 5 gems");
		assert(slv > 0, "no silver");

		// TODO: inspect gem color and grade
	});

});


// import shared functions
import {write_csv, toBN, toBNs} from "../scripts/shared_functions";
