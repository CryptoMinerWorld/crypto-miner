const FEATURE_ADD = 0x00000001;
const FEATURE_BUY = 0x00000002;
const ROLE_AUCTION_MANAGER = 0x00010000;
const ROLE_FEE_MANAGER = 0x00020000;
const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_ROLE_MANAGER = 0x10000000;
const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

const Token = artifacts.require("./GemERC721");
const Auction = artifacts.require("./DutchAuction");

// some default token ID to work with
const token0x401 = 0x401;

// some default minting process for that token
const mint0x401 = async function(tk, accounts) {
	// issue a token to account 1
	await tk.mint(
		accounts[1], // owner
		token0x401, // unique token ID
		1, // plot ID
		0, // depth
		1, // gem number
		1, // color ID
		1, // level ID
		1, // grade type
		1  // grade value
	);
};

// some common prices
const P0 = web3.toWei(2, "szabo");
const P1 = web3.toWei(1, "szabo");

contract('Dutch Auction', accounts => {
	it("auction: testing wrong parameters", async () => {
		// zero address token
		await assertThrowsAsync(async () => await Auction.new(0));
		// invalid ERC721  token
		await assertThrowsAsync(async () => await Auction.new(accounts[0]));

		const tk = await Token.new();
		const auction = await Auction.new(tk.address);
		const now = new Date().getTime() / 1000;

		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction transfers on behalf feature is required
		// to remove a token from an auction transfers feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction - wrong parameters
		await assertThrowsAsync(async () => await auction.addWith(token0x401, now, now + 60, P1, P0));
		await assertThrowsAsync(async () => await auction.addWith(token0x401, now, now, P0, P1));
		await assertThrowsAsync(async () => await auction.addNow(token0x401, 0, P0, P1));
		await assertThrowsAsync(async () => await auction.addNow(token0x401, 60, P1, P0));
		await assertThrowsAsync(async () => await auction.addWith(token0x401, now - 60, now, P0, P1));
		await assertThrowsAsync(async () => await auction.addWith(token0x401, 0, now + 60, P0, P1));
		await assertThrowsAsync(async () => await auction.addNow(0, 60, P0, P1));
		await assertThrowsAsync(async () => await auction.addNow(token0x401, 60, P0 / 1000, P1 / 1000));
		await assertThrowsAsync(async () => await auction.addNow(token0x401, 60, P0 + 17, P1));
		await assertThrowsAsync(async () => await auction.addNow(token0x401, 60, P0, P1 + 17));
		// adding token to an auction - correct parameters
		await auction.addWith(token0x401, now, now + 60, P0, P1);

		// ensure auction lists this token for sale
		assert(await auction.isTokenOnSale(token0x401), "token 0x401 is not on sale after adding it");

		// remove with wrong parameters - wrong parameters
		await assertThrowsAsync(async () => await auction.remove(0x402));
		await assertThrowsAsync(async () => await auction.remove(token0x401, {from: accounts[2]}));
		// removing token from an auction - correct parameters
		await auction.remove(token0x401, {from: accounts[1]});

		// ensure auction doesn't list this token anymore
		assert(!await auction.isTokenOnSale(token0x401), "token 0x401 is still on sale after removing it");
	});
	it("auction: putting up for sale – permissions", async () => {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// define add and remove function
		const f = async (i) => {
			// allow auction to transfer token on behalf of account 1
			await tk.approve(auction.address, token0x401, {from: accounts[1]});
			// add to an auction
			await auction.addNow(token0x401, 600, P0, P1, {from: accounts[i]});
			// remove from an auction
			await auction.remove(token0x401, {from: accounts[i]});
		};

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// adding/removing is not possible without features set
		await assertThrowsAsync(f, 0);
		await assertThrowsAsync(f, 1);
		await assertThrowsAsync(f, 2);

		// to list a token in the auction FEATURE_ADD is required, but its not enough
		await auction.updateFeatures(FEATURE_ADD);

		// adding/removing is still not possible
		await assertThrowsAsync(f, 0);
		await assertThrowsAsync(f, 1);
		await assertThrowsAsync(f, 2);

		// to list a token in the auction transfers on behalf feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// account 0 is ROLE_AUCTION_MANAGER initially and can operate
		await f(0);
		// account 1 is owner and can operate
		await f(1);
		// account 2 cannot operate
		await assertThrowsAsync(f, 2);

		// granting account 2 ROLE_AUCTION_MANAGER permission allows it to operate
		await auction.addOperator(accounts[2], ROLE_AUCTION_MANAGER);

		// account 2 is now ROLE_AUCTION_MANAGER and can operate
		await f(2);
	});
	it("auction: putting up for sale - approve() + addNow()", async () => {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction transfers on behalf feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction
		await auction.addNow(token0x401, 60, P0, P1);

		// ensure auction lists this token for sale
		assert(await auction.isTokenOnSale(token0x401), "token 0x401 is not on sale after adding it");
	});
	it("auction: putting up for sale - safeTransferFrom()", async () => {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// construct auction parameters
		const tokenId = web3.toBigNumber(token0x401);
		const t0 = new Date().getTime() / 1000 | 0;
		const t1 = t0 + 60;
		const p0 = web3.toWei(1, "ether"); // price starts at 1 ether
		const p1 = web3.toWei(1, "finney"); // and drops to 1 finney
		const gWei = 1000000000;
		const two = web3.toBigNumber(2);
		const data = toBytes(two.pow(224).times(tokenId)
			.plus(two.pow(192).times(t0))
			.plus(two.pow(160).times(t1))
			.plus(two.pow(80).times(p0))
			.plus(p1));

		// account 1 transfers token to an auction automatically activating it
		await tk.safeTransferFrom(accounts[1], auction.address, token0x401, data, {from: accounts[1]});

		// ensure auction lists this token for sale
		assert(await auction.isTokenOnSale(token0x401), "token 0x401 is not on sale after adding it");

		// ensure previous owner is kept correct
		assert.equal(accounts[1], await auction.owners(token0x401), "token 0x401 has wrong owner in the auction");

		// read sale status data
		const status = await auction.getTokenSaleStatus(token0x401);
		// extract the data
		const _t0 = status.dividedToIntegerBy(two.pow(192)).toNumber();
		const _t1 = status.dividedToIntegerBy(two.pow(160)).modulo(two.pow(32)).toNumber();
		const _p0 = status.dividedToIntegerBy(two.pow(96)).modulo(two.pow(32)).toNumber();
		const _p1 = status.dividedToIntegerBy(two.pow(64)).modulo(two.pow(32)).toNumber();

		// check the data returned back from an auction is correct
		assert.equal(t0, _t0, "wrong t0 after putting item up for sale");
		assert.equal(t1, _t1, "wrong t1 after putting item up for sale");
		assert.equal(p0 / gWei, _p0, "wrong p0 after putting item up for sale");
		assert.equal(p1 / gWei, _p1, "wrong p1 after putting item up for sale");
	});
	it("auction: putting up and removing from sale", async () => {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction transfers on behalf feature is required
		// to remove a token from an auction transfers feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction
		await auction.addNow(token0x401, 60, P0, P1);

		// ensure auction lists this token for sale
		assert(await auction.isTokenOnSale(token0x401), "token 0x401 is not on sale after adding it");

		// removing token from an auction
		await auction.remove(token0x401);

		// ensure auction doesn't list this token anymore
		assert(!await auction.isTokenOnSale(token0x401), "token 0x401 is still on sale after removing it");
	});

	it("auction: selling, buying, adding, removing lifecycle", async () => {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction FEATURE_ADD is required
		// to buy a token from an auction FEATURE_BUY is required
		await auction.updateFeatures(FEATURE_ADD | FEATURE_BUY);
		// to list a token in the auction transfers on behalf feature is required
		// to remove a token from an auction transfers feature is required
		// to buy a token from an auction transfers feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// account 1 wants to sell its token on the auction
		const p0 = web3.toWei(1, "ether"); // price starts at 1 ether
		const p1 = web3.toWei(1, "finney");  // and drops to 1 finney
		const duration = 60; // in 1 minute (60 seconds)
		const offset = 30; // starting in 30 seconds
		// auction will start in one second
		const t0 = offset + new Date().getTime() / 1000 | 0;
		const t1 = t0 + duration;

		// adding token to an auction
		await auction.addWith(token0x401, t0, t1, p0, p1);

		// check that the price is p0
		assert.equal(p0, await auction.getCurrentPrice(token0x401), "wrong initial price for token 0x401");

		// check few transactions are not possible with wrong parameters
		await assertThrowsAsync(async () => await auction.getCurrentPrice(0x402));
		await assertThrowsAsync(async () => await auction.buy(0x402, {from: accounts[2], value: p0}));

		// skip one second for auction to start
		await increaseTime(offset);

		// saving current account 1 and 2 balances
		const balance1 = await web3.eth.getBalance(accounts[1]);
		const balance2 = await web3.eth.getBalance(accounts[2]);

		// account 2 wants to buy that token from the auction
		const tx = await auction.buy(token0x401, {from: accounts[2], value: p0});
		// find out what was the real auction price
		const p = tx.logs[0].args.p;
		// how much gas account 2 spent for the transaction
		const gasUsed = tx.receipt.gasUsed;

		// account 1 is expected to increase balance by p
		const expectedBalance1 = balance1.plus(p);
		// account 2 is expected in decrease balance by p plus gas used
		const expectedBalance2 = balance2.minus(p).minus(gasUsed);

		// check the value was transferred properly from account 2 to account 1
		assert(expectedBalance1.eq(await web3.eth.getBalance(accounts[1])), "wrong account 1 balance after selling a gem on auction");
		assert(expectedBalance2.eq(await web3.eth.getBalance(accounts[2])), "wrong account 2 balance after buying a gem on auction");

		// ensure token has correct owner
		assert.equal(accounts[2], await tk.ownerOf(token0x401), "wrong token 0x401 owner after selling it on auction");

		// ensure token has no approved addresses on it
		assert.equal(0, await tk.approvals(token0x401), "token 0x401 still has approved address on it");

		// ensure auction doesn't list this token anymore
		assert(!await auction.isTokenOnSale(token0x401), "token 0x401 is still on sale after it was already bought");

		// account 2 decides to sell this token on the auction
		await tk.approve(auction.address, token0x401, {from: accounts[2]});
		await auction.addNow(token0x401, duration, p0, p1, {from: accounts[2]});

		// now wait till auction ends
		await increaseTime(duration);
		// ensure the price reached its minimum
		assert.equal(p1, await auction.getCurrentPrice(token0x401), "wrong final price for token 0x401");
		// wait more
		await increaseTime(duration);
		// and check price again
		assert.equal(p1, await auction.getCurrentPrice(token0x401), "wrong final price for token 0x401 (waited twice)");

		// account 3 buys the gem on auction
		await auction.buy(token0x401, {from: accounts[3], value: p1});

		// ensure token has correct owner
		assert.equal(accounts[3], await tk.ownerOf(token0x401), "wrong token 0x401 owner after second sell on the auction");

		// account 3 decides to sell this token on the auction
		await tk.approve(auction.address, token0x401, {from: accounts[3]});
		await auction.addNow(token0x401, duration, p0, p1, {from: accounts[3]});

		// ensure auction lists this token for sale
		assert(await auction.isTokenOnSale(token0x401), "token 0x401 is not on sale after adding it");

		// account 3 changes his mind and removes token from sale
		await auction.remove(token0x401, {from: accounts[3]});

		// ensure auction doesn't list this token anymore
		assert(!await auction.isTokenOnSale(token0x401), "token 0x401 is still on sale after removing it");
	});

	it("auction: selling, buying, adding, removing - using safeTransferFrom()", async () => {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction FEATURE_ADD is required
		// to buy a token from an auction FEATURE_BUY is required
		await auction.updateFeatures(FEATURE_ADD | FEATURE_BUY);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		// to remove a token from an auction transfers feature is required
		// to buy a token from an auction transfers feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// construct auction parameters
		const tokenId = web3.toBigNumber(token0x401);
		const t0 = new Date().getTime() / 1000 | 0;
		const t1 = t0 + 300;
		const p0 = web3.toWei(1, "ether"); // price starts at 1 ether
		const p1 = web3.toWei(1, "finney"); // and drops to 1 finney
		const two = web3.toBigNumber(2);
		const data = toBytes(two.pow(224).times(tokenId)
			.plus(two.pow(192).times(t0))
			.plus(two.pow(160).times(t1))
			.plus(two.pow(80).times(p0))
			.plus(p1));

		// account 1 transfers token to an auction automatically activating it
		await tk.safeTransferFrom(accounts[1], auction.address, token0x401, data, {from: accounts[1]});

		// set 1% transaction fee on the auction to account 3
		await auction.setFeeAndBeneficiary(1, 100, accounts[3]);

		// saving current accounts 1, 2 and 3 balances
		const balance1 = await web3.eth.getBalance(accounts[1]);
		const balance2 = await web3.eth.getBalance(accounts[2]);
		const balance3 = await web3.eth.getBalance(accounts[3]);

		// account 2 buys that token from an auction
		const tx = await auction.buy(token0x401, {from: accounts[2], value: p0});
		// find out what was the real auction price
		const p = tx.logs[0].args.p;
		// find out what was the transaction fee
		const fee = tx.logs[0].args.fee;
		// how much gas account 2 spent for the transaction
		const gasUsed = tx.receipt.gasUsed;

		// check the fee is 1%
		assert(fee.eq(p.dividedToIntegerBy(100)), "wrong transaction fee");

		// we expect account 1 to get p minus fee after buying a token
		assert(balance1.plus(p).minus(fee).eq(await web3.eth.getBalance(accounts[1])), "account 1 has wrong balance after selling a token");
		// we expect account 2 to spend p + gasUsed after buying a token
		assert(balance2.minus(p).minus(gasUsed).eq(await web3.eth.getBalance(accounts[2])), "account 2 has wrong balance after buying a token");
		// we expect account 3 to get the fee after successful sale
		assert(balance3.plus(fee).eq(await web3.eth.getBalance(accounts[3])), "account 3 has wrong balance after successful sale");
	});

	it("auction: transaction fees", async () => {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction FEATURE_ADD is required
		// to buy a token from an auction FEATURE_BUY is required
		await auction.updateFeatures(FEATURE_ADD | FEATURE_BUY);
		// to list a token in the auction transfers on behalf feature is required
		// to buy a token from an auction transfers feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// account 3 will try to set transaction fee and beneficiary
		const f1 = async () => await auction.setFee(1, 100, {from: accounts[3]});
		const f2 = async () => await auction.setBeneficiary(accounts[0], {from: accounts[3]});
		const f3 = async () => await auction.setFeeAndBeneficiary(1, 100, accounts[0], {from: accounts[3]});

		// transaction fee and beneficiary cannot be set without a permission
		await assertThrowsAsync(f1);
		await assertThrowsAsync(f2);
		await assertThrowsAsync(f3);

		// grant account 3 role ROLE_FEE_MANAGER required
		await auction.addOperator(accounts[3], ROLE_FEE_MANAGER);

		// try again, should work now
		await f1();
		await f2();
		await f3();

		// issue a token token0x401 to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// add token to an auction, to prevent price change - delay start by 60 seconds
		const now = new Date().getTime() / 1000 | 0;
		const price = web3.toWei(1, "finney");
		await auction.addWith(token0x401, now + 300, now + 3000, price, 0);

		// keep record of balances of interest
		const balance0 = await web3.eth.getBalance(accounts[0]); // beneficiary
		const balance1 = await web3.eth.getBalance(accounts[1]); // token seller
		const balance2 = await web3.eth.getBalance(accounts[2]); // token buyer

		// ensure the price has not been changed
		assert.equal(price, await auction.getCurrentPrice(token0x401), "token price has changed!");

		// buy token on an auction
		const tx = await auction.buy(token0x401, {from: accounts[2], value: price});
		// how much gas account 2 spent to buy the token
		const gasUsed = tx.receipt.gasUsed;

		// beneficiary's balance is expected to increase by 1% of the price
		assert(
			balance0.plus(price / 100).eq(await web3.eth.getBalance(accounts[0])),
			"wrong beneficiary's balance after the token transfer on the auction"
		);
		// seller's balance is expected to increase by 99% of the price
		assert(
			balance1.plus(99 * price / 100).eq(await web3.eth.getBalance(accounts[1])),
			"wrong seller's balance after the token transfer on the auction"
		);
		// buyer's balance is expected to decrease by token price plus gas fees
		assert(
			balance2.minus(price).minus(gasUsed).eq(await web3.eth.getBalance(accounts[2])),
			"wrong buyer's balance after the token transfer on the auction"
		);
	});

	it("auction: token sale status", async () => {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction transfers on behalf feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token token0x401 to account 1
		await mint0x401(tk, accounts);
		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// add token to an auction, to prevent price change - delay start by 300 seconds
		const now = new Date().getTime() / 1000 | 0;
		const t0 = now + 300;
		const t1 = now + 3000;
		const p0 = web3.toBigNumber(web3.toWei(1, "ether"));
		const p1 = web3.toBigNumber(web3.toWei(1, "finney"));
		const p0_Gwei = p0.dividedToIntegerBy(1000000000);
		const p1_Gwei = p1.dividedToIntegerBy(1000000000);
		// initially token sale status is zero
		assert.equal(0, await auction.getTokenSaleStatus(token0x401), "wrong initial token sale status (no token listed)");
		// add to the auction
		await auction.addWith(token0x401, t0, t1, p0, p1);

		// read sale status data again
		const status = await auction.getTokenSaleStatus(token0x401);
		// auxiliary numbers
		const two = web3.toBigNumber(2);
		// extract the data
		const _t0 = status.dividedToIntegerBy(two.pow(192)).toNumber();
		const _t1 = status.dividedToIntegerBy(two.pow(160)).modulo(two.pow(32)).toNumber();
		const t = status.dividedToIntegerBy(two.pow(128)).modulo(two.pow(32)).toNumber();
		const _p0 = status.dividedToIntegerBy(two.pow(96)).modulo(two.pow(32)).toNumber();
		const _p1 = status.dividedToIntegerBy(two.pow(64)).modulo(two.pow(32)).toNumber();
		const p = status.dividedToIntegerBy(two.pow(32)).modulo(two.pow(32)).toNumber();
		const fee = status.modulo(two.pow(32)).toNumber();

		// validate the status is as expected
		assert.equal(t0, _t0, "wrong t0");
		assert.equal(t1, _t1, "wrong t1");
		assert.equal(p0_Gwei, _p0, "wrong p0");
		assert.equal(p1_Gwei, _p1, "wrong p1");
		assert.equal(p0_Gwei, p, "wrong p");
		assert.equal(0, fee, "wrong fee (not zero)");

		// set the fee to maximum - 5%
		await auction.setFeeAndBeneficiary(5, 100, accounts[0]);
		// read the fee again
		const fee1 = (await auction.getTokenSaleStatus(token0x401)).modulo(two.pow(32)).toNumber();
		// validate new fee
		assert.equal(p0_Gwei.dividedToIntegerBy(20), fee1, "wrong fee (not 5%)");

		// move time to the end of an auction
		await increaseTime(3600);

		// read current price and fee again
		const status2 = await auction.getTokenSaleStatus(token0x401);
		const p2 = status2.dividedToIntegerBy(two.pow(32)).modulo(two.pow(32)).toNumber();
		const fee2 = status2.modulo(two.pow(32)).toNumber();

		// check the price and fee changed accordingly
		assert.equal(p1_Gwei, p2, "wrong final auction price");
		assert.equal(p1_Gwei.dividedToIntegerBy(20), fee2, "wrong final fee (not 5%)");
	});
});

// converts BigNumber representing Solidity uint256 into String representing Solidity bytes
function toBytes(uint256) {
	let s = uint256.toString(16);
	const len = s.length;
	// 256 bits must occupy exactly 64 hex digits
	if(len > 64) {
		s = s.substr(0, 64);
	}
	for(let i = 0; i < 64 - len; i++) {
		s = "0" +s;
	}
	return "0x" + s;
}

async function assertThrowsAsync(fn, ...args) {
	let f = () => {};
	try {
		await fn(args);
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

