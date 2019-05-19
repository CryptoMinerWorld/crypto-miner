// World Plot Sale dependencies
const Tracker = artifacts.require("./RefPointsTracker.sol");
const Country = artifacts.require("./CountryERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");
// World Plot Sale itself
const Sale = artifacts.require("./PlotSale.sol");

// World Plot Sale dependencies
import {COUNTRY_DATA} from "../data/country_data";

// one token price
const SALE_PRICE = 20000000000000000;

// PlotSale gas usage related tests
contract('PlotSale: Gas Usage', (accounts) => {
	it("gas: deploying a SC requires 2,532,620 gas", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		const txHash = s.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(2532620, gasUsed, "deploying SC gas usage mismatch: " + gasUsed);
	});

	it("gas: buying one plot requires 360,847 gas", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(0x00000001); // sale enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// buy one plot in Russia - no country owner
		const gasUsed = (await s.buy(1, 1, 0, {from: p, value: SALE_PRICE})).receipt.gasUsed;

		assertEqual(360847, gasUsed, "buying one plot gas usage mismatch: " + gasUsed);
	});
	it("gas: buying ten plots requires 1,812,575 gas", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(0x00000001); // sale enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// buy one plot in Russia - no country owner
		const gasUsed = (await s.buy(1, 10, 0, {from: p, value: 10 * SALE_PRICE})).receipt.gasUsed;

		assertEqual(1812575, gasUsed, "buying ten plots gas usage mismatch: " + gasUsed);
	});
	it("gas: buying 25 plots requires 4,289,335 gas", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(0x00000001); // sale enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// buy one plot in Russia - no country owner
		const gasUsed = (await s.buy(1, 25, 0, {from: p, value: 25 * SALE_PRICE})).receipt.gasUsed;

		assertEqual(4289335, gasUsed, "buying 25 plots gas usage mismatch: " + gasUsed);
	});
	it("gas: buying 45 plots requires 7,570,425 gas", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(0x00000001); // sale enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// buy one plot in Russia - no country owner
		const gasUsed = (await s.buy(1, 45, 0, {from: p, value: 45 * SALE_PRICE})).receipt.gasUsed;

		assertEqual(7570425, gasUsed, "buying 45 plots gas usage mismatch: " + gasUsed);
	});

	it("gas: buying one plot from owned country requires 390,146 gas", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const o = accounts[12]; // country owner account
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// give Russia to some account
		await c.mint(o, 1);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(0x00000001); // sale enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// buy one plot in Russia - owned country
		const gasUsed = (await s.buy(1, 1, 0, {from: p, value: SALE_PRICE})).receipt.gasUsed;

		assertEqual(390146, gasUsed, "buying one plot from owned country gas usage mismatch: " + gasUsed);
	});
	it("gas: buying ten plots from owned country requires 1,842,624 gas", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const o = accounts[12]; // country owner account
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// give Russia to some account
		await c.mint(o, 1);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(0x00000001); // sale enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// buy one plot in Russia - owned country
		const gasUsed = (await s.buy(1, 10, 0, {from: p, value: 10 * SALE_PRICE})).receipt.gasUsed;

		assertEqual(1842624, gasUsed, "buying ten plots from owned country gas usage mismatch: " + gasUsed);
	});
	it("gas: buying 25 plots from owned country requires 4,319,904 gas", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const o = accounts[12]; // country owner account
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// give Russia to some account
		await c.mint(o, 1);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(0x00000001); // sale enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// buy one plot in Russia - owned country
		const gasUsed = (await s.buy(1, 25, 0, {from: p, value: 25 * SALE_PRICE})).receipt.gasUsed;

		assertEqual(4319904, gasUsed, "buying 25 plots from owned country gas usage mismatch: " + gasUsed);
	});
	it("gas: buying 45 plots from owned country requires 7,601,604 gas", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const o = accounts[12]; // country owner account
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// give Russia to some account
		await c.mint(o, 1);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(0x00000001); // sale enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// buy one plot in Russia - owned country
		const gasUsed = (await s.buy(1, 45, 0, {from: p, value: 45 * SALE_PRICE})).receipt.gasUsed;

		assertEqual(7601604, gasUsed, "buying 45 plots from owned country gas usage mismatch: " + gasUsed);
	});
});

// check if 2 values are equal with a 5% precision
function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, 0.05, actual, msg);
}

// check if 2 values are equal with the 'leeway' precision
function assertEqualWith(expected, leeway, actual, msg) {
	assert(expected * (1 - leeway) < actual && expected * (1 + leeway) > actual, msg);
}

