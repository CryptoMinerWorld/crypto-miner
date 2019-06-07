// World Plot Sale dependencies
const Tracker = artifacts.require("./RefPointsTracker.sol");
const Country = artifacts.require("./CountryERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");
// World Plot Sale itself
const Sale = artifacts.require("./PlotSale.sol");

// features and roles to be used
const FEATURE_SALE_ENABLED = 0x00000001;
const ROLE_TOKEN_CREATOR = 0x00000001;
const ROLE_REF_POINTS_ISSUER = 0x00000001;
const ROLE_SELLER = 0x00000004;

// one token price
const SALE_PRICE = 20000000000000000;

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
		assert.equal(5, tiers.shrn(56).mod(toBN(256)), "wrong number of tiers");
		assert.equal(0, tiers.shrn(48).mod(toBN(256)), "wrong tier1 offset");
		assert.equal(0, tiers.mod(toBN(256)), "wrong initial offset");
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
		// grant sale a permission to add known addresses into ref tracker
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

});

// import auxiliary function to ensure function `fn` throws
import {assertThrows, toBN, getBalanceBN, gasUsedBN, ZERO_ADDR} from "../scripts/shared_functions";
