const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_ROLE_MANAGER = 0x10000000;
const ROLE_COUPON_MANAGER = 0x00000100;

const Token = artifacts.require("./GemERC721");
const Sale = artifacts.require("./CouponSale");

contract('CouponSale', function(accounts) {
	it("coupon sale: adding a coupon, removing coupon", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);
		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);

		const couponCode = "SALE-900";
		const couponKey = web3.sha3(couponCode);
		const fn1 = async () => await sale.addCoupon(couponKey, 4, {from: accounts[1]});
		const fn2 = async () => await sale.removeCoupon(couponKey, {from: accounts[1]});

		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);
		await sale.addOperator(accounts[1], ROLE_COUPON_MANAGER);

		await fn1();
		assert((await sale.coupons(couponKey))[0], "newly added coupon SALE-900 doesn't exist");
		assert(await sale.isCouponValid(couponCode), "newly added coupon SALE-900 is not valid");

		await fn2();
		assert.equal(0, (await sale.coupons(couponKey))[0], "removed coupon SALE-900 still exists after removal");
		assert(!await sale.isCouponValid(couponCode), "removed coupon SALE-900 is still valid after removal");
	});
	it("coupon sale: using coupon", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);
		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		const couponCode = "SALE-900";
		const couponKey = web3.sha3(couponCode);

		const fn = async () => await sale.useCoupon(couponCode, {from: accounts[1]});
		await assertThrowsAsync(fn);
		await sale.addCoupon(couponKey, 4);
		await fn();
		assert.equal(4, await tk.balanceOf(accounts[1]), "wrong token balance after using a coupon");
		await sale.addCoupon(couponKey, 1);
		await fn();
		assert.equal(5, await tk.balanceOf(accounts[1]), "wrong token balance after using a coupon");

		await assertThrowsAsync(async function() {await sale.addCoupon(couponKey, 3);});
	});
});

async function assertThrowsAsync(fn) {
	let f = function() {};
	try {
		await fn();
	}
	catch(e) {
		f = function() {
			throw e;
		};
	}
	finally {
		assert.throws(f);
	}
}
