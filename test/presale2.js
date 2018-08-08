const ROLE_COUPON_MANAGER = 0x00000100;
const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_ROLE_MANAGER = 0x10000000;

const GEODES_SOLD = 544; //544;
const FIRST_500_GEODES = 500;
const MAX_GEODES_BUY = 11;

const Token = artifacts.require("./GemERC721");
const Sale = artifacts.require("./CouponSale");
const Sale2 = artifacts.require("./Presale2");

contract('Presale2', accounts => {
	it("presale2: continuing presale", async () => {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[11], accounts[12]);

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);

		let price1 = await sale.currentPrice();
		let price10 = price1.times(10);

		process.stdout.write("    presale 1 initializing with " + GEODES_SOLD + " geodes\n    ");
		if(GEODES_SOLD > FIRST_500_GEODES) {
			const first500 = Math.ceil(FIRST_500_GEODES / MAX_GEODES_BUY);
			for(let i = 0; i < first500; i++) {
				await sale.getGeodes({from: accounts[i % 10 + 1], value: price10});
				process.stdout.write(".");
			}
			price1 = price1.times(2);
			price10 = price10.times(2);
			for(let i = 0; i < Math.floor((GEODES_SOLD - first500 * MAX_GEODES_BUY) / MAX_GEODES_BUY); i++) {
				await sale.getGeodes({from: accounts[i % 10 + 1], value: price10});
				process.stdout.write(".");
			}
		}
		else {
			for(let i = 0; i < Math.floor(GEODES_SOLD / MAX_GEODES_BUY); i++) {
				await sale.getGeodes({from: accounts[i % 10 + 1], value: price10});
				process.stdout.write(".");
			}
		}
		for(let i = 0; i < GEODES_SOLD % MAX_GEODES_BUY; i++) {
			await sale.getGeodes({from: accounts[i % 10 + 1], value: price1});
			process.stdout.write(".");
		}
		process.stdout.write("\n");
		const couponCode = "SALE-900";
		const couponKey = web3.sha3(couponCode);
		await sale.addCoupon(couponKey, 1);
		await sale.useCoupon(couponCode);
		assert.equal(GEODES_SOLD, await sale.geodesSold(), "wrong geodes sold counter");
		console.log("    presale 1 initialization successful");

		const balance13 = await web3.eth.getBalance(accounts[13]);
		const balance14 = await web3.eth.getBalance(accounts[14]);
		const sale2 = await Sale2.new(sale.address, accounts[13], accounts[14]);
		assert.equal(GEODES_SOLD, await sale2.geodesSold(), "wrong geodes sold counter (2)");
		console.log("    presale 2 created successfully");

		await tk.addOperator(sale2.address, ROLE_TOKEN_CREATOR);

		const gemsInGeode = (await sale2.GEMS_IN_GEODE()).toNumber();
		price1 = await sale2.currentPrice();
		price10 = price1.times(10);
		await assertThrowsAsync(async () => await sale2.getGeodes(2, 0, {from: accounts[15], value: price1}));

		console.log("    buying single geode with no referral");
		await sale2.getGeodes(1, 0, {from: accounts[15], value: price1});
		assert.equal(gemsInGeode, await tk.balanceOf(accounts[15]), "wrong token balance after buying 1 geode");
		assert.equal(1, await sale2.geodeBalances(accounts[15]), "wrong geode balance after buying 1 geode");
		assert.equal(GEODES_SOLD + 1, await sale2.geodesSold(), "wrong geodes sold counter after buying 1 geode");
		assert.equal(GEODES_SOLD + 2, await sale2.nextGeode(), "wrong next geode pointer after buying 1 geode");
		assert.equal(accounts[15], await sale2.geodeOwners(GEODES_SOLD + 1), "wrong last geode owner after buying 1 geode");
		assert(price1.times(1905).div(10000).eq((await web3.eth.getBalance(accounts[13])).minus(balance13)), "wrong chest balance after buying 1 geode");
		assert(price1.times(8095).div(10000).eq((await web3.eth.getBalance(accounts[14])).minus(balance14)), "wrong beneficiary balance after buying 1 geode");
		assert.equal(0, await sale2.referralPoints(accounts[15]), "wrong initial referralPoints for account 15");
		assert.equal(0, await sale2.referralPointsConsumed(accounts[15]), "wrong initial referralPointsConsumed for account 15");
		assert.equal(0, await sale2.unusedReferralPoints(accounts[15]), "wrong initial unusedReferralPoints for account 15");
		assert.equal(0, await sale2.totalRefPoints(), "wrong initial total referral points");

		console.log("    buying single geode with referral in invalid state");
		await sale2.getGeodes(1, accounts[1], {from: accounts[15], value: price1});
		assert.equal(gemsInGeode * 2, await tk.balanceOf(accounts[15]), "wrong token balance after buying next geode");
		assert.equal(2, await sale2.geodeBalances(accounts[15]), "wrong geode balance after buying next geode");
		assert(price1.times(2).times(1905).div(10000).eq((await web3.eth.getBalance(accounts[13])).minus(balance13)), "wrong chest balance after buying next geode");
		assert(price1.times(2).times(8095).div(10000).eq((await web3.eth.getBalance(accounts[14])).minus(balance14)), "wrong beneficiary balance after buying next geode");
		assert.equal(0, await sale2.referralPoints(accounts[15]), "wrong referralPoints for account 15 after buying next geode");
		assert.equal(0, await sale2.referralPointsConsumed(accounts[15]), "wrong referralPointsConsumed for account 15 after buying next geode");
		assert.equal(0, await sale2.unusedReferralPoints(accounts[15]), "wrong unusedReferralPoints for account 15 after buying next geode");
		assert.equal(0, await sale2.totalRefPoints(), "wrong total referral points after buying next geode");

		console.log("    buying 10 geodes with a referral");
		await sale2.getGeodes(10, accounts[1], {from: accounts[16], value: price10});
		assert.equal(gemsInGeode * 11 + 1, await tk.balanceOf(accounts[16]), "wrong token balance after buying 10 geodes");
		assert.equal(11, await sale2.geodeBalances(accounts[16]), "wrong geode balance after buying 10 geodes");
		assert(price1.times(12).times(1905).div(10000).eq((await web3.eth.getBalance(accounts[13])).minus(balance13)), "wrong chest balance after buying 10 geodes");
		assert(price1.times(12).times(8095).div(10000).eq((await web3.eth.getBalance(accounts[14])).minus(balance14)), "wrong beneficiary balance after buying 10 geodes");
		assert.equal(10, await sale2.referralPoints(accounts[16]), "wrong referralPoints for account 16 after buying 10 geodes");
		assert.equal(0, await sale2.referralPointsConsumed(accounts[16]), "wrong referralPointsConsumed for account 16 after buying 10 geodes");
		assert.equal(10, await sale2.unusedReferralPoints(accounts[16]), "wrong unusedReferralPoints for account 16 after buying 10 geodes");
		assert.equal(20, await sale2.referralPoints(accounts[1]), "wrong referralPoints for account 1 after referring 10 geodes");
		assert.equal(0, await sale2.referralPointsConsumed(accounts[1]), "wrong referralPointsConsumed for account 1 after referring 10 geodes");
		assert.equal(20, await sale2.unusedReferralPoints(accounts[1]), "wrong unusedReferralPoints for account 1 after referring 10 geodes");
		assert.equal(30, await sale2.totalRefPoints(), "wrong total referral points after buying 10 geodes");

		console.log("    consuming referral points");
		const account1Gems = await tk.balanceOf(accounts[1]);
		const account16Gems = await tk.balanceOf(accounts[16]);
		const account1Geodes = await sale2.geodeBalances(accounts[1]);
		const account16Geodes = await sale2.geodeBalances(accounts[16]);
		await sale2.consumeAllReferralPoints({from: accounts[1]});
		await sale2.consumeAllReferralPoints({from: accounts[16]});
		assert(account1Gems.plus(gemsInGeode).eq(await tk.balanceOf(accounts[1])), "wrong token balance for referral account 1");
		assert(account16Gems.plus(1).eq(await tk.balanceOf(accounts[16])), "wrong token balance for referral account 16");
		assert(account1Geodes.plus(1).eq(await sale2.geodeBalances(accounts[1])), "wrong geode balance for referral account 1");
		assert(account16Geodes.eq(await sale2.geodeBalances(accounts[16])), "wrong geode balance for referral account 16");
		assert.equal(10, await sale2.referralPoints(accounts[16]), "wrong referralPoints for account 16 after consuming");
		assert.equal(10, await sale2.referralPointsConsumed(accounts[16]), "wrong referralPointsConsumed for account 16 after consuming");
		assert.equal(0, await sale2.unusedReferralPoints(accounts[16]), "wrong unusedReferralPoints for account 16 after consuming");
		assert.equal(20, await sale2.referralPoints(accounts[1]), "wrong referralPoints for account 1 after consuming");
		assert.equal(20, await sale2.referralPointsConsumed(accounts[1]), "wrong referralPointsConsumed for account 1 after consuming");
		assert.equal(0, await sale2.unusedReferralPoints(accounts[1]), "wrong unusedReferralPoints for account 1 after consuming");
		assert.equal(30, await sale2.totalRefPoints(), "wrong total referral points after consuming");

		console.log("    checking price increase feature");
		await increaseTime(86385);
		assert(price1.eq(await sale2.currentPrice()), "wrong geode price 15 seconds before 1 day has passed");
		await increaseTime(15);
		assert(price1.plus(web3.toWei(1, "finney")).eq(await sale2.currentPrice()), "wrong geode price after 1 day has passed");
		for(let i = 0; i < 30; i++) {
			await increaseTime(86400);
			assert(price1.plus(web3.toWei(i + 2, "finney")).eq(await sale2.currentPrice()), "wrong geode price after " + (i + 2) + " days have passed");
		}
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

async function increaseTime(delta) {
	await web3.currentProvider.send({
		jsonrpc: "2.0",
		method: "evm_increaseTime",
		params: [delta],
		id: new Date().getSeconds()
	});
	await web3.currentProvider.send({
		jsonrpc: "2.0",
		method: "evm_mine",
		params: [],
		id: new Date().getSeconds()
	});
}
