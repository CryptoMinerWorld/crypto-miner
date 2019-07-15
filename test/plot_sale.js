// World Plot Sale dependencies
const Tracker = artifacts.require("./RefPointsTracker.sol");
const Country = artifacts.require("./CountryERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");
// World Plot Sale itself
const Sale = artifacts.require("./PlotSale.sol");

// import ERC721Core dependencies
import {
	FEATURE_TRANSFERS,
	ROLE_TOKEN_CREATOR,
} from "./erc721_core";

// features and roles to be used
const FEATURE_SALE_ENABLED = 0x00000001;
const FEATURE_GET_ENABLED = 0x00000002;
const FEATURE_USING_COUPONS_ENABLED = 0x00000004;
const ROLE_WITHDRAW_MANAGER = 0x00000001;
const ROLE_COUPON_MANAGER = 0x00000002;
const ROLE_REF_POINTS_ISSUER = 0x00000001;
const ROLE_REF_POINTS_CONSUMER = 0x00000002;
const ROLE_SELLER = 0x00000004;

// one token price
const SALE_PRICE = 20000000000000000; // wei (0.02 ETH)
const REF_POINTS_PRICE = 4; // referral points

// import country data
import {COUNTRY_DATA} from "../data/country_data";

// PlotSale related tests
contract('PlotSale', (accounts) => {
	it("deployment: verify deployment routine", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = new Date().getTime() / 1000 | 0; // offset, sale start time

		// verify wrong constructor parameters fail
		await assertThrows(Sale.new, 0, c.address, t.address, w, m, b, u);
		await assertThrows(Sale.new, r.address, 0, t.address, w, m, b, u);
		await assertThrows(Sale.new, r.address, c.address, 0, w, m, b, u);
		await assertThrows(Sale.new, r.address, c.address, t.address, 0, m, b, u);
		await assertThrows(Sale.new, r.address, c.address, t.address, w, 0, b, u);
		await assertThrows(Sale.new, r.address, c.address, t.address, w, m, 0, u);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);

		// verify the setup
		assert.equal(r.address, await s.refPointsTracker(), "wrong ref points tracker address");
		assert.equal(c.address, await s.countryInstance(), "wrong country instance address");
		assert.equal(t.address, await s.plotInstance(), "wrong plot instance address");
		assert.equal(w, await s.worldChest(), "wrong world chest address");
		assert.equal(m, await s.monthlyChest(), "wrong monthly chest address");
		assert.equal(b, await s.beneficiary(), "wrong beneficiary address");
		assert.equal(u, await s.saleStartUTC(), "wrong saleStartUTC value");
		assert.equal(SALE_PRICE, await s.SALE_PRICE(), "wrong SALE_PRICE value");
	});

	it("integrity: tiers5 generation randomized function constraints", async() => {
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

		// generate randomized tier structure
		const tiers = await s.random5Tiers(0);
		assert.equal(5, tiers.shrn(56).maskn(8), "wrong number of tiers");
		assert.equal(0, tiers.shrn(48).maskn(8), "wrong tier1 offset");
		assert.equal(0, tiers.maskn(8), "wrong initial offset");
	});

	it("buy: features and roles required to buy plots", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p1 = accounts[1]; // player 1
		const p2 = accounts[2]; // player 2
		const p3 = accounts[3]; // player 3

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);

		// functions to buy plots - regular and with referral
		const fn1 = async() => await s.buy(1, 1, {from: p1, value: SALE_PRICE});
		const fn2 = async() => await s.buyRef(1, 1, p1, {from: p2, value: SALE_PRICE});
		const fn3 = async() => await s.buyRef(1, 5, p1, {from: p3, value: 5 * SALE_PRICE});

		// any non-full combination of features and roles fail
		await assertThrows(fn1);
		await assertThrows(fn2);
		await assertThrows(fn3);
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		await assertThrows(fn1);
		await assertThrows(fn2);
		await assertThrows(fn3);
		await r.updateRole(s.address, ROLE_SELLER);
		await t.updateRole(s.address, 0);
		await assertThrows(fn1);
		await assertThrows(fn2);
		await assertThrows(fn3);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		await s.updateFeatures(0);
		await assertThrows(fn1);
		await assertThrows(fn2);
		await assertThrows(fn3);
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		await fn1();
		await fn2();

		// regular buy worked once all relevant features are enabled
		// buy with referral requires additional permission to issue referral points
		await assertThrows(fn3);
		await r.updateRole(s.address, ROLE_REF_POINTS_ISSUER); // seller role has gone
		await assertThrows(fn3);
		await r.updateRole(s.address, ROLE_SELLER | ROLE_REF_POINTS_ISSUER);
		await t.updateRole(s.address, 0);
		await assertThrows(fn3);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		await s.updateFeatures(0);
		await assertThrows(fn3);
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		await fn3();

		// verify plots were bought correctly
		assert.equal(1, await t.balanceOf(p1), "wrong player 1 balance after buying a plot");
		assert.equal(1, await t.balanceOf(p2), "wrong player 2 balance after buying a plot");
	});
	it("buy: impossible to buy more plots than country has", async() => {
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

		// instantiate 2 plot sale smart contracts pointing to the same tokens
		const s1 = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		const s2 = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s1.updateFeatures(FEATURE_SALE_ENABLED);
		await s2.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s1.address, ROLE_TOKEN_CREATOR);
		await t.updateRole(s2.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s1.address, ROLE_SELLER);
		await r.updateRole(s2.address, ROLE_SELLER);

		// buy 5 plots in Liechtenstein functions
		const fn11 = async () => await s1.buy(190, 5, {from: p, value: 5 * SALE_PRICE});
		const fn21 = async () => await s2.buy(190, 5, {from: p, value: 5 * SALE_PRICE});
		// buy 1 plot in Maldives functions
		const fn12 = async () => await s1.buy(188, 1, {from: p, value: SALE_PRICE});
		const fn22 = async () => await s2.buy(188, 1, {from: p, value: SALE_PRICE});

		// first call to fn11/fn21 succeeds, second – fails (no more plots)
		await fn11();
		await assertThrows(fn11);
		await assertThrows(fn21);
		// first 5 calls to fn12/fn22 succeed, next calls – fail (no more plots)
		await fn12();
		await fn12();
		await fn22();
		await fn12();
		await fn22();
		await assertThrows(fn12);
		await assertThrows(fn22);
	});
	it("buy: impossible to buy plots in non-existing countries", async() => {
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
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_SELLER);

		// a function to buy plot in arbitrary country
		const fn = async(k) => await s.buy(k, 1, {from: p, value: SALE_PRICE});

		// verify buying process for all 256 values of k
		// to speed up process – check only each 5th value (optional)
		const cmpDiv = 5; // complexity divider, 1 – full scan
		for(let i = 0; i < 256; i += cmpDiv) {
			if(0 < i && i < 191) {
				await fn(i);
			}
			else {
				await assertThrows(fn, i);
			}
		}

		// ensure 190 plots were bought
		assert.equal(190 / cmpDiv, await t.totalSupply(), "wrong plot total supply after buying 190 plots")
	});
	it("buy: impossible to buy plots paying less", async() => {
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
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_SELLER);

		// a function to buy plot in Russia
		const fn = async(n, v) => await s.buy(1, n, {from: p, value: v});
		// specifying zero value or no value at all fails
		await assertThrows(fn, 0, 0);
		await assertThrows(fn, 1, 0);
		await assertThrows(s.buy, 1, 1);
		// perform several randomized tries
		let succeeded = 0, failed = 0;
		const complexity = 20;
		for(let i = 0; i < complexity; i++) {
			const n = Math.floor(Math.random() * complexity);
			const v = Math.floor(Math.random() * complexity * SALE_PRICE);
			if(v < n * SALE_PRICE || n === 0) {
				await assertThrows(fn, n, v);
				failed++;
			}
			else {
				await fn(n, v);
				succeeded++;
			}
		}
		console.log("\t%o succeeded, %o failed (test complexity %o)", succeeded, failed, complexity);
	});
	it("buy: ETH flow", async() => {
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
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_SELLER);

		// save initial balances of the participants
		const p0 = await getBalanceBN(p);
		const w0 = await getBalanceBN(w);
		const m0 = await getBalanceBN(m);
		const b0 = await getBalanceBN(b);

		// buy one plot in Russia
		const gasUsed = gasUsedBN(await s.buy(1, 1, {from: p, value: SALE_PRICE}));

		// save new balances of the participants
		const p1 = await getBalanceBN(p);
		const w1 = await getBalanceBN(w);
		const m1 = await getBalanceBN(m);
		const b1 = await getBalanceBN(b);

		// verify player got n tokens
		assert.equal(1, await t.balanceOf(p), "wrong player token balance");
		// verify player balance decreased properly
		assert.equal(SALE_PRICE, p0.sub(p1).sub(gasUsed), "wrong player balance");
		// verify world chest balance increased properly
		assert.equal(SALE_PRICE / 5, w1.sub(w0), "wrong world chest balance");
		// verify monthly chest balance increased properly
		assert.equal(SALE_PRICE / 20, m1.sub(m0), "wrong monthly chest balance");
		// verify beneficiary account balance increased properly
		assert.equal(SALE_PRICE / 4 * 3, b1.sub(b0), "wrong beneficiary balance");
	});
	it("buy: ETH flow (owned country)", async() => {
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
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_SELLER);

		// save initial balances of the participants
		const w0 = await getBalanceBN(w);
		const m0 = await getBalanceBN(m);
		const o0 = await s.balanceOf(o);
		const b0 = await getBalanceBN(b);
		const p0 = await getBalanceBN(p);

		// buy one plot in Russia
		const gasUsed = gasUsedBN(await s.buy(1, 1, {from: p, value: SALE_PRICE}));

		// save new balances of the participants
		const w1 = await getBalanceBN(w);
		const m1 = await getBalanceBN(m);
		const o1 = await s.balanceOf(o);
		const b1 = await getBalanceBN(b);
		const p1 = await getBalanceBN(p);

		// verify player got n tokens
		assert.equal(1, await t.balanceOf(p), "wrong player token balance");
		// verify player balance decreased properly
		assert.equal(SALE_PRICE, p0.sub(p1).sub(gasUsed), "wrong player balance");
		// verify world chest balance increased properly
		assert.equal(SALE_PRICE / 5, w1.sub(w0), "wrong world chest balance");
		// verify monthly chest balance increased properly
		assert.equal(SALE_PRICE / 20, m1.sub(m0), "wrong monthly chest balance");
		// verify country owner balance increased properly
		assert.equal(SALE_PRICE / 10, o1.sub(o0), "wrong country owner balance (PlotSale.balanceOf)");
		// verify beneficiary account balance increased properly
		assert.equal(SALE_PRICE / 20 * 13, b1.sub(b0), "wrong beneficiary balance");


		// save real balance of the country owner
		const _o0 = await getBalanceBN(o);
		// let country owner withdraw their balance from sale
		const _gasUsed = gasUsedBN(await s.withdraw(o, {from: o}));
		// save new real balance of the country owner
		const _o1 = await getBalanceBN(o);

		// verify country owner real balance increased properly
		assert.equal(SALE_PRICE / 10, _o1.sub(_o0).add(_gasUsed), "wrong country owner balance");

		// verify country balance zeroed down
		assert.equal(0, await s.balanceOf(o), "non-zero country owner balance (PlotSale.balanceOf)");
		// verify its impossible to withdraw again
		await assertThrows(s.withdraw, o, {from: o});
		await assertThrows(s.withdraw, o);
	});
	it("buy: referral points flow", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define several accounts
		const p1 = accounts[1]; // player 1
		const p2 = accounts[2]; // player 2
		const p3 = accounts[3]; // player 3
		const p4 = accounts[4]; // player 4
		const p5 = accounts[5]; // player 5

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to issue referral points and add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_REF_POINTS_ISSUER | ROLE_SELLER);

		// define convenient reusable buying function
		const buy = async (n, a, b) => {
			await s.buyRef(1, n, b, {from: a, value: n * SALE_PRICE + Math.floor(Math.random() * SALE_PRICE)});
		};

		// player 1 buys a plot and becomes a referrer
		await buy(1, p1, ZERO_ADDR);
		// player 2 buys 4 plots referring to player 1 - it's not enough to get points
		await buy(4, p2, p1);
		// player 3 buys 5 plots referring to player 2 – both get referral points
		await buy(5, p3, p2);
		// player 4 buys few plots - not enough to get referral points
		await buy(1, p4, p1);
		// player 5 buys 9 plots referring to player 4 - both get referral points
		await buy(9, p5, p4);

		// verify referral points balances
		assert.equal(0, await r.balanceOf(p1), "wrong player 1 ref points balance");
		assert.equal(2, await r.balanceOf(p2), "wrong player 2 ref points balance");
		assert.equal(1, await r.balanceOf(p3), "wrong player 3 ref points balance");
		assert.equal(2, await r.balanceOf(p4), "wrong player 4 ref points balance");
		assert.equal(1, await r.balanceOf(p5), "wrong player 5 ref points balance");
	});

	it("get: features and roles required to get plots", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to get tokens with
		const p = accounts[1]; // player

		// give player a good amount of referral points to consume
		await r.issueTo(p, 1000);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);

		// define a function to test
		const fn = async() => await s.get(1, {from: p});

		// any non-full combination of features and roles fail
		await assertThrows(fn);
		await s.updateFeatures(FEATURE_GET_ENABLED);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		await assertThrows(fn);
		await r.updateRole(s.address, ROLE_REF_POINTS_CONSUMER);
		await t.updateRole(s.address, 0);
		await assertThrows(fn);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		await s.updateFeatures(0);
		await assertThrows(fn);
		await s.updateFeatures(FEATURE_GET_ENABLED);
		await fn();

		// verify the balance
		assert.equal(1, await t.balanceOf(p), "wrong player balance after getting a plot");
	});
	it("get: ref points flow", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to get tokens with
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable getting plots for referral points feature
		await s.updateFeatures(FEATURE_GET_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to consumer referral points
		await r.updateRole(s.address, ROLE_REF_POINTS_CONSUMER);

		// issue some referral points to a player
		const issued = 1000;
		await r.issueTo(p, issued);

		// buy some plots
		const n = Math.floor(1 + Math.random() * 20);
		await s.get(n, {from: p});

		// verify the balances
		assert.equal(n, await t.balanceOf(p), "wrong plot balance");
		assert.equal(issued - n * REF_POINTS_PRICE, await r.balanceOf(p), "wrong ref points balance");

		// verify the plots minted in Bermuda Triangle
		for(let plot of await t.getCollection(p)) {
			assert.equal(255, plot >> 16, "wrong country ID for plot " + plot);
		}
	});
	it("get: enough referral points required to get plots", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to get tokens with
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable getting plots for referral points feature
		await s.updateFeatures(FEATURE_GET_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to consumer referral points
		await r.updateRole(s.address, ROLE_REF_POINTS_CONSUMER);

		// define a function to get some plots
		const fn = async(n) => await s.get(n, {from: p});

		// initially any attempt fails - no referral points
		await assertThrows(fn, 0);
		await assertThrows(fn, 1);
		await assertThrows(fn, Math.floor(Math.random() * 100));

		// perform several randomized tries
		let succeeded = 0, failed = 0;
		const complexity = 15;
		for(let i = 0; i < complexity; i++) {
			const n = Math.floor(Math.random() * complexity);
			const v = Math.floor(1 + Math.random() * complexity * REF_POINTS_PRICE); // impossible to issue 0 points, add 1
			await r.issueTo(p, v);
			if(v < n * REF_POINTS_PRICE || n === 0) {
				await assertThrows(fn, n);
				await r.consumeFrom(p, v); // consume unused ref points
				failed++;
			}
			else {
				await fn(n);
				if(v > n * REF_POINTS_PRICE) {
					await r.consumeFrom(p, v - n * REF_POINTS_PRICE); // consume unused ref points
				}
				succeeded++;
			}
		}
		console.log("\t%o succeeded, %o failed (test complexity %o)", succeeded, failed, complexity);
	});

	it("withdrawal: only country owner and withdraw manager can withdraw", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const o = accounts[12]; // country owner
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player
		// define a withdraw manager account
		const a = accounts[5];

		// give Russia to owner 1
		await c.mint(o, 1);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_SELLER);

		// buy one plot in Russia
		await s.buy(1, 1, {from: p, value: SALE_PRICE});

		// define a function to test
		const fn = async() => await s.withdrawFrom(1, {from: a});

		// verify ROLE_WITHDRAW_MANAGER can withdraw on behalf
		await assertThrows(fn);
		await s.updateRole(a, ROLE_WITHDRAW_MANAGER);
		await fn();

		// buy one more plot in Russia
		await s.buy(1, 1, {from: p, value: SALE_PRICE});

		// verify owner can withdraw
		await s.updateRole(a, 0);
		await assertThrows(fn);
		await c.updateFeatures(FEATURE_TRANSFERS);
		await c.transfer(a, 1, {from: o});
		await fn();
	});
	it("withdrawal: transferring a country with balance", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const o1 = accounts[12]; // country owner 1
		const o2 = accounts[15]; // country owner 2
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// give Russia to owner 1
		await c.mint(o1, 1);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_SELLER);

		// buy one plot in Russia
		await s.buy(1, 1, {from: p, value: SALE_PRICE});
		const tax10 = SALE_PRICE / 10;

		// verify the withdraw balances
		assert.equal(tax10, await s.balanceOf(o1), "wrong owner 1 balance before transfer");
		assert.equal(0, await s.balanceOf(o2), "wrong owner 2 balance before transfer");

		// perform the country ownership transfer
		await c.updateFeatures(FEATURE_TRANSFERS);
		await c.transfer(o2, 1, {from: o1});

		// verify the withdraw balances
		assert.equal(0, await s.balanceOf(o1), "wrong owner 1 balance after transfer");
		assert.equal(tax10, await s.balanceOf(o2), "wrong owner 2 balance after transfer");

		// save balance of the country owner 2
		const _o0 = await getBalanceBN(o2);
		// let country owner 2 withdraw their balance from sale
		const _gasUsed = gasUsedBN(await s.withdrawFrom(1, {from: o2}));
		// save new balance of the country owner 2
		const _o1 = await getBalanceBN(o2);
		// verify country owner 2 balance increased properly
		assert.equal(tax10, _o1.sub(_o0).add(_gasUsed), "wrong owner 2 balance withdrawal amount");
	});
	it("withdrawal: withdrawing from several countries at once", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const o1 = accounts[12]; // country owner 1
		const o2 = accounts[15]; // country owner 2
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_SELLER);

		// mint `k` countries to owner 1
		const complexity = 5;
		const k = 2 * complexity;
		for(let i = 0; i < k; i++) {
			await c.mint(o1, i + 1);
		}
		// player buys 'l' plots in each country
		const l = complexity;
		for(let i = 0; i < k; i++) {
			await s.buy(i + 1, l, {from: p, value: l * SALE_PRICE});
		}

		// verify country owner 1 and 2 balances, total tax payed is 10%
		const x = k * l * SALE_PRICE / 10;
		assert.equal(x, await s.balanceOf(o1), "incorrect initial owner 1 balance");
		assert.equal(0, await s.balanceOf(o2), "incorrect initial owner 2 balance");

		// transfer one of the countries
		await c.updateFeatures(FEATURE_TRANSFERS);
		await c.transfer(o2, 1, {from: o1});

		// verify country owner 1 and 2 balances
		const a = l * SALE_PRICE / 10;
		assert.equal(x - a, await s.balanceOf(o1), "incorrect owner 1 balance after 1 country transfer");
		assert.equal(a, await s.balanceOf(o2), "incorrect owner 2 balance after 1 country transfer");

		// withdraw the funds and verify balances
		await assertThrows(s.withdrawFrom, 2, {from: o2}); // country 1 is owned by owner 2
		const _o10 = await getBalanceBN(o1);
		const _o20 = await getBalanceBN(o2);
		await s.withdrawFrom(2); // performed by default account 0 – a withdraw manager
		await s.withdraw(o2); // performed by default account 0 – a withdraw manager
		const _o11 = await getBalanceBN(o1);
		const _o21 = await getBalanceBN(o2);
		assert.equal(a, _o11.sub(_o10), "wrong owner 1 withdrawal balance (partial)");
		assert.equal(a, _o21.sub(_o20), "wrong owner 2 withdrawal balance");
		await s.withdraw(o1);
		const _o12 = await getBalanceBN(o1);
		const _o22 = await getBalanceBN(o2);
		assert.equal(x - a, _o12.sub(_o10), "wrong owner 1 withdrawal balance (full)");
		assert.equal(a, _o22.sub(_o20), "wrong owner 2 withdrawal balance (2)");
	});

	it("coupons: ROLE_COUPON_MANAGER is required to add a coupon", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define an operator account to add coupon
		const op = accounts[5]; // operator

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);

		// create a coupon
		const code = "coupon1";
		const key = keccak256(code);

		// define a function to test
		const fn = async() => await s.updateCoupon(key, 1, {from: op});

		// verify ROLE_COUPON_MANAGER is required to add a coupon
		await assertThrows(fn);
		await s.updateRole(op, ROLE_COUPON_MANAGER);
		await fn();

		// verify the balance
		assert.equal(1, await s.isCouponValid(code), "coupon is invalid after adding it");
	});
	it("coupons: features and roles required to use a coupon", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to get tokens with
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);

		// create and add a coupon
		const code = "coupon1";
		const key = keccak256(code);
		await s.updateCoupon(key, 1);

		// define a function to test
		const fn = async() => await s.useCoupon(code, {from: p});

		// any non-full combination of features and roles fail
		await assertThrows(fn);
		await s.updateFeatures(FEATURE_USING_COUPONS_ENABLED);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		await assertThrows(fn);
		await r.updateRole(s.address, ROLE_SELLER);
		await t.updateRole(s.address, 0);
		await assertThrows(fn);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		await s.updateFeatures(0);
		await assertThrows(fn);
		await s.updateFeatures(FEATURE_USING_COUPONS_ENABLED);
		await fn();

		// verify the balance
		assert.equal(1, await t.balanceOf(p), "wrong player balance after using a coupon");
	});
	it("coupons: valid coupon is required to get plots", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to get tokens with
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);

		// enable all features and roles required
		await s.updateFeatures(FEATURE_USING_COUPONS_ENABLED);
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		await r.updateRole(s.address, ROLE_SELLER);

		// create and add a coupon
		const code = "coupon1";
		const key = keccak256(code);
		await s.updateCoupon(key, 1);
		await s.updateCoupon(key, 0);
		assert.equal(0, await s.isCouponValid(code), "isCouponValid wrong initial value");

		// define a function to test
		const fn = async() => await s.useCoupon(code, {from: p});

		// try using wrong coupon
		await assertThrows(fn);
		// try using good coupon
		await s.updateCoupon(key, 1);
		assert.equal(1, await s.isCouponValid(code), "isCouponValid wrong value after adding a coupon");
		await fn();
		assert.equal(1, await t.balanceOf(p), "wrong player balance after using a coupon");
		// try using same coupon twice
		await assertThrows(fn);
		// try using good coupon again
		await s.updateCoupon(key, 5);
		await fn();
		// try using same coupon twice
		await assertThrows(fn);

		// verify final token balance
		assert.equal(6, await t.balanceOf(p), "wrong player balance after using another coupon");
	});
});

// import auxiliary function to ensure function `fn` throws
import {assertThrows, keccak256, getBalanceBN, gasUsedBN, ZERO_ADDR} from "../scripts/shared_functions";
