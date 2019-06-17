// Gem Extension smart contract
const Ext = artifacts.require("./GemExtension.sol");

// roles defined for Gem Extension

// Next ID Inc is responsible for incrementing `nextId`,
const ROLE_NEXT_ID_INC = 0x00000001;
// Extension writer is responsible for writing into ext256,
const ROLE_EXT_WRITER = 0x00000002;
// Color provider may change the `availableColors` array
const ROLE_COLOR_PROVIDER = 0x00000004;

// tests verify gem extension functions
contract('GemExtension', function(accounts) {
	it("initial state: verify initial state of the getters", async() => {
		// deploy Gem Extension
		const ext = await Ext.new();

		// verify initial state of the getters
		assert.equal(0x12500, await ext.nextId(), "wrong initial value of nextId");
		assertArraysEqual([1, 2, 5, 6, 7, 9, 10], await ext.getAvailableColors(), "incorrect initial value for available colors array");
		assert.equal(0, await ext.read(1, 0, 8), "wrong initial read for 1/0/8");
		assert.equal(0, await ext.read(1, 0, 256), "wrong initial read for 1/0/256");
	});

	it("security: incrementId requires ROLE_NEXT_ID_PROVIDER permission", async() => {
		// deploy Gem Extension
		const ext = await Ext.new();

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await ext.incrementId({from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await ext.updateRole(operator, ROLE_NEXT_ID_INC);
		// fn succeeds
		await fn();

		// next Id counter incremented by one
		assert.equal(0x12501, await ext.nextId(), "wrong nextId counter value");
	});
	it("security: write requires ROLE_EXT_WRITER permission", async() => {
		// deploy Gem Extension
		const ext = await Ext.new();

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await ext.write(1, 17, 0, 8, {from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await ext.updateRole(operator, ROLE_EXT_WRITER);
		// fn succeeds
		await fn();

		// verify read returns 17
		assert.equal(17, await ext.read(1, 0, 8), "wrong value read");
	});
	it("security: setAvailableColors requires ROLE_COLOR_PROVIDER permission", async() => {
		// deploy Gem Extension
		const ext = await Ext.new();

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await ext.setAvailableColors([1, 2, 3], {from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await ext.updateRole(operator, ROLE_COLOR_PROVIDER);
		// fn succeeds
		await fn();

		// available colors array updated
		assertArraysEqual([1, 2, 3], await ext.getAvailableColors(), "incorrect value for available colors array");
	});

	it("read/write: verify integrity of read/write operation", async() => {
		// deploy Gem Extension
		const ext = await Ext.new();

		// operate on the first bit
		assert.equal(0, await ext.read(1, 0, 1), "wrong read 0, 0/1");
		await ext.write(1, 1, 0, 1);
		assert.equal(1, await ext.read(1, 0, 1), "wrong read 1, 0/1");

		// operate on the first byte
		assert.equal(1, await ext.read(1, 0, 8), "wrong read 0, 0/8");
		await ext.write(1, 17, 0, 8); // 0x11
		assert.equal(17, await ext.read(1, 0, 8), "wrong read 1, 0/8");

		// operate on the n-th byte
		assert.equal(0, await ext.read(1, 16, 8), "wrong read 0, 16/8");
		await ext.write(1, 117, 16, 8); // 0x750000
		assert.equal(117, await ext.read(1, 16, 8), "wrong read 1, 16/8");

		// operate on n-th bits
		assert.equal(0, await ext.read(1, 7, 5), "wrong read 0, 7/5");
		await ext.write(1, 112, 7, 5); // 112 will be truncated to 5 bits which is 16
		assert.equal(16, await ext.read(1, 7, 5), "wrong read 1, 7/5");
		assert.equal(16, await ext.read(1, 7, 8), "wrong read 2, 7/8");
		await ext.write(1, 112, 7, 8); // 0x3800
		assert.equal(16, await ext.read(1, 7, 5), "wrong read 3, 171/5");
		assert.equal(112, await ext.read(1, 7, 8), "wrong read 4, 171/8");

		// erase some bits
		assert.equal(0, await ext.read(1, 24, 32), "wrong read 0, 32/32");
		await ext.write(1, 65537, 24, 32); // write 0x00010001000000
		await ext.write(1, 0, 40, 16); // erase high 16 bits of the written data - 0x00010000
		assert.equal(1, await ext.read(1, 24, 32), "wrong read 1, 32/32");

		// verify whole number
		assert.equal(0x1753811, await ext.read(1, 0, 256), "wrong whole read");

		// perform few random read/write operations
		for(let i = 0; i < 32; i++) {
			const value = Math.floor(Math.random() * 256);
			const offset = Math.floor(Math.random() * 248);
			const length = Math.ceil(Math.random() * 8);
			await ext.write(1, value, offset, length);
			assert.equal(
				value & ((1 << length) - 1),
				await ext.read(1, offset, length),
				`wrong read ${i}, ${value}/${offset}/${length}`
			);
		}
		console.log(`\t0x${(await ext.read(1, 0, 0)).toString(16)}`);

		// erase everything
		await ext.write(1, 0, 0, 256);
		assert.equal(0, await ext.read(1, 0, 0), "wrong read 1, 0/0 (after erase)");
	});

	it("colors: verify integrity of set/get available colors operation", async() => {
		// deploy Gem Extension
		const ext = await Ext.new();

		// ensure empty colors array cannot be set
		await assertThrows(ext.setAvailableColors, []);

		// set and get several colors randomly
		for(let i = 0; i < 10; i++) {
			const length = Math.ceil(Math.random() * 12);
			const colors = new Array(length);
			for(let j = 0; j < length; j++) {
				colors[j] = Math.ceil(Math.random() * 12);
			}
			// set the available colors
			await ext.setAvailableColors(colors);
			// verify available colors are set correctly
			assertArraysEqual(colors, await ext.getAvailableColors(), "incorrect available colors array " + i);
		}
	});
	it("colors: verify random color getter", async() => {
		// deploy Gem Extension
		const ext = await Ext.new();

		// we are using 6 different colors for the test
		await ext.setAvailableColors([1, 2, 3, 4, 5, 6]);

		// we use following array to capture statistics
		const colors = new Array(6).fill(0);

		// we run 600 rounds and expect each color to be present around 100 times
		for(let i = 0; i < 600; i++) {
			colors[await ext.randomColor(i) - 1]++;
		}

		// ensure we have reasonable amount of each color
		for(let i = 0; i < colors.length; i++) {
			// calculator: https://stattrek.com/online-calculator/binomial.aspx
			// formula: https://stattrek.com/probability-distributions/binomial.aspx
			// probability of not fitting in 25% bounds is 0.3%
			assert(75 < colors[i] && colors[i] < 125, `color ${i + 1} out of bounds: ${colors[i]} entries`);
		}
	});
});

// auxiliary function to check two arrays are equal
function assertArraysEqual(actual, expected, msg) {
	assert(actual.length === expected.length, `${msg}: arrays lengths are different`);
	for(let i = 0; i < actual.length; i++) {
		assert.equal(actual[i], expected[i], `${msg}: different elements and index ${i}`);
	}
}


// import auxiliary function to ensure function `fn` throws
import {assertThrows} from "../scripts/shared_functions";
