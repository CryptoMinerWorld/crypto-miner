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
import {ROLE_AGE_PROVIDER, ROLE_MINED_STATS_PROVIDER, ROLE_NEXT_ID_PROVIDER} from "./erc721_core";
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
		// low grade high level gem (level 5, grade D, value 0.8)
		await gem.mint(accounts[0], 1, 1, 5, 0x10C3500);
		// mid level mid grade gem (level 3, grade A, value 0.4)
		await gem.mint(accounts[0], 2, 1, 3, 0x4061A80);
		// high grade low level gem (level 1, grade AAA+, value 0.99..)
		await gem.mint(accounts[0], 3, 1, 1, 0x60F423F);

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
		assert.equal(Math.floor(7.92 * R), await miner.effectiveRestingEnergyOf(2), "wrong effective resting energy for gem ID 2 after 5 minutes");
		assert.equal(Math.floor(62.99 * R), await miner.effectiveRestingEnergyOf(3), "wrong effective resting energy for gem ID 3 after 5 minutes");

		// verify effective mining energy
		assert(Math.floor(1.2 * a) > a, "not enough precision for effective mining energy test");
		assert.equal(Math.floor(1.2 * a), await miner.effectiveMiningEnergyOf(1), "wrong effective mining energy for gem ID 1 after 5 minutes");
		assert.equal(Math.floor(7.92 * a), await miner.effectiveMiningEnergyOf(2), "wrong effective mining energy for gem ID 2 after 5 minutes");
		assert.equal(Math.floor(62.99 * a), await miner.effectiveMiningEnergyOf(3), "wrong effective mining energy for gem ID 3 after 5 minutes");
	});

	it("mining: mining with resting energy only (bind with and without locking)", async() => {
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
		await gem.updateRole(miner.address,  ROLE_TOKEN_CREATOR | ROLE_NEXT_ID_PROVIDER | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_MINED_STATS_PROVIDER);
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

		// create 2 plots in Antarctica with only 1 block of snow and 99 blocks of ice
		await plot.mint(accounts[0], 0, toBN("0x0200016464646400"));
		await plot.mint(accounts[0], 0, toBN("0x0200016464646400"));
		// create a high grade low level gem and high grade high level gem
		await gem.mint(accounts[0], 1, 1, 1, 0x60F423F);
		await gem.mint(accounts[0], 2, 1, 5, 0x60F423F);

		// rewind 4 minutes forward to accumulate enough resting energy
		await np.incTime(240);

		// verify plots are not mined initially
		assert.equal(0, await plot.getOffset(1), "wrong initial plot 1 offset");
		assert.equal(0, await plot.getOffset(2), "wrong initial plot 1 offset");

		// verify initially states are zeros and tokens are transferable
		assert.equal(0, await gem.getState(1), "non-zero gem's 1 state");
		assert.equal(0, await gem.getState(2), "non-zero gem's 2 state");
		assert.equal(0, await plot.getState(1), "non-zero plot's 1 state");
		assert.equal(0, await plot.getState(2), "non-zero plot's 2 state");
		assert(await gem.isTransferable(1), "gem 1 is not transferable");
		assert(await gem.isTransferable(2), "gem 2 is not transferable");
		assert(await plot.isTransferable(1), "plot 1 is not transferable");
		assert(await plot.isTransferable(2), "plot 2 is not transferable");

		// verify plot structure
		assert.equal(1, await plot.getTierDepth(1, 1), "wrong tier 1 depth plot 1");
		assert.equal(100, await plot.getTierDepth(1, 2), "wrong tier 2 depth plot 1");
		assert.equal(1, await plot.getTierDepth(2, 1), "wrong tier 1 depth plot 2");
		assert.equal(100, await plot.getTierDepth(2, 2), "wrong tier 2 depth plot 2");

		// verify gem level allows to mine only one block for low level gem
		assert.equal(1, await miner.gemMinesTo(1, 1), "wrong gem 1 mines to calc");
		// verify gem level allows to mine many blocks for high level gem
		assert.equal(100, await miner.gemMinesTo(2, 1), "wrong gem 2 mines to calc");
		// verify energetic properties of the gem and mining rate
		assert.equal(4, await miner.energeticAgeOf(1), "wrong energetic age of gem 1");
		assert.equal(4, await miner.energeticAgeOf(2), "wrong energetic age of gem 2");
		assert.equal(2, await miner.restingEnergyOf(1), "wrong resting energy of gem 1");
		assert.equal(2, await miner.restingEnergyOf(2), "wrong resting energy of gem 2");
		assert.equal(62999987, await miner.miningRateOf(1), "wrong mining rate of a gem 1");
		assert.equal(62999987, await miner.miningRateOf(2), "wrong mining rate of a gem 2");
		assert.equal(125, await miner.effectiveRestingEnergyOf(1), "wrong effective resting energy of a gem 1");
		assert.equal(125, await miner.effectiveRestingEnergyOf(2), "wrong effective resting energy of a gem 2");

		// bind gem 1 to a plot, it should release immediately (resting energy mining)
		await miner.bind(1, 1);

		// verify all the tokens are still not locked
		assert.equal(0, await gem.getState(1), "non-zero gem's 1 state after mining");
		assert(await gem.isTransferable(1), "gem 1 is not transferable after mining");
		assert.equal(0, await plot.getState(1), "non-zero plot's 1 state after mining");
		assert(await plot.isTransferable(1), "plot 1 is not transferable after mining");

		// verify plot is mined by one block
		assert.equal(1, await plot.getOffset(1), "wrong plot offset after mining");

		// bind gem 2 to a plot, it should fall into mining state
		await miner.bind(2, 2);

		// verify all the tokens are still not locked
		assert.equal(1, await gem.getState(2), "zero gem's 2 state after binding");
		assert(!await gem.isTransferable(2), "gem 2 is still transferable after binding");
		assert.equal(1, await plot.getState(2), "zero plot's 2 state after binding");
		assert(!await plot.isTransferable(2), "plot 2 is still transferable after binding");

		// verify plot is mined by one block
		assert.equal(1, await plot.getOffset(2), "wrong plot offset after binding");
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
		await gem.mint(accounts[0], 1, 1, 5, 0x60F423F);

		// bind gem to a plot
		await miner.bind(1, 1);

		// initially evaluate returns zero
		assert.equal(0, await miner.evaluate(1), "non-zero evaluated offset");

		// rewind 2 minutes forward to mine one block
		await np.incTime(120);

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
		await gem.updateRole(miner.address, ROLE_TOKEN_CREATOR | ROLE_NEXT_ID_PROVIDER | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_MINED_STATS_PROVIDER);
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
		await gem.mint(accounts[0], 1, 1, 5, 0x60F423F);

		// bind gem to a plot
		await miner.bind(1, 1);


		// initially update fails
		await assertThrows(miner.update, 1);

		// rewind 2 minutes forward to mine one block
		await np.incTime(120);

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

	it("mining: mining 15 plots", async() => {
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

		// player's address
		const player = accounts[1];

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
		await gem.updateRole(miner.address, ROLE_TOKEN_CREATOR | ROLE_NEXT_ID_PROVIDER | ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER | ROLE_MINED_STATS_PROVIDER);
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

		// define an array of 15 elements to store plots to mine
		const plots = [];
		// create 10 plots in Rest of the World
		for(let i = 0; i < 10; i++) {
			// offsets: 0, 35, 65, 85, 95, 100
			// energy: 3150 + 21600 + 43200 + 43200 + 43200
			plots.push((await plot.mint(player, 1, toBN("0x05002341555F6400"))).receipt.logs[0].args[2].toNumber());
		}
		// create 5 plots in Antarctica
		for(let i = 0; i < 5; i++) {
			// offsets: 0, 35, 100
			// energy: 3150 + 46800
			plots.push((await plot.mint(player, 0, toBN("0x0200236464646400"))).receipt.logs[0].args[2].toNumber());
		}

		// array to store created gem IDs
		const gems = [];

		// aux constants to define gem color matching and not matching current month
		const matchingColor = new Date().getMonth() + 1;
		const nonMatchingColor = (new Date().getMonth() + 2) % 12 + 1;

		// mint 15 very different gems
		/**
		 * idx | mines | level | grade | spec | color | rate | age  | nrg | r.nrg
		 * ----+-------+-------+-------+------+-------+------+------+-----+------
		 *  1  |   W   |   2   | x4    | x3.5 | x1.05 | 14.7 |      |     |
		 *  2  |   W   |   2   | x25   | x1.5 | x1.00 | 37.5 |      |     |
		 *  3  |   W   |   5   | x9    | x2.0 | x1.05 | 18.9 | 600  | 322 | 6085
		 *  4  |   W   |   4   | x50   | x1.0 | x1.00 | 50.0 | 1200 | 638 | 31900
		 *  5  |   W   |   5   | x48   | x1.0 | x1.00 | 48.0 |      |     |
		 * ----+-------+-------+-------+------+-------+------+------+-----+------
		 *  6  |   W   |   5   | x250  |      | x1.05 | 262.5|
		 *  7  |   W   |   4   | x25   |      | x1.00 | 25.0 |
		 *  8  |   W   |   3   | x25   |      | x1.00 | 25.0 |
		 *  9  |   W   |   2   | x9    |      | x1.00 |  9.0 |
		 * 10  |   W   |   5   | x50   |      | x1.05 | 52.5 |
		 * ----+-------+-------+-------+------+-------+--------------------------
		 * 11  |   A   |   1   | x2    |      | x1.05 |  2.1 |
		 * 12  |   A   |   2   | x1.2  |      | x1.00 |  1.2 |
		 * 13  |   A   |   3   | x30   |      | x1.00 | 30.0 |
		 * 14  |   A   |   5   | x50   |      | x1.00 | 50.0 |
		 * 15  |   A   |   5   | x250  |      | x1.00 | 250  |
		 */

		// mint first 5 special gems according to the table
		gems.push(0xF001);
		await gem.mint(player, 0xF001, matchingColor, 2, 0x030BDE32); // grade value 777,778
		await miner.setSpecialGemMultiplier(0xF001, 250);
		gems.push(0xF002);
		await gem.mint(player, 0xF002, nonMatchingColor, 2, 0x05000000);
		await miner.setSpecialGemMultiplier(0xF002, 50);
		gems.push(0xF003);
		await gem.mintWith(player, 0xF003, matchingColor, 5, 0x040F4240, 600); // grade value 1,000,000
		await miner.setSpecialGemMultiplier(0xF003, 100);
		gems.push(0xF004);
		await gem.mintWith(player, 0xF004, nonMatchingColor, 4, 0x06000000, 1200);
		await miner.setSpecialGemMultiplier(0xF004, 0);
		gems.push(0xF005);
		await gem.mint(player, 0xF005, nonMatchingColor, 5, 0x053A7DF6); // grade value 3,833,334
		await miner.setSpecialGemMultiplier(0xF005, 0);

		// mint next 10 regular gems according to the table above
		gems.push((await gem.mintNext(player, matchingColor, 5, 0x06EAC028)).receipt.logs[0].args[2].toNumber()); // grade value 15,384,616
		gems.push((await gem.mintNext(player, nonMatchingColor, 4, 0x05000000)).receipt.logs[0].args[2].toNumber());
		gems.push((await gem.mintNext(player, nonMatchingColor, 3, 0x05000000)).receipt.logs[0].args[2].toNumber());
		gems.push((await gem.mintNext(player, nonMatchingColor, 2, 0x040F4240)).receipt.logs[0].args[2].toNumber()); // grade value 1,000,000
		gems.push((await gem.mintNext(player, matchingColor, 5, 0x06000000)).receipt.logs[0].args[2].toNumber());
		gems.push((await gem.mintNext(player, matchingColor, 1, 0x02000000)).receipt.logs[0].args[2].toNumber());
		gems.push((await gem.mintNext(player, nonMatchingColor, 2, 0x010C3500)).receipt.logs[0].args[2].toNumber()); // grade value 800,000
		gems.push((await gem.mintNext(player, nonMatchingColor, 3, 0x050CB736)).receipt.logs[0].args[2].toNumber()); // grade value 833,334
		gems.push((await gem.mintNext(player, nonMatchingColor, 5, 0x06000000)).receipt.logs[0].args[2].toNumber());
		gems.push((await gem.mintNext(player, nonMatchingColor, 5, 0x06EAC028)).receipt.logs[0].args[2].toNumber()); // grade value 15,384,616

		// array to store expected mining rates of the gems
		const rates = [14.7, 37.5, 18.9, 50, 48, 262.5, 25, 25, 9, 52.5, 2.1, 1.2, 30.000004, 50, 250.000008].map((e) => Math.floor(e * 1000000));

		// ensure amount of plots and gems matches
		assert.equal(plots.length, gems.length, "plots/gems amount mismatch");
		assert.equal(rates.length, gems.length, "rates/gems arrays length mismatch");

		// verify energetic ages and resting energies for all the gems
		for(let i = 0; i < gems.length; i++) {
			assert.equal(0, await miner.energeticAgeOf(gems[i]), "wrong initial energetic age for gem " + i);
			assert.equal(rates[i], await miner.miningRateOf(gems[i]), "wrong mining rate for gem " + i);
			switch(i) {
				case 2: {
					assert.equal(600, await gem.getAge(gems[i]), "wrong initial age for gem " + i);
					assert.equal(322, await miner.restingEnergyOf(gems[i]), "wrong initial resting energy for gem " + i);
					assert.equal(6085, await miner.effectiveRestingEnergyOf(gems[i]), "wrong initial resting energy for gem " + i);
					break;
				}
				case 3: {
					assert.equal(1200, await gem.getAge(gems[i]), "wrong initial age for gem " + i);
					assert.equal(638, await miner.restingEnergyOf(gems[i]), "wrong initial resting energy for gem " + i);
					assert.equal(31900, await miner.effectiveRestingEnergyOf(gems[i]), "wrong initial resting energy for gem " + i);
					break;
				}
				default: {
					assert.equal(0, await gem.getAge(gems[i]), "wrong initial age for gem " + i);
					assert.equal(0, await miner.restingEnergyOf(gems[i]), "wrong initial resting energy for gem " + i);
					assert.equal(0, await miner.effectiveRestingEnergyOf(gems[i]), "wrong initial resting energy for gem " + i);
				}
			}
		}

		// bind all the gems to the plots
		for(let i = 0; i < plots.length; i++) {
			await miner.bind(plots[i], gems[i], {from: player});
		}

		// verify all objects have been locked
		for(let i = 0; i < plots.length; i++) {
			assert(!await plot.isTransferable(plots[i]), "plot " + i + " is transferable");
			assert(!await gem.isTransferable(gems[i]), "gem " + i + " is transferable");
		}

		// progress evaluation table
		// minutes per block by tiers:     90,    720,    2160,   4320,   8640
		// energy by tiers, Rest of World: 3150 + 21600 + 43200 + 43200 + 43200
		// energy by tiers, Antarctica:    3150 + 46800
		/**
		 * idx | mines | level | rate | 0  | 1d | 2d | 4d | 28d
		 * ----+-------+-------+------+----+----+----+----+----
		 *  1  |   W   |   2   | 14.7 |  0 | 60 | 65*| 35*| 35*
		 *  2  |   W   |   2   | 37.5 |  0 | 65*| 65*| 65*| 65*
		 *  3  |   W   |   5   | 18.9 | 39 | 68 | 80 | 95 |  *
		 *  4  |   W   |   4   | 50.0 | 68 | 93 | 95*| 95*| 95*
		 *  5  |   W   |   5   | 48.0 |  0 | 85 | 98 |  * |  *
		 * ----+-------+-------+------+----+----+----+----+----
		 *  6  |   W   |   5   | 262.5|  0 |  * |  * |  * |  *
		 *  7  |   W   |   4   | 25.0 |  0 | 70 | 85 | 95*| 95*
		 *  8  |   W   |   3   | 25.0 |  0 | 70 | 85*| 85*| 85*
		 *  9  |   W   |   2   | 9.0  |  0 | 48 | 65*| 65*| 65*
		 * 10  |   W   |   5   | 52.5 |  0 | 86 | 99 |  * |  *
		 * ----+-------+-------+------+--------------+----+----
		 * 11  |   A   |   1   | 2.1  |  0 | 33 | 35*| 35*| 35*
		 * 12  |   A   |   2   | 1.2  |  0 | 19 | 35 | 39 |  *
		 * 13  |   A   |   3   | 30.0 |  0 | 90 |  * |  * |  *
		 * 14  |   A   |   5   | 50.0 |  0 |  * |  * |  * |  *
		 * 15  |   A   |   5   | 250  |  0 |  * |  * |  * |  *
		 */
		const offsets = [
			[ 0,  0,  39, 68,   0,   0,  0,  0,  0,   0,  0,   0,   0,   0,   0],
			[60, 65,  68, 93,  85, 100, 70, 70, 48,  86, 33,  19,  90, 100, 100],
			[65, 65,  80, 95,  98, 100, 85, 85, 65,  99, 35,  35, 100, 100, 100],
			[65, 65,  95, 95, 100, 100, 95, 85, 65, 100, 35,  39, 100, 100, 100],
			[65, 65, 100, 95, 100, 100, 95, 85, 65, 100, 35, 100, 100, 100, 100]
		];

		// verify initial mining progress
		for(let i = 0; i < plots.length; i++) {
			assert.equal(offsets[0][i], await plot.getOffset(plots[i]), "wrong initial mining progress for plot " + i);
		}

		// rewind 1 day – 24 hours – 1440 minutes
		await np.incTime(86400);
		// verify mining progress estimation
		for(let i = 0; i < plots.length; i++) {
			assert.equal(offsets[1][i], await miner.evaluate(plots[i]), "wrong progress eval after 1 day for plot " + i);
		}
		// mine all the plots
		for(let i = 0; i < plots.length; i++) {
			await miner.update(plots[i]);
		}
		// verify plot offsets
		for(let i = 0; i < plots.length; i++) {
			assert.equal(offsets[1][i], await plot.getOffset(plots[i]), "wrong plot offset after 1 day of mining for plot " + i);
		}

		// rewind 1 more day – 48 hours total – +1440 minutes
		await np.incTime(172800);
		// verify mining progress estimation
		for(let i = 0; i < plots.length; i++) {
			if(offsets[2][i] === 100 && offsets[1][i] === 100) {
				await assertThrows(miner.evaluate, plots[i]);
			}
			else {
				assert.equal(offsets[2][i], await miner.evaluate(plots[i]), "wrong progress eval after 2 days for plot " + i);
			}
		}
		// mine all the plots
		for(let i = 0; i < plots.length; i++) {
			if(offsets[2][i] === offsets[1][i]) {
				await assertThrows(miner.update, plots[i]);
			}
			else {
				await miner.update(plots[i]);
			}
		}
		// verify plot offsets
		for(let i = 0; i < plots.length; i++) {
			assert.equal(offsets[2][i], await plot.getOffset(plots[i]), "wrong plot offset after 2 days of mining for plot " + i);
		}

		// rewind 2 more days – 96 hours total – +2880 minutes
		await np.incTime(345600);
		// verify mining progress estimation
		for(let i = 0; i < plots.length; i++) {
			if(offsets[3][i] === 100 && offsets[2][i] === 100) {
				await assertThrows(miner.evaluate, plots[i]);
			}
			else {
				assert.equal(offsets[3][i], await miner.evaluate(plots[i]), "wrong progress eval after 4 days for plot " + i);
			}
		}
		// mine all the plots
		for(let i = 0; i < plots.length; i++) {
			if(offsets[3][i] === offsets[2][i]) {
				await assertThrows(miner.update, plots[i]);
			}
			else {
				await miner.update(plots[i]);
			}
		}
		// verify plot offsets
		for(let i = 0; i < plots.length; i++) {
			assert.equal(offsets[3][i], await plot.getOffset(plots[i]), "wrong plot offset after 4 days of mining for plot " + i);
		}

		// rewind 28 more days – 768 hours total – +40320 minutes
		await np.incTime(2764800);
		// verify mining progress estimation
		for(let i = 0; i < plots.length; i++) {
			if(offsets[4][i] === 100 && offsets[3][i] === 100) {
				await assertThrows(miner.evaluate, plots[i]);
			}
			else {
				assert.equal(offsets[4][i], await miner.evaluate(plots[i]), "wrong progress eval after 32 days for plot " + i);
			}
		}
		// mine all the plots
		for(let i = 0; i < plots.length; i++) {
			if(offsets[4][i] === offsets[3][i]) {
				await assertThrows(miner.update, plots[i]);
			}
			else {
				await miner.update(plots[i]);
			}
		}
		// verify plot offsets
		for(let i = 0; i < plots.length; i++) {
			assert.equal(offsets[4][i], await plot.getOffset(plots[i]), "wrong plot offset after 32 days of mining for plot " + i);
		}

		// mining is complete, further progress is not possible due to gem level limitations
		// verify gem/plot locking state and release locked plots/gems
		for(let i = 0; i < plots.length; i++) {
			if(offsets[4][i] === 100) {
				assert(await plot.isTransferable(plots[i]), "plot " + i + " is not transferable after full mine");
				assert(await gem.isTransferable(gems[i]), "gem " + i + " is not transferable after full mine");
			}
			else {
				assert(!await plot.isTransferable(plots[i]), "plot " + i + " is transferable after partial mine");
				assert(!await gem.isTransferable(gems[i]), "gem " + i + " is transferable after partial mine");
				await miner.release(plots[i]);
				assert(await plot.isTransferable(plots[i]), "plot " + i + " is still not transferable after release");
				assert(await gem.isTransferable(gems[i]), "gem " + i + " is still not transferable after release");
			}
		}

	})
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
