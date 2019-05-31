// Plot Antarctica dependencies
const FoundersPlotsMock = artifacts.require("./FoundersPlotsMock.sol");
const Plot = artifacts.require("./PlotERC721.sol");
// Plot Antarctica itself
const Antarctica = artifacts.require("./PlotAntarctica.sol");

// PlotAntarctica related tests
contract('PlotAntarctica', (accounts) => {
	it("deployment: verify deployment routine", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721

		// verify wrong constructor parameters fail
		await assertThrows(Antarctica.new, 0, t.address);
		await assertThrows(Antarctica.new, m.address, 0);
		await assertThrows(Antarctica.new, accounts[0], t.address);
		await assertThrows(Antarctica.new, m.address, accounts[0]);

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

		// generate randomized tier structure
		const tiers = await s.random2Tiers(0);
		assert.equal(2, tiers.shrn(56).mod(toBN(256)), "wrong number of tiers");
		assert.equal(0, tiers.shrn(48).mod(toBN(256)), "wrong tier1 offset");
		assert.equal(0, tiers.mod(toBN(256)), "wrong initial offset");
	});

});

// import auxiliary function to ensure function `fn` throws
import {assertThrows, toBN} from "../scripts/shared_functions";
