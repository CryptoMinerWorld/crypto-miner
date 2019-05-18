// Plot Antarctica dependencies
const FoundersPlotsMock = artifacts.require("./FoundersPlotsMock.sol");
const Plot = artifacts.require("./PlotERC721.sol");
// Plot Antarctica itself
const Antarctica = artifacts.require("./PlotAntarctica.sol");


// one token price
const SALE_PRICE = 20000000000000000;

// import country data
import {COUNTRY_DATA} from "../data/country_data";

// PlotSale related tests
contract('PlotAntarctica', (accounts) => {
	it("deployment: verify deployment routine", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721

		// verify wrong constructor parameters fail
		await assertThrowsAsync(Antarctica.new, 0, t.address);
		await assertThrowsAsync(Antarctica.new, m.address, 0);
		await assertThrowsAsync(Antarctica.new, accounts[0], t.address);
		await assertThrowsAsync(Antarctica.new, m.address, accounts[0]);

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);

		// verify the setup
		assert.equal(m.address, await s.foundersPlots(), "wrong founders plots instance address");
		assert.equal(t.address, await s.plotInstance(), "wrong plot instance address");
	});

	it("integrity: tiers2 generation randomized function constraints", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);

		// auxiliary variable 2 as BigNumber
		const two = web3.toBigNumber(2);

		// generate randomized tier structure
		const tiers = await s.random2Tiers(0);
		assert.equal(2, tiers.dividedToIntegerBy(two.pow(56)).modulo(256), "wrong number of tiers");
		assert.equal(0, tiers.dividedToIntegerBy(two.pow(48)).modulo(256), "wrong tier1 offset");
		assert.equal(0, tiers.modulo(256), "wrong initial offset");
	});



});

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
