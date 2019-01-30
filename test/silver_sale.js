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
		const beneficiary = accounts[1];
		const offset = new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, beneficiary, offset);

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
		const beneficiary = accounts[1];
		const offset = new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(silver.address, gold.address, beneficiary, offset);

		// define constant function arguments
		const t0 = 1548979200; // February 1, 2019
		const t1 = 1550707200; // February 21, 2019
		const v0 = 96000000000000000;
		const v1 = 120000000000000000;
		const dt = 86400; // 24 hours

		// time point of interest will be changed in cycle
		let t = t0;

		// verify the linear stepwise function (pure)
		for(let i = 0; i < 20; i++) {
			// verify the formula
			assert.equal(
				linearStepwise(t0, v0, t1, v1, dt, t).toNumber(),
				await sale.linearStepwise(t0, v0, t1, v1, dt, t),
				"wrong remote v at index " + i + ", t = " + t
			);
			// update time of interest `t`
			t += Math.round(dt * Math.random());
		}
	});
	it("price: verify current price calculation", async() => {
		// define silver sale dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const beneficiary = accounts[1];
		const offset1 = 3600 + new Date().getTime() / 1000 | 0;
		const offset2 = -3600 + new Date().getTime() / 1000 | 0;
		const offset3 = -86400 + new Date().getTime() / 1000 | 0;
		const offset4 = -1728000 + new Date().getTime() / 1000 | 0;

		// instantiate few silver sales
		const sale1 = await Sale.new(silver.address, gold.address, beneficiary, offset1);
		const sale2 = await Sale.new(silver.address, gold.address, beneficiary, offset2);
		const sale3 = await Sale.new(silver.address, gold.address, beneficiary, offset3);
		const sale4 = await Sale.new(silver.address, gold.address, beneficiary, offset4);

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
