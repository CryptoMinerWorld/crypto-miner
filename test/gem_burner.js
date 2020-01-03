// GemBurner smart contract dependencies
const Gem = artifacts.require("./GemERC721.sol");
const Silver = artifacts.require("./SilverERC20.sol");
const Gold = artifacts.require("./GoldERC20.sol");

// GemBurner smart contract itself
const GemBurner = artifacts.require("./GemBurner.sol");

// import ERC721Core dependencies
import {FEATURE_TRANSFERS, FEATURE_TRANSFERS_ON_BEHALF, ROLE_TOKEN_CREATOR} from "./erc721_core";

// Enables gem trading for silver
const FEATURE_SILVER_TRADE_ENABLED = 0x00000001;
// Enables gem trading for gold
const FEATURE_GOLD_TRADE_ENABLED = 0x00000002;

// Exchange rate manager is responsible for changing the exchange rates
const ROLE_EX_RATE_MANAGER = 0x00000001;

// silver exchange rates
const SLV_EX_RATES = [
	{gems: 4, silver: 1100}, // 1,100 silver for 4 level 1 gems
	{gems: 4, silver: 2800}, // 2,800 silver for 4 level 2 gems
	{gems: 4, silver: 7700}, // 7,700 silver for 4 level 3 gems
	{gems: 4, silver: 20000}, // 20,000 silver for 4 level 4 gems
	{gems: 4, silver: 80000} // 80,000 silver for 4 level 5 gems
];

// gold exchange rates
const GLD_EX_RATES = [
	{gems: 4, gold: 1}, // 1 gold for 4 grade D gems
	{gems: 4, gold: 2}, // 2 gold for 4 grade C gems
	{gems: 4, gold: 4}, // 4 gold for 4 grade B gems
	{gems: 4, gold: 9}, // 9 gold for 4 grade A gems
	{gems: 4, gold: 33}, // 33 gold for 4 grade AA gems
	{gems: 4, gold: 69} // 69 gold for 4 grade AAA gems
];

// GemBurner related tests
contract('GemBurner', (accounts) => {
	it("wrong inputs: constructor", async() => {
		// construct GemBurner dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// define new GemBurner function
		const fn = async(a, b, c) => await GemBurner.new(a, b, c);

		// zero inputs check
		await assertThrows(fn, 0, silver.address, gold.address);
		await assertThrows(fn, gem.address, 0, gold.address);
		await assertThrows(fn, gem.address, silver.address, 0);

		// verify dependency versions exist and correct
		await assertThrows(fn, accounts[1], silver.address, gold.address);
		await assertThrows(fn, gem.address, accounts[2], gold.address);
		await assertThrows(fn, gem.address, silver.address, accounts[3]);

		// verify correct inputs work
		await fn(gem.address, silver.address, gold.address);
	});

	it("initial state: silver exchange rates", async() => {
		// construct GemBurner dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct GemBurner itself
		const burner = await GemBurner.new(gem.address, silver.address, gold.address);

		// function to read silver exchange rates
		const fn = async(level) => await burner.getSilverExRate(level);

		// for levels out of range it fails
		await assertThrows(fn, 0);
		await assertThrows(fn, 6);

		// for correct levels it produces correct results
		for(let i = 0; i < SLV_EX_RATES.length; i++) {
			// load the exchange rate from smart contract
			const rate = await fn(i + 1);
			// verify if the rate is correct
			assert.equal(SLV_EX_RATES[i].gems, rate[0], "incorrect initial silver ex rate gems:rate[0] for level " + (i + 1));
			assert.equal(SLV_EX_RATES[i].gems, rate.gems, "incorrect initial silver ex rate gems:rate.gems for level " + (i + 1));
			assert.equal(SLV_EX_RATES[i].silver, rate[1], "incorrect initial silver ex rate silver:rate[1] for level " + (i + 1));
			assert.equal(SLV_EX_RATES[i].silver, rate.silver, "incorrect initial silver ex rate silver:rate.silver for level " + (i + 1));
		}
	});
	it("initial state: gold exchange rates", async() => {
		// construct GemBurner dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct GemBurner itself
		const burner = await GemBurner.new(gem.address, silver.address, gold.address);

		// function to read gold exchange rates
		const fn = async(level) => await burner.getGoldExRate(level);

		// for levels out of range it fails
		await assertThrows(fn, 0);
		await assertThrows(fn, 7);

		// for correct levels it produces correct results
		for(let i = 0; i < GLD_EX_RATES.length; i++) {
			// load the exchange rate from smart contract
			const rate = await fn(i + 1);
			// verify if the rate is correct
			assert.equal(GLD_EX_RATES[i].gems, rate[0], "incorrect initial gold ex rate gems:rate[0] for grade " + (i + 1));
			assert.equal(GLD_EX_RATES[i].gems, rate.gems, "incorrect initial gold ex rate gems:rate.gems for grade " + (i + 1));
			assert.equal(GLD_EX_RATES[i].gold, rate[1], "incorrect initial gold ex rate gold:rate[1] for grade " + (i + 1));
			assert.equal(GLD_EX_RATES[i].gold, rate.gold, "incorrect initial gold ex rate gold:rate.gold for grade " + (i + 1));
		}
	});

	it("trading: silver calculation and trade for silver", async() => {
		// construct GemBurner dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct GemBurner itself
		const burner = await GemBurner.new(gem.address, silver.address, gold.address);

		// default gem owner account
		const owner = accounts[1];

		// mint some gems of different levels
		const gems = [
			// all levels in a row are equal except for last column
			[1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 2010], // level 1
			[2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 3010], // level 2
			[3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 4010], // level 3
			[4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 5010], // level 4
			[5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 1010], // level 5
		];
		for(let i = 0; i < gems.length; i++) { // level i + 1
			for(let j = 0; j < gems[i].length; j++) {
				await gem.mint(owner, gems[i][j], 1, gems[i][j] / 1000 | 0, 0x01000001);
			}
		}

		// define a function to pick some gems and evaluate amount of silver
		const fnEval = async(idx, offset, length) => await burner.evalSilver(gems[idx].map(e => toBN(e)).slice(offset, offset + length));

		for(let i = 0; i < gems.length; i++) {
			// calculating with wrong parameters fails
			await assertThrows(fnEval, i, 0, 2 * SLV_EX_RATES[i].gems - 1); // wrong number of gems
			await assertThrows(fnEval, i, 0, SLV_EX_RATES[i].gems - 1); // wrong number of gems
			await assertThrows(fnEval, i, 0, 1); // wrong number of gems
			await assertThrows(fnEval, i, 0, 0); // wrong number of gems
			await assertThrows(fnEval, i, 2, 2 * SLV_EX_RATES[i].gems); // wrong level
			await assertThrows(fnEval, i, 6, SLV_EX_RATES[i].gems); // wrong level

			// calculating with proper parameters succeeds
			assert.equal(SLV_EX_RATES[i].silver, await fnEval(i, 0, SLV_EX_RATES[i].gems), "wrong evalSilver result for 4 gems of level " + (i + 1));
			assert.equal(2 * SLV_EX_RATES[i].silver, await fnEval(i, 0, 2 * SLV_EX_RATES[i].gems), "wrong evalSilver result for 8 gems of level " + (i + 1));
		}

		// define a function to trade for silver
		const fnTrade = async(idx, offset, length) => await burner.tradeForSilver(gems[idx].map(e => toBN(e)).slice(offset, offset + length), {from: owner});

		// grant an approval to transfer gems
		await gem.setApprovalForAll(burner.address, true, {from: owner});
		// enable trading for silver feature
		await burner.updateFeatures(FEATURE_SILVER_TRADE_ENABLED);
		// grant burner rights to mint silver
		await silver.updateRole(burner.address, ROLE_TOKEN_CREATOR);
		// enable gem transfers
		await gem.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		for(let i = 0; i < gems.length; i++) {
			// trading with wrong parameters fails
			await assertThrows(fnTrade, i, 0, 2 * SLV_EX_RATES[i].gems - 1); // wrong number of gems
			await assertThrows(fnTrade, i, 0, SLV_EX_RATES[i].gems - 1); // wrong number of gems
			await assertThrows(fnTrade, i, 0, 1); // wrong number of gems
			await assertThrows(fnTrade, i, 0, 0); // wrong number of gems
			await assertThrows(fnTrade, i, 2, 2 * SLV_EX_RATES[i].gems); // wrong level
			await assertThrows(fnTrade, i, 6, SLV_EX_RATES[i].gems); // wrong level

			// trading with proper parameters succeeds
			await fnTrade(i, 0, 2 * SLV_EX_RATES[i].gems);
		}

		// verify balances
		assert.equal(2 * gems.length, await gem.balanceOf(owner), "incorrect gem balance after burning");
		assert.equal(
			2 * SLV_EX_RATES.reduce((a, b) => a + b.silver, 0),
			(await silver.balanceOf(owner)).divRound(toBN(10).pow(await silver.decimals())),
			"incorrect silver balance after trading gems for silver"
		);
	});
	it("trading: gold calculation and trade for gold", async() => {
		// construct GemBurner dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct GemBurner itself
		const burner = await GemBurner.new(gem.address, silver.address, gold.address);

		// default gem owner account
		const owner = accounts[1];

		// mint some gems of different grades
		const gems = [
			// all grades in a row are equal except for last column
			[1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 2010], // grade 1 (D)
			[2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 3010], // grade 2 (C)
			[3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 4010], // grade 3 (B)
			[4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 5010], // grade 4 (A)
			[5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 6010], // grade 5 (AA)
			[6001, 6002, 6003, 6004, 6005, 6006, 6007, 6008, 6009, 1010], // grade 6 (AAA)
		];
		for(let i = 0; i < gems.length; i++) { // grade i + 1
			for(let j = 0; j < gems[i].length; j++) {
				await gem.mint(owner, gems[i][j], 1, 1, ((gems[i][j] / 1000 | 0) << 24) | 1);
			}
		}

		// define a function to pick some gems and evaluate amount of gold
		const fnEval = async(idx, offset, length) => await burner.evalGold(gems[idx].map(e => toBN(e)).slice(offset, offset + length));

		for(let i = 0; i < gems.length; i++) {
			// calculating with wrong parameters fails
			await assertThrows(fnEval, i, 0, 2 * GLD_EX_RATES[i].gems - 1); // wrong number of gems
			await assertThrows(fnEval, i, 0, GLD_EX_RATES[i].gems - 1); // wrong number of gems
			await assertThrows(fnEval, i, 0, 1); // wrong number of gems
			await assertThrows(fnEval, i, 0, 0); // wrong number of gems
			await assertThrows(fnEval, i, 2, 2 * GLD_EX_RATES[i].gems); // wrong grade
			await assertThrows(fnEval, i, 6, GLD_EX_RATES[i].gems); // wrong grade

			// calculating with proper parameters succeeds
			assert.equal(GLD_EX_RATES[i].gold, await fnEval(i, 0, GLD_EX_RATES[i].gems), "wrong evalGold result for 4 gems of grade " + (i + 1));
			assert.equal(2 * GLD_EX_RATES[i].gold, await fnEval(i, 0, 2 * GLD_EX_RATES[i].gems), "wrong evalGold result for 8 gems of grade " + (i + 1));
		}

		// define a function to trade for gold
		const fnTrade = async(idx, offset, length) => await burner.tradeForGold(gems[idx].map(e => toBN(e)).slice(offset, offset + length), {from: owner});

		// grant an approval to transfer gems
		await gem.setApprovalForAll(burner.address, true, {from: owner});
		// enable trading for gold feature
		await burner.updateFeatures(FEATURE_GOLD_TRADE_ENABLED);
		// grant burner rights to mint gold
		await gold.updateRole(burner.address, ROLE_TOKEN_CREATOR);
		// enable gem transfers
		await gem.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		for(let i = 0; i < gems.length; i++) {
			// trading with wrong parameters fails
			await assertThrows(fnTrade, i, 0, 2 * GLD_EX_RATES[i].gems - 1); // wrong number of gems
			await assertThrows(fnTrade, i, 0, GLD_EX_RATES[i].gems - 1); // wrong number of gems
			await assertThrows(fnTrade, i, 0, 1); // wrong number of gems
			await assertThrows(fnTrade, i, 0, 0); // wrong number of gems
			await assertThrows(fnTrade, i, 2, 2 * GLD_EX_RATES[i].gems); // wrong grade
			await assertThrows(fnTrade, i, 6, GLD_EX_RATES[i].gems); // wrong grade

			// trading with proper parameters succeeds
			await fnTrade(i, 0, 2 * GLD_EX_RATES[i].gems);
		}

		// verify balances
		assert.equal(2 * gems.length, await gem.balanceOf(owner), "incorrect gem balance after burning");
		assert.equal(
			2 * GLD_EX_RATES.reduce((a, b) => a + b.gold, 0),
			(await gold.balanceOf(owner)).divRound(toBN(10).pow(await gold.decimals())),
			"incorrect gold balance after trading gems for gold"
		);
	});
	it("permissions: trade constraints and permissions", async() => {
		// construct GemBurner dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct GemBurner itself
		const burner = await GemBurner.new(gem.address, silver.address, gold.address);

		// default gem owner account and some other account
		const owner = accounts[1];
		const someone = accounts[2];

		// mint some gems of different levels and grades
		const gems = [
			// all grades in a row are equal except for last column
			[1001, 1002, 1003, 1004], // level 1, grade 1 (D)
			[2001, 2002, 2003, 2004], // level 2, grade 2 (C)
		];
		for(let i = 0; i < gems.length; i++) { // level and grade i + 1
			for(let j = 0; j < gems[i].length; j++) {
				const levelGrade = (gems[i][j] / 1000 | 0);
				await gem.mint(owner, gems[i][j], 1, levelGrade, (levelGrade << 24) | 1);
			}
		}

		// define trade for silver and trade for gold functions
		const fnSlv = async() => await burner.tradeForSilver(gems[0].map(e => toBN(e)), {from: owner});
		const fnGld = async() => await burner.tradeForGold(gems[1].map(e => toBN(e)), {from: owner});

		// first we check all the permissions
		// initially everything fails – no permissions
		await assertThrows(fnSlv);
		await assertThrows(fnGld);

		// full set of required permissions:
		await gem.setApprovalForAll(burner.address, true, {from: owner});
		await burner.updateFeatures(FEATURE_SILVER_TRADE_ENABLED | FEATURE_GOLD_TRADE_ENABLED);
		await silver.updateRole(burner.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(burner.address, ROLE_TOKEN_CREATOR);
		await gem.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// removing any of the above breaks the trade
		await gem.setApprovalForAll(burner.address, false, {from: owner});
		await assertThrows(fnSlv);
		await assertThrows(fnGld);
		await gem.setApprovalForAll(burner.address, true, {from: owner});

		await burner.updateFeatures(FEATURE_GOLD_TRADE_ENABLED);
		await assertThrows(fnSlv);
		await burner.updateFeatures(FEATURE_SILVER_TRADE_ENABLED);
		await assertThrows(fnGld);
		await burner.updateFeatures(FEATURE_SILVER_TRADE_ENABLED | FEATURE_GOLD_TRADE_ENABLED);

		await silver.updateRole(burner.address, 0);
		await assertThrows(fnSlv);
		await silver.updateRole(burner.address, ROLE_TOKEN_CREATOR);

		await gold.updateRole(burner.address, 0);
		await assertThrows(fnGld);
		await gold.updateRole(burner.address, ROLE_TOKEN_CREATOR);

		await gem.updateFeatures(FEATURE_TRANSFERS);
		await assertThrows(fnSlv);
		await assertThrows(fnGld);
		await gem.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// trying to use same gem twice breaks the trade
		gems[0][0] = 1002;
		gems[1][0] = 2002;
		await assertThrows(fnSlv);
		await assertThrows(fnGld);
		// trying to use nonexistent gem breaks the trade
		gems[0][0] = 1000;
		gems[1][0] = 2000;
		await assertThrows(fnSlv);
		await assertThrows(fnGld);
		gems[0][0] = 1001;
		gems[1][0] = 2001;
		// trying to use gem belonging to someone else breaks the trade
		await gem.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await gem.transfer(someone, 1001, {from: owner});
		await gem.transfer(someone, 2001, {from: owner});
		await gem.setApprovalForAll(burner.address, true, {from: someone});
		await assertThrows(fnSlv);
		await assertThrows(fnGld);
		await gem.transfer(owner, 1001, {from: someone});
		await gem.transfer(owner, 2001, {from: someone});
		// using unsorted gem array breaks the trade
		[gems[0][0], gems[0][1]] = [gems[0][1], gems[0][0]];
		[gems[1][0], gems[1][1]] = [gems[1][1], gems[1][0]];
		await assertThrows(fnSlv);
		await assertThrows(fnGld);
		[gems[0][0], gems[0][1]] = [gems[0][1], gems[0][0]];
		[gems[1][0], gems[1][1]] = [gems[1][1], gems[1][0]];

		// finally when all roles are set correctly and data is valid trade succeeds
		await fnSlv();
		await fnGld();
	});
});

// import auxiliary function to ensure function `fn` throws
import {assertThrows, toBN} from "../scripts/shared_functions";
