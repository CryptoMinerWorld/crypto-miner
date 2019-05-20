const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
const ROLE_TOKEN_CREATOR = 0x00040000;

const Token = artifacts.require("./CountryERC721.sol");
const Sale = artifacts.require("./CountrySale.sol");

// using secure random generator instead of default Math.random()
const secureRandomInRange = require("random-number-csprng");

// import country data
import {COUNTRY_DATA, COUNTRY_PRICE_DATA, TOTAL_PRICE} from "../data/country_data";

// default token IDs to work with (countries to buy)
const token1 = 1;
const token2 = 2;
const token3 = 3;
const token171 = 171;

// token prices
const price1 = getPrice(token1);
const price2 = getPrice(token2);
const price3 = getPrice(token3);
const price171 = getPrice(token171);

// auxiliary constant "2"
const two = web3.toBigNumber(2);

contract('CountrySale', (accounts) => {
	it("config: total price", async() => {
		// according to http://calculla.com/columnar_addition_calculator
		// 224322900816697582340 wei (224.322900816697582340 wei) (170 countries)
		// according to John's excel: 224.4252429 ETH (190 countries, not 170)
		const expectedTotal = web3.toBigNumber("224322900816697582340");
		assert(expectedTotal.eq(TOTAL_PRICE), "invalid total price");
	});

	it("sale: creating a sale", async() => {
		const beneficiary = accounts[1];
		const buyer1 = accounts[2];
		const price1a = price1.plus(1);

		const tk = await Token.new(COUNTRY_DATA);
		await assertThrows(async () => await Sale.new(0, beneficiary, COUNTRY_PRICE_DATA));
		await assertThrows(async () => await Sale.new(tk.address, 0, COUNTRY_PRICE_DATA));
		await assertThrows(async () => await Sale.new(tk.address, tk.address, COUNTRY_PRICE_DATA));
		await assertThrows(async () => await Sale.new(beneficiary, beneficiary, COUNTRY_PRICE_DATA));
		await assertThrows(async () => await Sale.new(tk.address, beneficiary, COUNTRY_PRICE_DATA.slice().push(1)));
		const sale = await Sale.new(tk.address, beneficiary, COUNTRY_PRICE_DATA);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);

		await assertThrows(async () => await sale.buyTo(token1, 0, {value: price1a}));
		await assertThrows(async () => await sale.buyTo(token1, sale.address, {value: price1a}));
		await assertThrows(async () => await sale.buyTo(token1, tk.address, {value: price1a}));
		await sale.buyTo(token1, buyer1, {value: price1a});
		await assertThrows(async () => await sale.buyTo(token1, buyer1, {value: price1a}));

		await assertThrows(async () => await sale.getPrice(0));
		await sale.getPrice(token1);

		await assertThrows(async () => await sale.getBulkPrice([0]));
		await sale.getBulkPrice([token1]);

		await assertThrows(async () => await sale.removeCoupon(1));
	});

	it("buy: country buy flow", async() => {
		const beneficiary = accounts[1];

		const tk = await Token.new(COUNTRY_DATA);
		const sale = await Sale.new(tk.address, beneficiary, COUNTRY_PRICE_DATA);

		// buyers
		const buyer1 = accounts[2];
		const buyer2 = accounts[3];
		const buyer3 = accounts[4];

		// validate prices
		assert((await sale.getPrice(token1)).eq(price1), "incorrect price for country 1");
		assert((await sale.getPrice(token2)).eq(price2), "incorrect price for country 2");

		// validate bulk prices
		assert((await sale.getBulkPrice([token1])).eq(price1), "incorrect bulk price for country 1");
		assert((await sale.getBulkPrice([token2])).eq(price2), "incorrect bulk price for country 2");
		assert((await sale.getBulkPrice([token1, token2])).eq(getBulkPrice([token1, token2])), "incorrect bulk price for countries [1, 2]");

		// buy 2 countries
		// sale requires permission to mint tokens, without it transaction fails
		await assertThrows(async () => await sale.buy(token1, {from: buyer1, value: price1}));

		// give permissions required
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);

		// sending not enough value to buy/buyTo still fails
		await assertThrows(async () => await sale.buy(token1, {from: buyer1, value: price1.minus(1)}));
		await assertThrows(async () => await sale.buyTo(token2, buyer2, {from: buyer1, value: price2.minus(1)}));
		await assertThrows(async () => await sale.bulkBuy([token3], {from: buyer1, value: price3.minus(1)}));

		// impossible to buy country out of country price range
		await assertThrows(async () => await sale.buy(token171, {from: buyer1, value: price171}));
		await assertThrows(async () => await sale.buyTo(token171, buyer2, {from: buyer1, value: price171}));
		await assertThrows(async () => await sale.bulkBuy([token171], {from: buyer1, value: price171}));

		// check balances
		const balance0 = await web3.eth.getBalance(beneficiary); // beneficiary balance
		const balance1 = await web3.eth.getBalance(buyer1); // buyer 1 balance
		const balance2 = await web3.eth.getBalance(buyer2); // buyer 2 balance

		// sending enough value succeeds
		const gas1 = (await sale.buy(token1, {from: buyer1, value: price1})).receipt.gasUsed;
		const gas2 = (await sale.buyTo(token2, buyer2, {from: buyer1, value: price2})).receipt.gasUsed;

		// check created countries existence and ownership
		assert(await tk.exists(token1), "country 1 doesn't exist after selling it");
		assert(await tk.exists(token2), "country 2 doesn't exist after selling it");
		assert.equal(buyer1, await tk.ownerOf(token1), "country 1 ownership is incorrect");
		assert.equal(buyer2, await tk.ownerOf(token2), "country 2 ownership is incorrect");

		// check that funds are transferred correctly
		assert(balance0.plus(price1).plus(price2).eq(await web3.eth.getBalance(beneficiary)), "wrong beneficiary balance");
		assert(balance1.minus(price1).minus(price2).minus(gas1).minus(gas2).eq(await web3.eth.getBalance(buyer1)), "wrong buyer 1 balance");
		assert(balance2.eq(await web3.eth.getBalance(buyer2)), "wrong buyer 2 balance");

		// additionally check dummy bulk buy case
		await sale.bulkBuy([token3], {from: buyer3, value: price3});
		assert(await tk.exists(token3), "country 3 doesn't exist after selling it");
		assert.equal(buyer3, await tk.ownerOf(token3), "country 3 ownership is incorrect");
	});

	it("bulk buy: countries buy flow", async() => {
		const beneficiary = accounts[1];

		const tk = await Token.new(COUNTRY_DATA);
		const sale = await Sale.new(tk.address, beneficiary, COUNTRY_PRICE_DATA);

		// buyers
		const buyer1 = accounts[2];
		const buyer2 = accounts[3];

		// countries to buy
		const countries1 = [1, 2]; // Russia, Canada
		const countries2 = [3, 4, 5]; // China, USA, Brazil

		// prices
		const bulkPrice1 = getBulkPrice(countries1);
		const bulkPrice2 = getBulkPrice(countries2);

		// verify bulk prices are calculated correctly
		assert((await sale.getBulkPrice(countries1)).eq(getBulkPrice(countries1)), "incorrect bulk price for countries group 1");
		assert((await sale.getBulkPrice(countries2)).eq(getBulkPrice(countries2)), "incorrect bulk price for countries group 2");

		// buy 2 groups of countries
		// sale requires permission to mint tokens, without it transaction fails
		await assertThrows(async () => await sale.bulkBuy(countries1, {from: buyer1, value: bulkPrice1}));

		// give permissions required
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);

		// sending not enough value to buy/buyTo still fails
		await assertThrows(async () => await sale.bulkBuy(countries1, {from: buyer1, value: bulkPrice1.minus(1)}));
		await assertThrows(async () => await sale.bulkBuyTo(buyer2, countries2, {from: buyer1, value: bulkPrice2.minus(1)}));

		// check balances
		const balance0 = await web3.eth.getBalance(beneficiary); // beneficiary balance
		const balance1 = await web3.eth.getBalance(buyer1); // buyer 1 balance
		const balance2 = await web3.eth.getBalance(buyer2); // buyer 2 balance

		// sending enough value succeeds
		const gas1 = (await sale.bulkBuy(countries1, {from: buyer1, value: bulkPrice1})).receipt.gasUsed;
		const gas2 = (await sale.bulkBuyTo(buyer2, countries2, {from: buyer1, value: bulkPrice2})).receipt.gasUsed;

		// check created countries existence and ownership
		for(const id of countries1) {
			assert(await tk.exists(id), "country " + id + " doesn't exist after selling it");
			assert.equal(buyer1, await tk.ownerOf(id), "country " + id + " ownership is incorrect");
		}
		for(const id of countries2) {
			assert(await tk.exists(id), "country " + id + " doesn't exist after selling it");
			assert.equal(buyer2, await tk.ownerOf(id), "country " + id + " ownership is incorrect");
		}

		// check that funds are transferred correctly
		assert(balance0.plus(bulkPrice1).plus(bulkPrice2).eq(await web3.eth.getBalance(beneficiary)), "wrong beneficiary balance");
		assert(balance1.minus(bulkPrice1).minus(bulkPrice2).minus(gas1).minus(gas2).eq(await web3.eth.getBalance(buyer1)), "wrong buyer 1 balance");
		assert(balance2.eq(await web3.eth.getBalance(buyer2)), "wrong buyer 2 balance");
	});

	it("coupons: using a coupon flow", async() => {
		const beneficiary = accounts[1];

		const tk = await Token.new(COUNTRY_DATA);
		const sale = await Sale.new(tk.address, beneficiary, COUNTRY_PRICE_DATA);

		// coupon users
		const player1 = accounts[1];
		const player2 = accounts[2];

		// define some coupons
		const couponCode1 = "RUSSIA";
		const couponKey1 = web3.sha3(couponCode1);
		const couponCode171 = "MAURITIUS";
		const couponKey171 = web3.sha3(couponCode171);

		// add the coupons
		await sale.addCoupon(couponKey1, token1);
		await sale.addCoupon(couponKey171, token171);

		// ensure they cannot be added once again
		await assertThrows(async () => await sale.addCoupon(couponKey1, token1));
		await assertThrows(async () => await sale.addCoupon(couponKey171, token171));

		// ensure added coupons exist and are valid
		assert.equal(token1, await sale.isCouponValid(couponCode1), "invalid coupon 1");
		assert.equal(token171, await sale.isCouponValid(couponCode171), "invalid coupon 171");

		// sale doesn't have permission to mint countries - coupon cannot be used
		await assertThrows(async () => await sale.useCoupon(couponCode1, {from: player1}));
		await assertThrows(async () => await sale.useCoupon(couponCode171, {from: player1}));

		// give permissions required
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);

		// remove the coupon 1
		await sale.removeCoupon(couponKey1);

		// ensure removed coupon 1 doesn't exist
		assert.equal(0, await sale.isCouponValid(couponCode1), "coupon is still valid while it should not");

		// ensure removed coupon 1 cannot be used
		await assertThrows(async () => await ale.useCoupon(couponCode1, {from: player1}));

		// add the coupon 1 again
		await sale.addCoupon(couponKey1, token1);

		// use newly added coupon 1
		await sale.useCoupon(couponCode1, {from: player1});

		// use another coupon - 171
		await sale.useCoupon(couponCode171, {from: player1});

		// verify the countries were minted properly
		assert.equal(2, await tk.balanceOf(player1), "wrong country count for player 1");
		assert.equal(getNumberOfPlots(token1, token171), await tk.getNumberOfPlotsByCountryOwner(player1), "wrong number of plots for player 1");
		assert(await tk.exists(token1), "token 1 doesn't exist");
		assert(await tk.exists(token171), "token 1 doesn't exist");
		assert.equal(player1, await tk.ownerOf(token1), "token 1 has wrong owner");
		assert.equal(player1, await tk.ownerOf(token171), "token 1 has wrong owner");

		// ensure coupon 1 is invalid now
		assert.equal(0, await sale.isCouponValid(couponCode1), "coupon is still valid");

		// ensure coupon cannot be used twice
		await assertThrows(async () => await sale.useCoupon(couponCode1, {from: player2}));

		// redefine the coupon 1
		await sale.removeCoupon(couponKey1);
		await sale.addCoupon(couponKey1, token2);

		// ensure coupon 1 is valid again
		assert.equal(2, await sale.isCouponValid(couponCode1), "coupon is still invalid");

		// use the coupon 1 again
		await sale.useCoupon(couponCode1, {from: player1});

		// verify the country was minted properly
		assert.equal(3, await tk.balanceOf(player1), "wrong country count for player 1 (2)");
		assert.equal(getNumberOfPlots(token1, token2, token171), await tk.getNumberOfPlotsByCountryOwner(player1), "wrong number of plots for player 1 (2)");
		assert(await tk.exists(token2), "token 2 doesn't exist");
		assert.equal(player1, await tk.ownerOf(token2), "token 2 has wrong owner");

	});

	it("coupons: generating 20 random coupons", async() => {
		const beneficiary = accounts[1];
		const player = accounts[1];

		const tk = await Token.new(COUNTRY_DATA);
		const sale = await Sale.new(tk.address, beneficiary, COUNTRY_PRICE_DATA);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);

		const offset = 171;
		const length = 20;

		// generate 20 coupons for the last 20 (5-plots) countries and register them
		const couponCodes = [];
		for(let i = offset; i < offset + length; i++) {
			const couponCode = await generateCouponCode(i);
			couponCodes.push(couponCode);
		}

		// register coupons
		for(let i = 0; i < length; i++) {
			await sale.addCoupon(web3.sha3(couponCodes[i]), offset + i);
		}

		// use these codes and check country owners
		for(let i = offset; i < offset + length; i++) {
			await sale.useCoupon(couponCodes[i - offset], {from: player});
			assert.equal(player, await tk.ownerOf(i), "wrong country " + i + " owner")
		}
	});

});

// generate a secure random coupon code for country `i`
async function generateCouponCode(i) {
	let couponCode = "";
	for(let j = 0; j < 16; j++) {
		couponCode += String.fromCharCode(await secureRandomInRange(65, 90));
	}
	couponCode += "_" + i;
	return couponCode;
}

// get number of plots by token ID
function getNumberOfPlots(...tokenIds) {
	let sum = 0;
	for(const tokenId of tokenIds) {
		sum += COUNTRY_DATA[tokenId - 1];
	}
	return sum;
}

// get price by token ID
function getPrice(tokenId) {
	return COUNTRY_PRICE_DATA[tokenId - 1];
}

// get bulk price for a given array of tokens
function getBulkPrice(tokenIds) {
	return tokenIds.reduce((a, b) => a.plus(getPrice(b)), web3.toBigNumber(0));
}


// import auxiliary function to ensure function `fn` throws
import {assertThrows} from "../scripts/shared_functions";
