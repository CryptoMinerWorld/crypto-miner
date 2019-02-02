// Silver smart contract
const Silver = artifacts.require("./SilverERC20.sol");
// GoldERC20 smart contract
const Gold = artifacts.require("./GoldERC20.sol");

// Silver Box Sale smart contract
const Sale = artifacts.require("./SilverSale.sol");

// box types
const BOX_TYPES = ["Silver Box", "Rotund Silver Box", "Goldish Silver Box"];

// initial and final prices of the boxes
const INITIAL_PRICES = [96000000000000000, 320000000000000000, 760000000000000000];
const FINAL_PRICES  = [120000000000000000, 400000000000000000, 950000000000000000];

// Minimum amounts of silver each box type can have
const SILVER_MIN = [20, 70, 150, 100];

// Enables the silver / gold sale
const FEATURE_SALE_ENABLED = 0x00000001;

// Token creator is responsible for creating tokens
const ROLE_TOKEN_CREATOR = 0x00000001;

// maximum possible quantity
const MAX_QTY = 0xFFFF;

/**
 * Test verifies price calculation functions, bulk price calculation
 * functions, buy a box, bulk buy boxes flows for different types of boxes
 */
contract('SilverSale', (accounts) => {
	it("price: verify local price increase formula (JavaScript)", async() => {
		// define constant function arguments
		const t0 = 1548979200; // February 1, 2019
		const t1 = 1550707200; // February 21, 2019
		const v0 = 96000000000000000;
		const v1 = 120000000000000000;
		const dt = 86400; // 24 hours

		// define time checkpoints to perform measurements
		const t = [
			1549033200, // February 1, 2019 @ 15:00
			1549076400, // February 2, 2019 @ 3:00
			1549385340, // February 5, 2019 @ 16:49
			1550016000, // February 13, 2019
			1550707140, // February 20, 2019 @ 23:59
		];

		// define expected values for v
		const v = [
			96000000000000000,
			97200000000000000,
			100800000000000000,
			110400000000000000,
			118800000000000000
		];

		// verify the linear stepwise function (pure)
		for(let i = 0; i < t.length; i++) {
			assert.equal(v[i], linearStepwise(t0, v0, t1, v1, dt, t[i]), "wrong local v at index " + i + ", t = " + t[i]);
		}
	});
	it("price: verify remote price increase formula (Solidity)", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, chest, beneficiary, offset);

		// define constant function arguments
		const t0 = 1548979200; // February 1, 2019
		const t1 = 1550707200; // February 21, 2019
		const v0 = 96000000000000000;
		const v1 = 120000000000000000;
		const dt = 86400; // 24 hours

		// define time checkpoints to perform measurements
		const t = [
			1549033200, // February 1, 2019 @ 15:00
			1549076400, // February 2, 2019 @ 3:00
			1549385340, // February 5, 2019 @ 16:49
			1550016000, // February 13, 2019
			1550707140, // February 20, 2019 @ 23:59
		];

		// define expected values for v
		const v = [
			96000000000000000,
			97200000000000000,
			100800000000000000,
			110400000000000000,
			118800000000000000
		];

		// verify the linear stepwise function (pure)
		for(let i = 0; i < t.length; i++) {
			assert.equal(v[i], await sale.linearStepwise(t0, v0, t1, v1, dt, t[i]), "wrong remote v at index " + i + ", t = " + t[i]);
		}
	});
	it("price: verify remote price increase formula (random points)", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, chest, beneficiary, offset);

		// define constant function arguments
		const t0 = 1548979200; // February 1, 2019
		const t1 = 1550707200; // February 21, 2019
		const dt = 86400; // 24 hours

		// time point of interest will be changed in cycle
		let t = t0;

		// verify the linear stepwise function (pure)
		for(let i = 0; i < 20; i++) {
			// get some random box type for evaluation
			const j = Math.floor(INITIAL_PRICES.length * Math.random());
			const v0 = INITIAL_PRICES[j];
			const v1 = FINAL_PRICES[j];

			// verify the formula
			assert.equal(
				linearStepwise(t0, v0, t1, v1, dt, t).toNumber(),
				await sale.linearStepwise(t0, v0, t1, v1, dt, t),
				"wrong remote v for " + BOX_TYPES[j] + ", t = " + t
			);
			// update time of interest `t`
			t += Math.round(dt * Math.random());
		}
	});
	it("price: verify current price calculation", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset1 = 3600 + new Date().getTime() / 1000 | 0;
		const offset2 = -3600 + new Date().getTime() / 1000 | 0;
		const offset3 = -86400 + new Date().getTime() / 1000 | 0;
		const offset4 = -1728000 + new Date().getTime() / 1000 | 0;

		// instantiate few silver sales
		const sale1 = await Sale.new(silver.address, gold.address, chest, beneficiary, offset1);
		const sale2 = await Sale.new(silver.address, gold.address, chest, beneficiary, offset2);
		const sale3 = await Sale.new(silver.address, gold.address, chest, beneficiary, offset3);
		const sale4 = await Sale.new(silver.address, gold.address, chest, beneficiary, offset4);

		// current price function
		const fn = async(boxType) => await sale1.getBoxPrice(boxType);

		// verify fn throws if box type is incorrect
		await assertThrowsAsync(fn, 3);
		// but works correctly otherwise
		for(let i = 0; i < 3; i++) {
			assert.equal(INITIAL_PRICES[i], await fn(i), "incorrect initial box price for " + BOX_TYPES[i]);
		}

		// check some prices for already started sales
		for(let i = 0; i < 3; i++) {
			assert.equal(INITIAL_PRICES[i], await sale2.getBoxPrice(i), "incorrect 1st day price for " + BOX_TYPES[i]);
		}
		for(let i = 0; i < 3; i++) {
			assert.equal(INITIAL_PRICES[i] * 1.0125, await sale3.getBoxPrice(i), "incorrect 2nd day price for " + BOX_TYPES[i]);
		}
		for(let i = 0; i < 3; i++) {
			assert.equal(INITIAL_PRICES[i] * 1.25, await sale4.getBoxPrice(i), "incorrect last day price for " + BOX_TYPES[i]);
		}
	});
	it("price: verify bulk price calculation (initial)", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, chest, beneficiary, offset);

		// define bulk price function
		const fn0 = async(boxTypes, quantities) => await sale.bulkPrice(boxTypes, quantities);
		const fn = async(quantity) => await fn0([0, 1, 2], quantity);

		// fn throws on some wrong inputs
		await assertThrowsAsync(fn, []);
		await assertThrowsAsync(fn, [1, 2]);
		await assertThrowsAsync(fn, [0, 1, 2]);
		await assertThrowsAsync(fn, [2, 3, 0]);
		await assertThrowsAsync(fn, [2, MAX_QTY + 1, 4]);
		await assertThrowsAsync(fn0, [], []);
		await assertThrowsAsync(fn0, [0, 1, 2, 0], [2, MAX_QTY + 1, 4, 2]);

		// verify few bulk price calculations
		assert.equal(1176000000000000000, await fn([1, 1, 1]), "wrong bulk price (1)");
		assert.equal(8920000000000000000, await fn([20, 10, 5]), "wrong bulk price (2)");
		assert.equal(77069160000000000000000, await fn([MAX_QTY, MAX_QTY, MAX_QTY]), "wrong bulk price (3)");
	});

	it("buy: buying few boxes of the same type", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = new Date().getTime() / 1000 | 0;

		// save player and beneficiary initial balances
		const playerBalance = web3.eth.getBalance(player);
		const beneficiaryBalance = web3.eth.getBalance(beneficiary);

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, chest, beneficiary, offset);

		// define a function to buy a Silver Box
		// when buying 32 goldish boxes, chance of not getting
		// a single piece of gold is 0.000000026896502 (less than 1 in 10 000 000)
		const fn = async() => await sale.buy(2, 32, {from: player, value: 24320000000000000000});

		// enable all features and permissions required to enable buy
		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// now, by revoking only one of the features/roles enabled,
		// ensure sale is not possible without any of them:

		// disable FEATURE_SALE_ENABLED, ensure fn fails and enable back
		await sale.updateFeatures(0);
		await assertThrowsAsync(fn);
		await sale.updateFeatures(FEATURE_SALE_ENABLED);

		// revoke ROLE_TOKEN_CREATOR from silver, ensure fn fails and grant back
		await silver.updateRole(sale.address, 0);
		await assertThrowsAsync(fn);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// revoke ROLE_TOKEN_CREATOR from gold, ensure fn fails and grant back
		await gold.updateRole(sale.address, 0);
		await assertThrowsAsync(fn);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// all the permissions are granted, features enabled: execute the fn
		await fn();

		// verify there is some silver and gold minted
		assert((await silver.balanceOf(player)).gte(120 * 32), "zero silver player balance");
		assert((await gold.balanceOf(player)).gt(0), "zero gold player balance");

		// verify player and beneficiary balances has changed
		assert(playerBalance.gt(web3.eth.getBalance(player)), "player balance didn't decrease");
		assert(beneficiaryBalance.lt(web3.eth.getBalance(beneficiary)), "beneficiary balance didn't increase");
	});
	it("buy: buying all the boxes", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, chest, beneficiary, offset);

		// define functions to buy a Silver Boxes
		const fn1 = async() => await sale.buy(0, 444, {from: player, value: 114000000000000000000});
		const fn1a = async() => await sale.buy(0, 56, {from: player, value: 114000000000000000000});
		const fn2 = async() => await sale.buy(1, 222, {from: player, value: 114000000000000000000});
		const fn2a = async() => await sale.buy(1, 78, {from: player, value: 114000000000000000000});
		const fn3 = async() => await sale.buy(2, 111, {from: player, value: 114000000000000000000});
		const fn3a = async() => await sale.buy(2, 39, {from: player, value: 114000000000000000000});

		// enable all features and permissions required to enable buy
		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// verify final sale status
		assert.equal(0, await sale.boxesSold(0), "wrong initial sold counter for Silver Box");
		assert.equal(0, await sale.boxesSold(1), "wrong initial sold counter for Rotund Silver Box");
		assert.equal(0, await sale.boxesSold(2), "wrong initial sold counter for Goldish Silver Box");

		// when buying with the functions defined – first call will succeed, second will fail
		await fn1();
		await assertThrowsAsync(fn1);
		await fn2();
		await assertThrowsAsync(fn2);
		await fn3();
		await assertThrowsAsync(fn3);

		// buy rest of the boxes
		await fn1a();
		await fn2a();
		await fn3a();

		// verify final sale status
		assert.equal(500, await sale.boxesSold(0), "wrong final sold counter for Silver Box");
		assert.equal(300, await sale.boxesSold(1), "wrong final sold counter for Rotund Silver Box");
		assert.equal(150, await sale.boxesSold(2), "wrong final sold counter for Goldish Silver Box");
	});
	it("buy: validate balances after buying some boxes", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, chest, beneficiary, offset);

		// enable all features and permissions required to enable buy
		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// define buy properties
		const boxType = 1;
		const quantity = 17;
		const price = INITIAL_PRICES[boxType] * quantity;
		const silverMin = quantity * SILVER_MIN[boxType];
		const change = 1000000;

		// define a function to buy some boxes
		const fn = async(value) => await sale.buy(boxType, quantity, {from: player, value: value});

		// 17 Rotund Silver Boxes cost is 5.44 ETH
		// sending not enough ETH fails
		await assertThrowsAsync(fn, price - change);

		// save player and beneficiary balances
		const playerBalance0 = web3.eth.getBalance(player);
		const chestBalance0 = web3.eth.getBalance(chest);
		const beneficiaryBalance0 = web3.eth.getBalance(beneficiary);

		// buy 17 Rotund Silver Boxes
		const gasUsed0 = (await fn(price)).receipt.gasUsed;

		// verify silver balance is at least 17 * 70 = 1190
		assert((await silver.balanceOf(player)).gte(silverMin), "not enough silver minted (1)");

		// save new player and beneficiary balances
		const playerBalance1 = web3.eth.getBalance(player);
		const chestBalance1 = web3.eth.getBalance(chest);
		const beneficiaryBalance1 = web3.eth.getBalance(beneficiary);

		// verify that player balance changed accordingly
		assert(playerBalance0.minus(price).minus(gasUsed0).eq(playerBalance1), "incorrect player balance (1)");
		// verify that chest balance changed accordingly
		assert(chestBalance0.plus(price / 20).eq(chestBalance1), "incorrect chest balance (1)");
		// verify that beneficiary balance changed accordingly
		assert(beneficiaryBalance0.plus(price * 19 / 20).eq(beneficiaryBalance1), "incorrect beneficiary balance (1)");

		// buy 17 Rotund Silver Boxes again, sending more value than required
		const gasUsed1 = (await fn(price + change)).receipt.gasUsed;

		// verify silver balance is at least 2 * 17 * 70 = 1190
		assert((await silver.balanceOf(player)).gte(2 * silverMin), "not enough silver minted (2)");

		// verify that player balance changed accordingly
		assert(playerBalance1.minus(price).minus(gasUsed1).eq(web3.eth.getBalance(player)), "incorrect player balance (2)");
		// verify that beneficiary balance changed accordingly
		assert(chestBalance1.plus(price / 20).eq(web3.eth.getBalance(chest)), "incorrect chest balance (2)");
		// verify that beneficiary balance changed accordingly
		assert(beneficiaryBalance1.plus(price * 19 / 20).eq(web3.eth.getBalance(beneficiary)), "incorrect beneficiary balance (2)");
	});
	it("bulk buy: bulk specific validations", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, chest, beneficiary, offset);

		// define a function to buy a Silver Box, 57.088 ETH within transaction should be enough
		const fn = async(boxTypes, quantities) => await sale.bulkBuy(boxTypes, quantities, {from: player, value: 57088000000000000000});

		// enable all features and permissions required to enable buy
		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// verify wrong parameters don't work
		await assertThrowsAsync(fn, [], []);
		await assertThrowsAsync(fn, [0], [0]);
		await assertThrowsAsync(fn, [3], [1]);
		await assertThrowsAsync(fn, [0, 1, 2], [0, 1, 1]);
		await assertThrowsAsync(fn, [0, 1, 2], [MAX_QTY + 1, 1, 1]);
		await assertThrowsAsync(fn, [0, 1, 2, 0], [1, 1, 1, 1]);

		// verify correct parameters work
		// when buying 32 goldish boxes, chance of not getting
		// a single piece of gold is 0.000000026896502 (less than 1 in 10 000 000)
		await fn([0, 1, 2], [128, 64, 32]);

		// verify there is some silver and gold minted
		assert((await silver.balanceOf(player)).gt(0), "zero silver player balance");
		assert((await gold.balanceOf(player)).gt(0), "zero gold player balance");
	});
	it("bulk buy: bulk boxes of different type", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = new Date().getTime() / 1000 | 0;

		// save player and beneficiary initial balances
		const playerBalance = web3.eth.getBalance(player);
		const beneficiaryBalance = web3.eth.getBalance(beneficiary);

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, chest, beneficiary, offset);

		// define a function to buy a Silver Box
		// when buying 32 goldish boxes, chance of not getting
		// a single piece of gold is 0.000000026896502 (less than 1 in 10 000 000)
		const fn = async() => await sale.bulkBuy([0, 1, 2], [128, 64, 32], {from: player, value: 57088000000000000000});

		// enable all features and permissions required to enable buy
		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// now, by revoking only one of the features/roles enabled,
		// ensure sale is not possible without any of them:

		// disable FEATURE_SALE_ENABLED, ensure fn fails and enable back
		await sale.updateFeatures(0);
		await assertThrowsAsync(fn);
		await sale.updateFeatures(FEATURE_SALE_ENABLED);

		// revoke ROLE_TOKEN_CREATOR from silver, ensure fn fails and grant back
		await silver.updateRole(sale.address, 0);
		await assertThrowsAsync(fn);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// revoke ROLE_TOKEN_CREATOR from gold, ensure fn fails and grant back
		await gold.updateRole(sale.address, 0);
		await assertThrowsAsync(fn);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// all the permissions are granted, features enabled: execute the fn
		await fn();

		// verify there is some silver and gold minted
		assert((await silver.balanceOf(player)).gte(120 * 32), "zero silver player balance");
		assert((await gold.balanceOf(player)).gt(0), "zero gold player balance");

		// verify player and beneficiary balances has changed
		assert(playerBalance.gt(web3.eth.getBalance(player)), "player balance didn't decrease");
		assert(beneficiaryBalance.lt(web3.eth.getBalance(beneficiary)), "beneficiary balance didn't increase");
	});
});

/**
 * Used to verify analogous smart contract function
 *
 * Calculates value `v` at the given point in time `t`,
 *      given that the initial value at the moment 't0' is `v0`
 *      and the final value at the moment `t1` is `v1`
 * The value is changed stepwise linearly in time,
 *      step size is defined by `_dt` (seconds)
 * @param t0 defines initial moment (unix timestamp)
 * @param v0 defines initial value
 * @param t1 defines final moment (unix timestamp)
 * @param v1 defines final value
 * @param dt defines time step size (seconds)
 * @param t defines moment of interest (unix timestamp)
 * @return value in the moment of interest `t`
 */
function linearStepwise(t0, v0, t1, v1, dt, t) {
	// convert all the inputs to BigNumber if necessary
	for(let i = 0; i < arguments.length; i++) {
		if(!arguments[i].dividedToIntegerBy || !arguments[i].times || !arguments[i].plus || !arguments[i].minus) {
			arguments[i] = web3.toBigNumber(arguments[i]);
		}
	}

	/*
	 * perform the calculation according to formula
	 *                       t - t0
	 *                    dt ______
	 *                         dt
	 * v = v0 + (v1 - v0) ___________
	 *                      t1 - t0
	 *
	 */
	return v0.plus(v1.minus(v0).times(t.minus(t0).dividedToIntegerBy(dt).times(dt)).dividedToIntegerBy(t1.minus(t0)));
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
