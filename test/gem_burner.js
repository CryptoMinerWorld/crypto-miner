// GemBurner smart contract dependencies
const Gem = artifacts.require("./GemERC721.sol");
const Silver = artifacts.require("./SilverERC20.sol");
const Gold = artifacts.require("./GoldERC20.sol");

// GemBurner smart contract itself
const GemBurner = artifacts.require("./GemBurner.sol");

// import ERC721Core dependencies
import {FEATURE_TRANSFERS_ON_BEHALF, ROLE_TOKEN_CREATOR} from "./erc721_core";

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

// fold exchange rates
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
		assert.equal(10, await gem.balanceOf(owner), "incorrect gem balance after burning");
		assert.equal(
			2 * SLV_EX_RATES.reduce((a, b) => a + b.silver, 0),
			(await silver.balanceOf(owner)).divRound(toBN(10).pow(await silver.decimals())),
			"incorrect silver balance after trading gems for silver"
		);

	});
});

// import auxiliary function to ensure function `fn` throws
import {assertThrows, toBN} from "../scripts/shared_functions";
