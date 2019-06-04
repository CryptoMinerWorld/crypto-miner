// Workshop smart contract dependencies
const Gem = artifacts.require("./GemERC721.sol");
const Silver = artifacts.require("./SilverERC20.sol");
const Gold = artifacts.require("./GoldERC20.sol");

// Workshop smart contract itself
const Workshop = artifacts.require("./Workshop.sol");

/**
 * Test depth defines how many random values will be generated
 * and analyzed to verify grade value random properties
 * Number of randoms to be generated is equal to 2^TEST_DEPTH
 * Recommended value for coverage: 8
 * Recommended value for tests: 13
 */
const TEST_DEPTH = 10;

// A test to check properties of the generated grade values random
contract('Workshop (RND)', (accounts) => {
	it("random: generate a set of iterations for grade values", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct workshop itself
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		// number of random values to generate
		const n = Math.pow(2, TEST_DEPTH);

		// maximum possible grade value
		const maxGrade = (await workshop.GRADE_VALUES()).toNumber();

		// call a function to generate n iterations n = [1, 6]
		// `i` is set to 1 speed up test for coverage
		for(let i = 1; i <= 6; i++) {
			await generateN(workshop, n, i, maxGrade);
		}
	});
});

async function generateN(rndTest, n, i, maxGrade) {
	assert(i > 0, "incorrect n!");

	// generate some amount of random grade values
	const gradeValues = await rndTest.randomGradeValues(n, i);

	// sort the array
	gradeValues.sort((a, b) => a.sub(b).toNumber());

	// write statistical raw data into the file
	write_csv(
		"./data/quadratic_random_" + TEST_DEPTH + "_" + i + ".csv",
		"grade value",
		gradeValues.map((a) => a.toNumber()).join("\n")
	);

	// calculate the minimum
	const min = gradeValues[0].toNumber();

	// calculate the maximum
	const max = gradeValues[gradeValues.length - 1].toNumber();

	// calculate an average
	const avg = gradeValues.reduce((a, b) => a.add(b), toBN(0)).divRound(toBN(gradeValues.length)).toNumber();

	// calculate the median
	const median = gradeValues[Math.floor(gradeValues.length / 2)].toNumber();

	// print the values into the console
	console.log("\t%o iteration(s)\n\t\tmin: %o\n\t\tmax: %o\n\t\tavg: %o\n\t\tmed: %o", i, min, max, avg, median);

	if(i === 1) {
		// verify the distribution properties are correct
		assertEqualWith(0, min, 1000, "wrong minimum");
		assertEqualWith(maxGrade, max, 100000, "wrong maximum");
		assertEqualWith(maxGrade / 4, avg, 25000, "wrong average");
	}

	// verify random didn't exceed the bounds
	assert(min >= 0, "minimum less than zero!");
	assert(max < maxGrade, "maximum exceeded GRADE_VALUES!");
}


// asserts equal with the precisions defined in leeway (absolute value)
function assertEqualWith(expected, actual, leeway, msg) {
	assert(expected - leeway < actual && expected + leeway > actual, msg);
}

// import auxiliary function to ensure function `fn` throws
import {write_csv, toBN} from "../scripts/shared_functions";
