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
import {ROLE_STATE_PROVIDER, ROLE_TOKEN_CREATOR} from "../test/erc721_core";
// import GemERC721 dependencies
import {ROLE_AGE_PROVIDER, ROLE_NEXT_ID_INC} from "../test/erc721_core";
// import PlotERC721 dependencies
import {ROLE_OFFSET_PROVIDER} from "../test/erc721_core";
// import Miner dependencies
const FEATURE_MINING_ENABLED = 0x00000001;

// available gem colors the miner can mint
// This array MUST be sorted!
const AVAILABLE_GEM_COLORS = [1, 2, 5, 6, 7, 9, 10].sort();

// CSV file headers
const CSV_HEADER = "plots,lv1,lv2,lv3,lv4,lv5,silver,gold,artifacts,keys";
const CSV_HEADER_C = "plots,c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,lv1,lv2,lv3,lv4,lv5,D,C,B,A,AA,AAA,silver,gold,artifacts,keys";

// test depth - number of plots to simulate
const PLOTS = 1000;
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
			loot = await miner.tierLoot(1, 35 * BULK_SIZE, true, 0, loot);
			// 6,500 blocks in tier 2
			loot = await miner.tierLoot(2, 65 * BULK_SIZE, true, BULK_SIZE, loot);
		}

		// CSV file data
		const csv_data = `${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot_A2.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifacts");
		// there is a 74% chance of not getting any keys in 1000 plots
		//assert(loot[8] > 0, "no keys");
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
		const csv_data = `${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot_B2.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifacts");
		// there is a 74% chance of not getting any keys in 1000 plots
		//assert(loot[8] > 0, "no keys");
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

			if(i !==0 && i % BULK_SIZE === 0) {
				console.log("\t%o/%o", i / BULK_SIZE, PLOTS / BULK_SIZE)
			}
		}

		// extract the loot
		const loot = await extractLoot(player, gem, silver, gold, artifactErc20, foundersKey, chestKey);

		// CSV file data - type C
		const csv_data_c = `${PLOTS},${loot.colors.join(",")},${loot.levels.join(",")},${loot.grades.join(",")},${loot.silver},${loot.gold},${loot.artifacts20},${loot.foundersKeys}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot_C2.csv", CSV_HEADER_C, csv_data_c);

		// verify some statistics on the loot
		verifyTheLoot(loot);
		// for the Antarctica no chest keys should be present - only founder's keys
		assert.equal(0, loot.chestKeys, "chest key(s) present");
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
			loot = await miner.tierLoot(1, 35 * BULK_SIZE, false, 0, loot);
			// 3,000 blocks in tier 2
			loot = await miner.tierLoot(2, 30 * BULK_SIZE, false, 0, loot);
			// 2,000 blocks in tier 3
			loot = await miner.tierLoot(3, 20 * BULK_SIZE, false, 0, loot);
			// 1,000 blocks in tier 4
			loot = await miner.tierLoot(4, 10 * BULK_SIZE, false, 0, loot);
			// 500 blocks in tier 5
			loot = await miner.tierLoot(5, 5 * BULK_SIZE, false, BULK_SIZE, loot);
		}

		// CSV file data
		const csv_data = `${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot_A5.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifacts");
		// there is a 37% chance of not getting a key in tier 5 for 1000 plots
		// and 74% chance of not finding a key in the bottom of the stack for 1000 plots
		// 73% chance of getting at least one key
		assert(loot[8] > 0, "no keys");
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
		const csv_data = `${PLOTS},${loot.join(",")}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot_B5.csv", CSV_HEADER, csv_data);

		// verify some statistics constraints
		assert(loot[0] > 0, "no level 1 gems");
		assert(loot[1] > 0, "no level 2 gems");
		assert(loot[2] > 0, "no level 3 gems");
		assert(loot[3] > 0, "no level 4 gems");
		assert(loot[4] > 0, "no level 5 gems");
		assert(loot[5] > 0, "no silver");
		assert(loot[6] > 0, "no gold");
		assert(loot[7] > 0, "no artifacts");
		// there is a 37% chance of not getting a key in tier 5 for 1000 plots
		// and 74% chance of not finding a key in the bottom of the stack for 1000 plots
		// 73% chance of getting at least one key
		assert(loot[8] > 0, "no keys");
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
			// mint the plot - ID of the minted plot is `65537 + i`
			await plot.mint(player, 1, "0x05002341555F6400");

			// mint the gem ID `i + 1` with energetic age
			await gem.mintWith(
				player,
				i + 1, // Token ID
				65537 + i, // Plot ID
				1, // Color,
				5, // Level
				0x06FFFFFF, // Grade Type AAA, Grade Value 16,777,215
				2806625 // Energetic Age
			);

			// mine the plot immediately
			await miner.bind(65537 + i, i + 1, {from: player});

			if(i !== 0 && i % BULK_SIZE === 0) {
				console.log("\t%o/%o", i / BULK_SIZE, PLOTS / BULK_SIZE)
			}
		}

		// extract the loot
		const loot = await extractLoot(player, gem, silver, gold, artifactErc20, foundersKey, chestKey);

		// CSV file data - type C
		const csv_data_c = `${PLOTS},${loot.colors.join(",")},${loot.levels.join(",")},${loot.grades.join(",")},${loot.silver},${loot.gold},${loot.artifacts20},${loot.chestKeys}`;
		// write statistical raw data into the file
		write_csv("./data/plot_loot_C5.csv", CSV_HEADER_C, csv_data_c);

		// verify some statistics on the loot
		verifyTheLoot(loot);
		// for the Rest of the World no founders' keys should be present
		assert.equal(0, loot.foundersKeys, "founder's key(s) present");
	});

});

// function to extract the loot from specified player's account
async function extractLoot(player, gem, silver, gold, artifactErc20, foundersKey, chestKey) {
	const loot = {
		gems: 0,
		colors: new Array(12).fill(0),
		levels: new Array(5).fill(0),
		grades: new Array(6).fill(0),
		silver: 0,
		gold: 0,
		artifacts20: 0,
		foundersKeys: 0,
		chestKeys: 0
	};
	// to determine levels of the gems - get full collection
	const gems = await gem.getPackedCollection(player);
	loot.gems = gems.length;
	for(let i = 0; i < gems.length; i++) {
		// verify gem ID is not one of the already existing ones
		if(gems[i].shrn(88).gte(toBN(PLOTS))) {
			// and unpack each gem's color, level and grade individually
			loot.colors[gems[i].shrn(80).mod(toBN(256)).toNumber() - 1]++;
			loot.levels[gems[i].shrn(72).mod(toBN(256)).toNumber() - 1]++;
			loot.grades[gems[i].shrn(64).mod(toBN(256)).toNumber() - 1]++;
		}
	}
	// for the rest of the tokens its straight forward
	loot.silver = (await silver.balanceOf(player)).div(await silver.ONE_UNIT()).toNumber();
	loot.gold = (await gold.balanceOf(player)).div(await gold.ONE_UNIT()).toNumber();
	loot.artifacts20 = (await artifactErc20.balanceOf(player)).toNumber();
	loot.foundersKeys = (await foundersKey.balanceOf(player)).toNumber();
	loot.chestKeys = (await chestKey.balanceOf(player)).toNumber();

	// make some console input (without gem level breakthrough)
	console.log("\tmined %o plots; items found:", PLOTS);
	console.log("\tgems: %o", loot.gems);
	console.log("\tsilver: %o", loot.silver);
	console.log("\tgold: %o", loot.gold);
	console.log("\tartifacts20: %o", loot.artifacts20);
	if(loot.foundersKeys) {
		console.log("\tfounder's keys: %o", loot.foundersKeys);
	}
	if(loot.chestKeys) {
		console.log("\tchest keys: %o", loot.chestKeys);
	}

	return loot;
}

// function to verify loot constraints when mining 1000 plots fully
function verifyTheLoot(loot) {
	// verify gem colors:
	for(let i = 1; i <= 12; i++) {
		if(AVAILABLE_GEM_COLORS.indexOf(i) !== -1) {
			assert(loot.colors[i - 1] > 0, `no color ${i} gems`);
		}
		else {
			assert.equal(0, loot.colors[i - 1], `color ${i} gem(s) present`)
		}
	}
	// verify gem levels:
	for(let i = 1; i <= 5; i++) {
		assert(loot.levels[i - 1] > 0, `no level ${i} gems`);
	}
	// verify gem grades: D, C, B, A, AA are very likely to be found,
	// while chance not to find grade AAA in 1000 plots is up to 80%
	for(let i = 1; i <= 5; i++) {
		assert(loot.grades[i - 1] > 0, `no grade ${i} gems`)
	}
	assert(loot.silver > 0, "no silver");
	assert(loot.gold > 0, "no gold");
	assert(loot.artifacts20 > 0, "no artifacts");
	// there is a 74% chance of not getting any keys in 1000 plots in Antarctica
	// and 73% chance of finding at least one key in 1000 plots for the rest of the world
	// assert(loot.chestKeys + loot.foundersKeys > 0, "no keys");
}


// import shared functions
import {write_csv, toBN, toBNs} from "../scripts/shared_functions";
