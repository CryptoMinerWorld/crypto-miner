// Plot Antarctica dependencies
const FoundersPlotsMock = artifacts.require("./FoundersPlotsMock.sol");
const Plot = artifacts.require("./PlotERC721.sol");
// Plot Antarctica itself
const Antarctica = artifacts.require("./PlotAntarctica.sol");

// import ERC721Core dependencies
import {ROLE_TOKEN_CREATOR,} from "./erc721_core";

// features and roles to be used
const FEATURE_GET_ENABLED = 0x00000001;

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
		assert.equal(2, tiers.shrn(56).maskn(8), "wrong number of tiers");
		assert.equal(0, tiers.shrn(48).maskn(8), "wrong tier1 offset");
		assert.equal(0, tiers.maskn(8), "wrong initial offset");
	});

	it("get: features and roles required to get plots", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721
		// player's account
		const p = accounts[1];

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);

		// define a function to test
		const fn = async() => await s.get(1, {from: p});

		// verify features and roles required
		await assertThrows(fn);
		await s.updateFeatures(FEATURE_GET_ENABLED);
		await assertThrows(fn);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		await s.updateFeatures(0);
		await assertThrows(fn);
		await s.updateFeatures(FEATURE_GET_ENABLED);
		await assertThrows(s.get, 0, {from: p}); // impossible to get zero plots
		await fn();

		// verify player's balance
		assert.equal(1, await t.balanceOf(p), "wrong player's balance after exchange (t)");
		assert.equal(14, await s.balanceOf(p), "wrong player's balance after exchange (s)");
	});
	it("get: verify balanceOf decreases when getting plots", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721
		// player's account
		const p = accounts[1];

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);
		// grant features and roles required
		await s.updateFeatures(FEATURE_GET_ENABLED);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);

		// verify initial balance
		assert.equal(0, await t.balanceOf(p), "wrong initial player balance (t)");
		assert.equal(15, await s.balanceOf(p), "wrong initial player balance (s)");

		// a function to test
		const fn = async(k) => await s.get(k, {from: p});

		// get the plots and verify the balance
		let plotsLeft = 15;
		while(plotsLeft > 0) {
			const k = Math.min(Math.floor(Math.random() * 15), plotsLeft);
			plotsLeft -= k;

			if(k === 0) {
				await assertThrows(fn, k);
			}
			else {
				await s.get(k, {from: p});
			}
			assert.equal(15 - plotsLeft, await t.balanceOf(p), "wrong player balance (t)");
			assert.equal(plotsLeft, await s.balanceOf(p), "wrong player balance (s)");
		}

		// verify final balance
		assert.equal(15, await t.balanceOf(p), "wrong final player balance (t)");
		assert.equal(0, await s.balanceOf(p), "wrong final player balance (s)");
	});
	it("get: its impossible to get more than geode balance allows", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721
		// players' accounts
		const p1 = accounts[1];
		const p2 = accounts[2];
		const p3 = accounts[3];

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);
		// grant features and roles required
		await s.updateFeatures(FEATURE_GET_ENABLED);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);

		// impossible to get more at once
		await assertThrows(s.get, 16, {from: p1});

		// define functions to buy incrementally
		const fn1 = async() => await s.get(15, {from: p1});
		const fn2 = async() => await s.get(3, {from: p2});
		const fn3 = async() => await s.get(4, {from: p3});

		// perform the test
		await fn1();
		await fn2();
		await fn3();
		await assertThrows(fn1);
		await fn2();
		await fn3();
		await fn2();
		await fn3();
		await fn2();
		await assertThrows(fn3);
		await fn2();
		await assertThrows(fn2);

		// verify final balances
		assert.equal(15, await t.balanceOf(p1), "wrong final player 1 balance (t)");
		assert.equal(0, await s.balanceOf(p1), "wrong final player 1 balance (s)");
		assert.equal(15, await t.balanceOf(p2), "wrong final player 2 balance (t)");
		assert.equal(0, await s.balanceOf(p2), "wrong final player 2 balance (s)");
		assert.equal(12, await t.balanceOf(p3), "wrong final player 3 balance (t)");
		assert.equal(3, await s.balanceOf(p3), "wrong final player 3 balance (s)");
	});
	it("get: verify minted plot integrity", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721
		// player's account
		const p = accounts[1];

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);
		// grant features and roles required
		await s.updateFeatures(FEATURE_GET_ENABLED);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);

		// get a plot
		await s.get(1, {from: p});

		// verify the plot
		assert(await t.exists(1), "plot 1 doesn't exist after getting it");
		assert.equal(p, await t.ownerOf(1), "plot 1 has wrong owner");

		// verify tiers structure
		const tiers = await t.getTiers(1);
		assert.equal(2, tiers.shrn(56).maskn(8), "wrong number of tiers");
		assert.equal(0, tiers.shrn(48).maskn(8), "wrong tier1 offset");
		assert.equal(0, tiers.maskn(8), "wrong initial offset");
	});
});

// import auxiliary function to ensure function `fn` throws
import {assertThrows} from "../scripts/shared_functions";
