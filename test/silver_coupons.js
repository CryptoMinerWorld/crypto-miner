// Silver smart contract
const Silver = artifacts.require("./SilverERC20.sol");
// GoldERC20 smart contract
const Gold = artifacts.require("./GoldERC20.sol");
// Referral points tracker smart contract
const Tracker = artifacts.require("./RefPointsTracker.sol");
// Silver Box Sale smart contract
const Sale = artifacts.require("./SilverSale.sol");

// Silver Box Coupons smart contract
const Coupons = artifacts.require("./SilverCoupons.sol");

// box types
const BOX_TYPES = ["Silver Box", "Rotund Silver Box", "Goldish Silver Box"];
// amount of coupons for each type to create
const BOX_AMOUNTS = [30, 20, 10];
// Minimum amounts of silver each box type can have
const SILVER_MIN = [20, 70, 150, 100];

// Token creator is responsible for creating tokens
const ROLE_TOKEN_CREATOR = 0x00000001;
// Allows setting an address as known
const ROLE_SELLER = 0x00000004;
// Enables using coupons i.e. exchanging them for boxes
const FEATURE_USING_COUPONS_ENABLED = 0x00000001;
// Coupon creator is responsible for adding and removing coupons
const ROLE_COUPON_MANAGER = 0x00000001;

// using secure random generator instead of default Math.random()
const secureRandomInRange = require("random-number-csprng");

/**
 * Test verifies silver coupons flows: adding, removing and using coupons
 */
contract('SilverCoupons', (accounts) => {
	it("coupons: issuing and removing coupons", async() => {
		// create silver coupons dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		// create silver coupons instacne
		const coupons = await Coupons.new(silver.address, gold.address, ref.address, sale.address);

		// coupon manager
		const manager = accounts[5];

		// generate random coupon code for Silver Box
		const boxType = 0;
		const code = await generateCouponCode(boxType);
		const key = web3.sha3(code);

		// define functions to add and remove coupons
		const fn1 = async() => await coupons.addCoupon(key, boxType, {from: manager});
		const fn2 = async() => await coupons.removeCoupon(key, {from: manager});

		// first verify the permissions
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);
		await coupons.updateRole(manager, ROLE_COUPON_MANAGER);

		// add this code into the coupons
		await fn1();
		// ensure coupon was added and is valid
		assert.equal(boxType, await coupons.isCouponValid(code), "invalid coupon");

		// ensure some random coupon is not valid
		assert.equal(0xFF, await coupons.isCouponValid(""), "arbitrary string produced valid coupon");

		// verify removing coupon permissions
		await coupons.updateRole(manager, 0);
		await assertThrowsAsync(fn2);
		await coupons.updateRole(manager, ROLE_COUPON_MANAGER);

		// remove the coupon
		await fn2();
		// ensure removed coupon is not valid anymore
		assert.equal(0xFF, await coupons.isCouponValid(code), "coupon is still valid after removing it");
	});

	it("coupons: using coupons", async() => {
		// create silver coupons dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		// create silver coupons instacne
		const coupons = await Coupons.new(silver.address, gold.address, ref.address, sale.address);

		// coupon manager
		const manager = accounts[5];
		// player
		const player = accounts[1];

		// enable required features and give the coupons all the required permissions
		await coupons.updateFeatures(FEATURE_USING_COUPONS_ENABLED);
		await coupons.updateRole(manager, ROLE_COUPON_MANAGER);
		await silver.updateRole(coupons.address, ROLE_TOKEN_CREATOR);
		// await gold.updateRole(coupons.address, ROLE_TOKEN_CREATOR); // gold is not required for silver box coupon
		await ref.updateRole(coupons.address, ROLE_SELLER);

		// generate random coupon code for Silver Box
		const boxType = 0;
		const code = await generateCouponCode(boxType);
		const key = web3.sha3(code);
		// issue the coupon
		await coupons.addCoupon(key, boxType, {from: manager});

		// define a function to use the coupon
		const fn = async() => await coupons.useCoupon(code, {from: player});

		// ensure all the permissions and features are required to use a coupon
		await coupons.updateFeatures(0);
		await assertThrowsAsync(fn);
		await coupons.updateFeatures(FEATURE_USING_COUPONS_ENABLED);
		await silver.updateRole(coupons.address, 0);
		await assertThrowsAsync(fn);
		await silver.updateRole(coupons.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(coupons.address, 0);
		await assertThrowsAsync(fn);
		await ref.updateRole(coupons.address, ROLE_SELLER);

		// now use the coupon
		await fn();
		// cannot double spend the coupon
		await assertThrowsAsync(fn);

		// verify silver appeared on the player balance
		assert((await silver.balanceOf(player)).gte(SILVER_MIN[0]), "silver balance is too low after using the coupon");
	});
	it("coupons: using 30/20/10 coupons", async() => {
		// create silver coupons dependencies
		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		// create silver coupons instacne
		const coupons = await Coupons.new(silver.address, gold.address, ref.address, sale.address);

		// coupon manager
		const manager = accounts[5];
		// player
		const player = accounts[1];

		// enable required features and give the coupons all the required permissions
		await coupons.updateFeatures(FEATURE_USING_COUPONS_ENABLED);
		await coupons.updateRole(manager, ROLE_COUPON_MANAGER);
		await silver.updateRole(coupons.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(coupons.address, ROLE_TOKEN_CREATOR); // gold is not required for silver box coupon
		await ref.updateRole(coupons.address, ROLE_SELLER);

		// generate random coupon codes for all the box types
		const couponCodes = [];
		const couponKeys = [];
		for(let boxType = 0; boxType < BOX_AMOUNTS.length; boxType++) {
			for(let i = 0; i < BOX_AMOUNTS[boxType]; i++) {
				const code = await generateCouponCode(boxType);
				const key = web3.sha3(code);
				couponCodes.push(code);
				couponKeys.push(key);
			}
			// issue the coupons (bulk mode)
			await coupons.bulkAddCoupons(couponKeys, boxType, {from: manager});
		}

		// use the all coupons one by one
		for(let i = 0; i < couponCodes.length; i++) {
			await coupons.useCoupon(couponCodes[i], {from: player});
		}

		// minimum silver expected
		const silverMin = SILVER_MIN[0] * BOX_AMOUNTS[0] + SILVER_MIN[1] * BOX_AMOUNTS[1] + SILVER_MIN[3] * BOX_AMOUNTS[2];

		// verify silver and gold appeared on the player balance
		assert((await silver.balanceOf(player)).gte(silverMin), "silver balance is too low after using 30/20/10 coupons");
		assert((await gold.balanceOf(player)).gt(0), "gold balance is zero after using 30/20/10 coupons");
	});
});

// generate a secure random coupon code for box type `boxType`
async function generateCouponCode(boxType) {
	let couponCode = "";
	for(let j = 0; j < 16; j++) {
		couponCode += String.fromCharCode(await secureRandomInRange(65, 90));
	}
	couponCode += "_" + BOX_TYPES[boxType].replace(/\s/, "_");
	return couponCode;
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
