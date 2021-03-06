// World Plot Sale dependencies
const Tracker = artifacts.require("./RefPointsTracker.sol");
const Country = artifacts.require("./CountryERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");
// World Plot Sale itself
const Sale = artifacts.require("./PlotSale.sol");

// World Plot Sale dependencies
import {COUNTRY_DATA} from "../data_legacy/country_data";

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

		// confirm gas usage result
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

		// confirm gas usage result
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

		// buy 10 plots in Russia - no country owner
		const gasUsed = (await s.buy(1, 10, 0, {from: p, value: 10 * SALE_PRICE})).receipt.gasUsed;

		// confirm gas usage result
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

		// buy 25 plots in Russia - no country owner
		const gasUsed = (await s.buy(1, 25, 0, {from: p, value: 25 * SALE_PRICE})).receipt.gasUsed;

		// confirm gas usage result
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

		// buy 45 plots in Russia - no country owner
		const gasUsed = (await s.buy(1, 45, 0, {from: p, value: 45 * SALE_PRICE})).receipt.gasUsed;

		// confirm gas usage result
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

		// confirm gas usage result
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

		// buy 10 plots in Russia - owned country
		const gasUsed = (await s.buy(1, 10, 0, {from: p, value: 10 * SALE_PRICE})).receipt.gasUsed;

		// confirm gas usage result
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

		// buy 25 plots in Russia - owned country
		const gasUsed = (await s.buy(1, 25, 0, {from: p, value: 25 * SALE_PRICE})).receipt.gasUsed;

		// confirm gas usage result
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

		// buy 45 plots in Russia - owned country
		const gasUsed = (await s.buy(1, 45, 0, {from: p, value: 45 * SALE_PRICE})).receipt.gasUsed;

		// confirm gas usage result
		assertEqual(7601604, gasUsed, "buying 45 plots from owned country gas usage mismatch: " + gasUsed);
	});

	it("gas: getting one plot for ref points requires 289,541 gas", async() => {
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

		// give player enough referral points to get plots
		await r.issueTo(p, 0xFFFF); // 65,535 points should be enough

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable getting plots feature
		await s.updateFeatures(0x00000002); // get enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to consumer referral points
		await r.updateRole(s.address, 0x00000002); // ref points consumer

		// get one plot for referral points
		const gasUsed = (await s.get(1, {from: p})).receipt.gasUsed;

		// confirm gas usage result
		assertEqual(289541, gasUsed, "getting one plot for ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: getting ten plots for ref points requires 1,738,912 gas", async() => {
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

		// give player enough referral points to get plots
		await r.issueTo(p, 0xFFFF); // 65,535 points should be enough

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable getting plots feature
		await s.updateFeatures(0x00000002); // get enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to consumer referral points
		await r.updateRole(s.address, 0x00000002); // ref points consumer

		// get 10 plots for referral points
		const gasUsed = (await s.get(10, {from: p})).receipt.gasUsed;

		// confirm gas usage result
		assertEqual(1738912, gasUsed, "getting ten plots for ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: getting 25 plots for ref points requires 4,212,947 gas", async() => {
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

		// give player enough referral points to get plots
		await r.issueTo(p, 0xFFFF); // 65,535 points should be enough

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable getting plots feature
		await s.updateFeatures(0x00000002); // get enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to consumer referral points
		await r.updateRole(s.address, 0x00000002); // ref points consumer

		// get 25 plots for referral points
		const gasUsed = (await s.get(25, {from: p})).receipt.gasUsed;

		// confirm gas usage result
		assertEqual(4212947, gasUsed, "getting 25 plots for ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: getting 45 plots for ref points requires 7,491,597 gas", async() => {
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

		// give player enough referral points to get plots
		await r.issueTo(p, 0xFFFF); // 65,535 points should be enough

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable getting plots feature
		await s.updateFeatures(0x00000002); // get enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to consumer referral points
		await r.updateRole(s.address, 0x00000002); // ref points consumer

		// get 45 plots for referral points
		const gasUsed = (await s.get(45, {from: p})).receipt.gasUsed;

		// confirm gas usage result
		assertEqual(7491597, gasUsed, "getting 45 plots for ref points gas usage mismatch: " + gasUsed);
	});

	it("gas: getting one plot for coupon requires 317,945 gas", async() => {
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
		// enable using coupons feature
		await s.updateFeatures(0x00000004); // using coupons enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// add a coupon
		await s.updateCoupon(web3.sha3("coupon"), 1);

		// get plot(s) for coupon
		const gasUsed = (await s.useCoupon("coupon", {from: p})).receipt.gasUsed;

		// confirm gas usage result
		assertEqual(317945, gasUsed, "getting one plot for coupon gas usage mismatch: " + gasUsed);
	});
	it("gas: getting ten plots for coupon requires 1,768,325 gas", async() => {
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
		// enable using coupons feature
		await s.updateFeatures(0x00000004); // using coupons enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// add a coupon
		await s.updateCoupon(web3.sha3("coupon"), 10);

		// get plot(s) for coupon
		const gasUsed = (await s.useCoupon("coupon", {from: p})).receipt.gasUsed;

		// confirm gas usage result
		assertEqual(1768325, gasUsed, "getting ten plots for coupon gas usage mismatch: " + gasUsed);
	});
	it("gas: getting 25 plots for coupon requires 4,245,317 gas", async() => {
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
		// enable using coupons feature
		await s.updateFeatures(0x00000004); // using coupons enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// add a coupon
		await s.updateCoupon(web3.sha3("coupon"), 25);

		// get plot(s) for coupon
		const gasUsed = (await s.useCoupon("coupon", {from: p})).receipt.gasUsed;

		// confirm gas usage result
		assertEqual(4245317, gasUsed, "getting 25 plots for coupon gas usage mismatch: " + gasUsed);
	});
	it("gas: getting 45 plots for coupon requires 7,528,047 gas", async() => {
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
		// enable using coupons feature
		await s.updateFeatures(0x00000004); // using coupons enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, 0x00000004); // seller

		// add a coupon
		await s.updateCoupon(web3.sha3("coupon"), 45);

		// get plot(s) for coupon
		const gasUsed = (await s.useCoupon("coupon", {from: p})).receipt.gasUsed;

		// confirm gas usage result
		assertEqual(7528047, gasUsed, "getting 45 plots for coupon gas usage mismatch: " + gasUsed);
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

