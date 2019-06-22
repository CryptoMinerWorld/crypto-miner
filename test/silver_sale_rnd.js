/**
 * Test depth defines how many random values will be generated
 * and analyzed to verify grade value random properties
 * Number of randoms to be generated is equal to 10^TEST_DEPTH
 */
const TEST_DEPTH = 3;

// Silver smart contract
const Silver = artifacts.require("./SilverERC20.sol");
// GoldERC20 smart contract
const Gold = artifacts.require("./GoldERC20.sol");
// Referral points tracker smart contract
const Tracker = artifacts.require("./RefPointsTracker.sol");
// Silver Box Sale smart contract
const Sale = artifacts.require("./SilverSale.sol");

// Enables the silver / gold sale
const FEATURE_SALE_ENABLED = 0x00000001;
// Token creator is responsible for creating tokens
const ROLE_TOKEN_CREATOR = 0x00000001;
// box types
const BOX_TYPES = ["Silver Box", "Rotund Silver Box", "Goldish Silver Box"];

// Minimum and maximum amounts of silver in the boxes
const SILVER_MIN = [20, 70, 150, 100];
const SILVER_MAX = [30, 90, 200, 120];
const SILVER_AVG = SILVER_MIN.map((e, i) => (e + SILVER_MAX[i]) / 2);

// Chances of getting one piece of gold in Goldish Silver Box, percent
const GOLD_PROBABILITY = 42; // 42%

/**
 * Test verifies random characteristics (min, max, avg, median)
 * in different types of silver box distributions
 */
contract('SilverSale (RND)', (accounts) => {
	it("random: Silver Box and Rotund Silver Box averages", async() => {
		// define silver sale dependencies
		const ref = await Tracker.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(ref.address, silver.address, gold.address, chest, beneficiary, offset);

		// enable all features and permissions required to enable buy
		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// number of random values to generate
		const n = Math.pow(10, TEST_DEPTH);

		// iterate over box types
		for(let i = 0; i < BOX_TYPES.length - 1; i++) {
			// unbox some considerable amount of Silver Boxes
			const unboxResult = await sale.unbox(i, n);

			// determine silver average and gold pieces
			const silverPieces = unboxResult[0].toNumber();
			const goldPieces = unboxResult[1].toNumber();

			// expected silver average
			const expectedSilver = n * SILVER_AVG[i];

			// verify the results
			assert(
				expectedSilver * 0.9 < silverPieces && silverPieces < expectedSilver * 1.1,
				"silver avg not in expected bounds for " + BOX_TYPES[i]
			);
			assert.equal(0, goldPieces, "non-zero gold pieces for " + BOX_TYPES[i]);
		}
	});
	it("random: Goldish Silver Box averages", async() => {
		// define silver sale dependencies
		const ref = await Tracker.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;

		// instantiate silver sale smart contract
		const sale = await Sale.new(ref.address, silver.address, gold.address, chest, beneficiary, offset);

		// enable all features and permissions required to enable buy
		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);

		// number of random values to generate
		const n = Math.pow(10, TEST_DEPTH);

		// box type to verify random for - Goldish Silver Box
		const boxType = BOX_TYPES.length - 1;

		// unbox some considerable amount of Silver Boxes
		const unboxResult = await sale.unbox(boxType, n);

		// determine silver average and gold pieces
		const silverPieces = unboxResult[0].toNumber();
		const goldPieces = unboxResult[1].toNumber();

		// expected number of gold pieces
		const expectedGold = GOLD_PROBABILITY / 100 * n;

		// calculate expected number of silver pieces
		const expectedSilver = goldPieces * SILVER_AVG[boxType + 1] + (n - goldPieces) * SILVER_AVG[boxType];

		// verify the results
		assert(
			expectedSilver * 0.9 < silverPieces && silverPieces < expectedSilver * 1.1,
			"silver pieces not in expected bounds for " + BOX_TYPES[boxType]
		);
		assert(
			// 0.6% chance of getting out of the bounds
			expectedGold * 0.9 < goldPieces && goldPieces < expectedGold * 1.1,
			"gold pieces not in expected bounds for " + BOX_TYPES[boxType]
		);
	});
});

