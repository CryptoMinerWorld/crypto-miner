/**
 * Test depth defines how many random values will be generated
 * and analyzed to verify grade value random properties
 * Number of randoms to be generated is equal to 2^TEST_DEPTH
 */
const TEST_DEPTH = 10;

// GemERC721 smart contract
const Gem = artifacts.require("./GemERC721.sol");
// Silver smart contract
const Silver = artifacts.require("./SilverERC20.sol");
// GoldERC20 smart contract
const Gold = artifacts.require("./GoldERC20.sol");
// Workshop smart contract
const Workshop = artifacts.require("./Workshop.sol");

// Random Test smart contract helper
const RandomTest = artifacts.require("./RandomTest.sol");

// using file system to create raw csv data file for quadratic random
const fs = require('fs');

// A test to check properties of the generated grade values random
contract('Workshop (RND)', (accounts) => {
	it("random: ensure RandomTest and Workshop maximum grade value matches", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct workshop itself
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		// construct random test helper smart contract
		const rndTest = await RandomTest.new();

		// verify GRADE_VALUES constant is the same in both smart contracts
		assert((await rndTest.GRADE_VALUES()).eq(await workshop.GRADE_VALUES()), "GRADE_VALUES mismatch");
	});
	it("random: verify properties required", async() => {
		// construct random test helper smart contract
		const rndTest = await RandomTest.new();

		// number of random values to generate
		const n = Math.pow(2, TEST_DEPTH);

		// maximum possible grade value
		const maxGrade = (await rndTest.GRADE_VALUES()).toNumber();

		// generate some amount of random grade values
		const gradeValues = await rndTest.randomGradeValues(n);

		// sort the array
		gradeValues.sort((a, b) => a.minus(b).toNumber());

		// write statistical raw data into the file
		fs.writeFileSync("./quadratic_random_" + TEST_DEPTH + ".csv", gradeValues.map((a) => a.toNumber()).join("\n"));

		// calculate the minimum
		const min = gradeValues[0].toNumber();

		// calculate the maximum
		const max = gradeValues[gradeValues.length - 1].toNumber();

		// calculate an average
		const avg = gradeValues.reduce((a, b) => a.plus(b), web3.toBigNumber(0)).dividedToIntegerBy(gradeValues.length).toNumber();

		// calculate the median
		const median = gradeValues[Math.floor(gradeValues.length / 2)].toNumber();

		// print the values into the console
		console.log("\tmin: %o\n\tmax: %o\n\tavg: %o\n\tmed: %o", min, max, avg, median);

		// verify the distribution properties are correct
		assertEqualWith(0, min, 1000, "wrong minimum");
		assertEqualWith(maxGrade, max, 50000, "wrong maximum");
		assertEqualWith(maxGrade / 4, avg, 25000, "wrong average");

		// verify random didn't exceed the bounds
		assert(min >= 0, "minimum less than zero!");
		assert(max < 1000000, "maximum exceeded 1000000!");
	});
});


// asserts equal with the precisions defined in leeway (absolute value)
function assertEqualWith(expected, actual, leeway, msg) {
	assert(expected - leeway < actual && expected + leeway > actual, msg);
}
