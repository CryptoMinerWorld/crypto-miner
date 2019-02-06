// Level provider is responsible for enabling the workshop
const ROLE_LEVEL_PROVIDER = 0x00100000;

// Grade provider is responsible for enabling the workshop
const ROLE_GRADE_PROVIDER = 0x00200000;

// Enables gem leveling up and grade type upgrades
const FEATURE_UPGRADES_ENABLED = 0x00000001;

// Token destroyer is responsible for destroying tokens
const ROLE_TOKEN_DESTROYER = 0x00000002;

// Enables ERC721 transfers of the tokens
const FEATURE_TRANSFERS = 0x00000001;

// GemERC721 smart contract
const Gem = artifacts.require("./GemERC721.sol");
// Silver smart contract
const Silver = artifacts.require("./SilverERC20.sol");
// GoldERC20 smart contract
const Gold = artifacts.require("./GoldERC20.sol");
// Workshop smart contract
const Workshop = artifacts.require("./Workshop.sol");

// 2 as a BigNumber
const two = web3.toBigNumber(2);

contract('Workshop', (accounts) => {
	it("wrong inputs: constructor", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// define new workshop function
		const fn = async(a, b, c) => await Workshop.new(a, b, c);

		// zero inputs check
		await assertThrowsAsync(fn, 0, silver.address, gold.address);
		await assertThrowsAsync(fn, gem.address, 0, gold.address);
		await assertThrowsAsync(fn, gem.address, silver.address, 0);

		// all inputs are different
		await assertThrowsAsync(fn, gem.address, gem.address, gold.address);
		await assertThrowsAsync(fn, gem.address, silver.address, silver.address);
		await assertThrowsAsync(fn, gold.address, silver.address, gold.address);

		// verify versions exist and correct
		await assertThrowsAsync(fn, accounts[1], silver.address, gold.address);
		await assertThrowsAsync(fn, gem.address, accounts[2], gold.address);
		await assertThrowsAsync(fn, gem.address, silver.address, accounts[3]);
	});
	it("wrong inputs: level up and upgrade prices calculation", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct workshop itself
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		// define player account
		const player = accounts[1];

		// mint a gem to level up and upgrade
		await gem.mint(player, 1, 1, 0, 1, 1, 3, 3, 1); // level: 3, grade: 3 (C)

		// functions to estimate silver and gold prices
		const fn1 = async(delta) => await workshop.getUpgradePrice(1, delta, 0);
		const fn2 = async(delta) => await workshop.getUpgradePrice(1, 0, delta);

		// functions succeed until maximum level/grade is reached
		await fn1(1);
		await fn2(1);
		await fn1(2);
		await fn2(2);
		await assertThrowsAsync(fn1, 3);
		await fn2(3);
		await assertThrowsAsync(fn1, 4);
		await assertThrowsAsync(fn2, 4);
		// arithmetic overflow checks
		await assertThrowsAsync(fn1, 254);
		await assertThrowsAsync(fn2, 254);
	});
	it("wrong inputs: bulk upgrade price", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct workshop itself
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		// define player account
		const player = accounts[1];

		// define some gems: ids, initial levels and grades, how much to level up / upgrade
		const gemIds   = [1, 2, 3, 4, 5]; // gem IDs
		const levels   = [1, 2, 2, 1, 4]; // initial levels
		const grades   = [2, 1, 3, 5, 1]; // initial grades
		const lvlUps   = [0, 3, 2, 1, 0]; // level deltas (how much to increase)
		const upgrades = [4, 5, 3, 1, 0]; // grade deltas (how much to increase)

		// create the gems
		for(let i = 0; i < gemIds.length; i++) {
			await gem.mint(player, gemIds[i], 1, 0, 1, 1, levels[i], grades[i], 1);
		}

		// bulk upgrade price calculation function
		const fn = async(a, b, c) => await workshop.getBulkUpgradePrice(a, b, c);

		// test wrong params
		await assertThrowsAsync(fn, [], lvlUps, upgrades);
		await assertThrowsAsync(fn, gemIds, [], upgrades);
		await assertThrowsAsync(fn, gemIds, lvlUps, []);

		// and try one more last time - successful
		const bulkPrice = await fn(gemIds, lvlUps, upgrades);

		// verify the result
		assert.equal(260, bulkPrice[0], "wrong bulk price calculated (silver)");
		assert.equal(121, bulkPrice[1], "wrong bulk price calculated (gold)");
	});
	it("wrong inputs: bulk upgrade", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct workshop itself
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		// define player accounts
		const player = accounts[1];
		const player1 = accounts[2];

		// define some gems: ids, initial levels and grades, how much to level up / upgrade
		const gemIds   = [1, 2, 3, 4, 5]; // gem IDs
		const levels   = [1, 2, 2, 1, 4]; // initial levels
		const grades   = [2, 1, 3, 5, 1]; // initial grades
		const lvlUps   = [0, 3, 2, 1, 0]; // level deltas (how much to increase)
		const upgrades = [4, 5, 3, 1, 0]; // grade deltas (how much to increase)

		// create the gems
		for(let i = 0; i < gemIds.length; i++) {
			await gem.mint(player, gemIds[i], 1, 0, 1, 1, levels[i], grades[i], 1);
		}

		// bulk upgrade price calculation function
		const fn = async(a, b, c) => await workshop.bulkUpgrade(a, b, c, {from: player});

		// enable upgrades on the workshop
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
		// grant a workshop ROLE_TOKEN_DESTROYER role on both silver and gold
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		// grant the workshop permissions required on the gem smart contract
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER);
		await gem.addRole(workshop.address, ROLE_GRADE_PROVIDER);

		// mint required silver and gold amounts
		await silver.mint(player, 10260);
		await gold.mint(player, 10121);

		// test wrong params
		await assertThrowsAsync(fn, [], lvlUps, upgrades);
		await assertThrowsAsync(fn, gemIds, [], upgrades);
		await assertThrowsAsync(fn, gemIds, lvlUps, []);

		// what if one of the gems belongs to some other player
		// enable gem transfers
		await gem.updateFeatures(FEATURE_TRANSFERS);
		// transfer a gem to some other account
		await gem.transfer(player1, gemIds[4], {from: player});
		// try to perform an upgrade
		await assertThrowsAsync(fn, gemIds, lvlUps, upgrades);
		// transfer the gem back
		await gem.transfer(player, gemIds[4], {from: player1});

		// and try one more last time - successful
		await fn(gemIds, lvlUps, upgrades);

		// verify new levels and grades
		await verifyGemProperties(gemIds, gem, levels, lvlUps, grades, upgrades);

		// verify silver an gold was consumed correctly
		assert.equal(10000, await silver.balanceOf(player), "wrong silver balance after bulk level up");
		assert.equal(10000, await gold.balanceOf(player), "wrong gold balance after bulk upgrade");
	});
	it("upgrades: price calculation - general flow", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct workshop itself
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		// define player account
		const player = accounts[1];

		// define some gems: ids, initial levels and grades, how much to level up / upgrade
		const gemIds   = [1, 2, 3, 4, 5]; // gem IDs
		const levels   = [1, 2, 2, 1, 4]; // initial levels
		const grades   = [2, 1, 3, 5, 1]; // initial grades
		const lvlUps   = [0, 3, 2, 1, 1]; // level deltas (how much to increase)
		const upgrades = [4, 5, 3, 1, 0]; // grade deltas (how much to increase)

		// create the gems
		for(let i = 0; i < gemIds.length; i++) {
			await gem.mint(player, gemIds[i], 1, 0, 1, 1, levels[i], grades[i], 1);
		}

		// perform few gem upgrade calculations
		const silverGoldRequired1 = await workshop.getUpgradePrice(gemIds[1], lvlUps[1], upgrades[1]);
		const silverRequired1 = silverGoldRequired1[0];
		const goldRequired1 = silverGoldRequired1[1];

		// perform bulk calculation
		const bulkPrice = await workshop.getBulkUpgradePrice(gemIds, lvlUps, upgrades);

		// extract silver and gold required values
		const bulkSilverRequired = bulkPrice[0];
		const bulkGoldRequired = bulkPrice[1];

		/*
		 * Verify calculated values according to the level up and upgrade price table:
		 * Levels:
		 *      1-2:    5
		 *      2-3:    15
		 *      3-4:    45
		 *      4-5:    135
		 * Grades:
		 *      D-C:    1
		 *      C-B:    2
		 *      B-A:    4
		 *      A-AA:   8
		 *      AA-AAA: 16
		 *
		 * Silver (1): 195 = 15 + 45 + 135
		 * Gold (1):   31 = 1 + 2 + 4 + 8 + 16
		 * Silver (Bulk): 395 = 0 + (15 + 45 + 135) + (15 + 45) + 5 + 135
		 * Gold (Bulk):   105 = (2 + 4 + 8 + 16) + (1 + 2 + 4 + 8 + 16) + (4 + 8 + 16) + 16 + 0
		 */
		assert.equal(195, silverRequired1, "wrong silver required (1) value");
		assert.equal(31, goldRequired1, "wrong gold required (1) value");
		assert.equal(395, bulkSilverRequired, "wrong bulk silver required value");
		assert.equal(105, bulkGoldRequired, "wrong bulk gold required value")
	});

	it("upgrades: single gem upgrade", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct workshop itself
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		// define player account
		const player = accounts[1];

		// mint a gem to level up and upgrade
		await gem.mint(player, 1, 1, 0, 1, 1, 1, 1, 1); // level: 1, grade: 1 (D)

		// define level up function
		const fn1 = async() => await workshop.upgrade(1, 3, 0, {from: player});
		// define grade upgrade function
		const fn2 = async() => await workshop.upgrade(1, 0, 3, {from: player});
		// define function which both levels up and upgrades gem
		const fn3 = async() => await workshop.upgrade(1, 1, 1, {from: player});
		// define grade upgrade to upgrade grade by 1
		const fn4 = async() => await workshop.upgrade(1, 0, 1, {from: player});

		// enable upgrades on the workshop
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
		// grant a workshop ROLE_TOKEN_DESTROYER role on both silver and gold
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		// grant the workshop permissions required on the gem smart contract
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER);
		await gem.addRole(workshop.address, ROLE_GRADE_PROVIDER);

		// we didn't mint any silver / gold – so the workshop won't work
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);
		await assertThrowsAsync(fn3);
		await assertThrowsAsync(fn4);

		// mint required silver and gold amounts
		await silver.mint(player, 10200);
		await gold.mint(player, 1031);

		// disable upgrades on the workshop and verify workshop doesn't work
		await workshop.updateFeatures(0);
		// leveling up and upgrades are disabled
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);
		await assertThrowsAsync(fn3);
		await assertThrowsAsync(fn4);
		// enable feature back
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);

		// revoke silver related permissions
		await silver.updateRole(workshop.address, 0);
		// verify silver consuming transactions fail
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn3);
		// grant silver related permission back
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		// revoke gold related permissions
		await gold.updateRole(workshop.address, 0);
		// verify gold consuming transactions fail
		await assertThrowsAsync(fn2);
		await assertThrowsAsync(fn3);
		await assertThrowsAsync(fn4);
		// grant gold related permission back
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		// revoke level provider role from the workshop and verify leveling up fails
		await gem.removeRole(workshop.address, ROLE_LEVEL_PROVIDER);
		// verify level up transaction fails
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn3);
		// grant role level provider back
		await gem.addRole(workshop.address, ROLE_LEVEL_PROVIDER);

		// revoke grade provider role from the workshop and verify upgrades fail
		await gem.removeRole(workshop.address, ROLE_GRADE_PROVIDER);
		// verify upgrade transaction fails
		await assertThrowsAsync(fn2);
		await assertThrowsAsync(fn3);
		await assertThrowsAsync(fn4);
		// grant role grade provider back
		await gem.addRole(workshop.address, ROLE_GRADE_PROVIDER);

		// perform a level up
		await fn1();
		// verify gem leveled up correctly
		assert.equal(4, await gem.getLevel(1), "incorrect gem level after successful level up");
		// verify silver was consumed
		assert.equal(10135, await silver.balanceOf(player), "incorrect silver balance after successful level up");
		assert.equal(10135, await silver.totalSupply(), "incorrect silver total supply after successful level up");

		// save initial gem grade value
		const grade2 = (await gem.getGradeValue(1)).toNumber();

		// perform grade upgrade
		await fn2();
		// verify gem grade was changed correctly
		assert.equal(4, await gem.getGradeType(1), "incorrect gem grade type after successful upgrade");
		// verify grade value is not zero and has been changed (not one)
		assert((await gem.getGradeValue(1)).gt(1), "wrong grade value after upgrade");
		// verify gold was consumed
		assert.equal(1024, await gold.balanceOf(player), "incorrect gold balance after successful upgrade");
		assert.equal(1024, await gold.totalSupply(), "incorrect gold total supply after successful upgrade");

		// due to level and grade constraints leveling up and upgrading by 3 is impossible
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);

		// save next gem grade value
		const grade3 = (await gem.getGradeValue(1)).toNumber();

		// leveling up and upgrading is still possible by 1 until maximum is reached
		await fn3();
		// verify the changes
		assert.equal(5, await gem.getLevel(1), "incorrect gem level after second level up");
		assert.equal(5, await gem.getGradeType(1), "incorrect gem grade type after second upgrade");
		// verify silver and gold was consumed correctly
		assert.equal(10000, await silver.balanceOf(player), "incorrect silver balance after second level up");
		assert.equal(1016, await gold.balanceOf(player), "incorrect gold balance after second upgrade");

		// save next gem grade value
		const grade4 = (await gem.getGradeValue(1)).toNumber();

		// last successful gem upgrade is possible
		await fn4();
		// verify the changes
		assert.equal(5, await gem.getLevel(1), "incorrect gem level after third level up");
		assert.equal(6, await gem.getGradeType(1), "incorrect gem grade type after third upgrade");
		// verify silver and gold was consumed correctly
		assert.equal(10000, await silver.balanceOf(player), "incorrect silver balance after third level up");
		assert.equal(1000, await gold.balanceOf(player), "incorrect gold balance after third` upgrade");

		// the gems is on its maximum level and grade, no upgrades are possible anymore
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);
		await assertThrowsAsync(fn3);
		await assertThrowsAsync(fn4);

		// verify gem grade value increases only: grade2 < grade3 < grade4
		assert(grade2 < grade3, "grade didn't increase! constraint grade2 < grade3 didn't meet");
		assert(grade3 < grade4, "grade didn't increase! constraint grade3 < grade4 didn't meet");
	});

	it("upgrades: bulk upgrade", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct workshop itself
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		// define player account
		const player = accounts[1];

		// define some gems: ids, initial levels and grades, how much to level up / upgrade
		const gemIds   = [1, 2, 3, 4, 5, 6, 7, 8, 9,10]; // gem IDs
		const levels   = [1, 2, 2, 1, 4, 1, 5, 2, 1, 3]; // initial levels
		const grades   = [2, 1, 3, 5, 1, 1, 5, 1, 3, 4]; // initial grades
		const lvlUps   = [0, 3, 2, 1, 1, 3, 0, 3, 1, 1]; // level deltas (how much to increase)
		const upgrades = [4, 5, 3, 1, 0, 2, 1, 4, 1, 2]; // grade deltas (how much to increase)

		// create the gems
		for(let i = 0; i < gemIds.length; i++) {
			await gem.mint(player, gemIds[i], 1, 0, 1, 1, levels[i], grades[i], 1);
		}

		/*
		 * Calculate silver/gold values according to the level up and upgrade price table:
		 * Levels:
		 *      1-2:    5
		 *      2-3:    15
		 *      3-4:    45
		 *      4-5:    135
		 * Grades:
		 *      D-C:    1
		 *      C-B:    2
		 *      B-A:    4
		 *      A-AA:   8
		 *      AA-AAA: 16
		 *
		 * Silver: 705 = 0 + (15 + 45 + 135) + (15 + 45) + 5 + 135 + (5 + 15 + 45) + 0 + (15 + 45 + 135) + 5 + 45
		 * Gold:   167 = (2 + 4 + 8 + 16) + (1 + 2 + 4 + 8 + 16) + (4 + 8 + 16) + 16 + 0 + (1 + 2) + 16 + (1 + 2 + 4 + 8) + 4 + (8 + 16)
		 */

		// grant a workshop ROLE_TOKEN_DESTROYER role on both silver and gold
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		// grant the workshop permissions required on the gem smart contract
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER);
		await gem.addRole(workshop.address, ROLE_GRADE_PROVIDER);

		// mint required silver and gold amounts
		await silver.mint(player, 10705);
		await gold.mint(player, 10167);

		// define bulk upgrade function
		const fn = async() => await workshop.bulkUpgrade(gemIds, lvlUps, upgrades, {from: player});

		// make sure bulk upgrade requires FEATURE_UPGRADES_ENABLED feature enabled
		await assertThrowsAsync(fn);

		// enable upgrades on the workshop
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);

		// perform bulk upgrade
		await fn();

		// verify new levels and grades
		await verifyGemProperties(gemIds, gem, levels, lvlUps, grades, upgrades);

		// verify silver an gold was consumed correctly
		assert.equal(10000, await silver.balanceOf(player), "wrong silver balance after bulk level up");
		assert.equal(10000, await gold.balanceOf(player), "wrong gold balance after bulk upgrade");
	});
});

// function to be used to verify gem properties after bulk level up/upgrades
async function verifyGemProperties(gemIds, gem, levels, lvlUps, grades, upgrades) {
	// iterate and verify
	for(let i = 0; i < gemIds.length; i++) {
		// read level, grade type and grade value as packed data
		const gemProps = await gem.getProperties(gemIds[i]);
		// extract level
		const level = gemProps.dividedToIntegerBy(0x100000000).modulo(0x100);
		// extract grade type
		const gradeType = gemProps.dividedToIntegerBy(0x1000000).modulo(0x100);
		// extract grade value
		const gradeValue = gemProps.modulo(0x1000000);

		// verify level at index i
		assert.equal(levels[i] + lvlUps[i], level, "wrong level at " + i);
		// verify grade at index i
		assert.equal(grades[i] + upgrades[i], gradeType, "wrong grade type at " + i);
		// if gem was upgraded
		if(upgrades[i] || !upgrades[i] && !lvlUps[i]) {
			// verify grade value is not zero and has been changed (not one)
			assert(gradeValue.gt(1), "wrong grade value at " + i + " after grade change: " + gradeValue.toNumber());
		}
		else {
			// otherwise ensure its grade value was not changed (equal to one)
			assert.equal(1, gradeValue, "wrong grade value at " + i);
		}
	}
}

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
