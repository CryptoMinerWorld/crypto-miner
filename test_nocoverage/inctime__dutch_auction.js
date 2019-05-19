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

contract('Dutch Auction (Time Increase)', accounts => {

	it("auction: token sale status", async () => {
		const tk = await Token.new();
		const auction = await Auction.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(tk.address, true);
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
		assert.equal(0, await auction.getTokenSaleStatus(tk.address, token0x401), "wrong initial token sale status (no token listed)");
		// add to the auction
		await auction.addWith(tk.address, token0x401, t0, t1, p0, p1);

		// read sale status data again
		const status = await auction.getTokenSaleStatus(tk.address, token0x401);
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
		await auction.setFeeAndBeneficiary(5, 100, accounts[0], accounts[1]);
		// read the fee again
		const fee1 = (await auction.getTokenSaleStatus(tk.address, token0x401)).modulo(two.pow(32)).toNumber();
		// validate new fee
		assert.equal(p0_Gwei.dividedToIntegerBy(20), fee1, "wrong fee (not 5%)");

		// move time to the end of an auction
		await increaseTime(3600);

		// read current price and fee again
		const status2 = await auction.getTokenSaleStatus(tk.address, token0x401);
		const p2 = status2.dividedToIntegerBy(two.pow(32)).modulo(two.pow(32)).toNumber();
		const fee2 = status2.modulo(two.pow(32)).toNumber();

		// check the price and fee changed accordingly
		assert.equal(p1_Gwei, p2, "wrong final auction price");
		assert.equal(p1_Gwei.dividedToIntegerBy(20), fee2, "wrong final fee (not 5%)");
	});

	it("auction: selling, buying, adding, removing lifecycle", async () => {
		const tk = await Token.new();
		const auction = await Auction.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(tk.address, true);
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
		await auction.addWith(tk.address, token0x401, t0, t1, p0, p1);

		// check that the price is p0
		assert.equal(p0, await auction.getCurrentPrice(tk.address, token0x401), "wrong initial price for token 0x401");

		// check few transactions are not possible with wrong parameters
		await assertThrows(async () => await auction.getCurrentPrice(tk.address, 0x402));
		await assertThrows(async () => await auction.buy(tk.address, 0x402, {from: accounts[2], value: p0}));

		// skip one second for auction to start
		await increaseTime(offset);

		// saving current account 1 and 2 balances
		const balance1 = await web3.eth.getBalance(accounts[1]);
		const balance2 = await web3.eth.getBalance(accounts[2]);

		// account 2 wants to buy that token from the auction
		const tx = await auction.buy(tk.address, token0x401, {from: accounts[2], value: p0});
		// find out what was the real auction price
		const p = tx.logs[0].args.p;
		// how much gas account 2 spent for the transaction
		const gasUsed = tx.receipt.gasUsed;

		// account 1 is expected to increase balance by p
		const expectedBalance1 = balance1.plus(p);
		// account 2 is expected to decrease balance by p plus gas used
		const expectedBalance2 = balance2.minus(p).minus(gasUsed);

		// check the value was transferred properly from account 2 to account 1
		assert(expectedBalance1.eq(await web3.eth.getBalance(accounts[1])), "wrong account 1 balance after selling a gem on auction");
		assert(expectedBalance2.eq(await web3.eth.getBalance(accounts[2])), "wrong account 2 balance after buying a gem on auction");

		// ensure token has correct owner
		assert.equal(accounts[2], await tk.ownerOf(token0x401), "wrong token 0x401 owner after selling it on auction");

		// ensure token has no approved addresses on it
		assert.equal(0, await tk.approvals(token0x401), "token 0x401 still has approved address on it");

		// ensure auction doesn't list this token anymore
		assert(!await auction.isTokenOnSale(tk.address, token0x401), "token 0x401 is still on sale after it was already bought");

		// account 2 decides to sell this token on the auction
		await tk.approve(auction.address, token0x401, {from: accounts[2]});
		await auction.addNow(tk.address, token0x401, duration, p0, p1, {from: accounts[2]});

		// now wait till auction ends
		await increaseTime(duration);
		// ensure the price reached its minimum
		assert.equal(p1, await auction.getCurrentPrice(tk.address, token0x401), "wrong final price for token 0x401");
		// wait more
		await increaseTime(duration);
		// and check price again
		assert.equal(p1, await auction.getCurrentPrice(tk.address, token0x401), "wrong final price for token 0x401 (waited twice)");

		// account 3 buys the gem on the auction
		await auction.buy(tk.address, token0x401, {from: accounts[3], value: p1});

		// ensure token has correct owner
		assert.equal(accounts[3], await tk.ownerOf(token0x401), "wrong token 0x401 owner after second sell on the auction");

		// account 3 decides to sell this token on the auction
		await tk.approve(auction.address, token0x401, {from: accounts[3]});
		await auction.addNow(tk.address, token0x401, duration, p0, p1, {from: accounts[3]});

		// ensure auction lists this token for sale
		assert(await auction.isTokenOnSale(tk.address, token0x401), "token 0x401 is not on sale after adding it");

		// account 3 changes his mind and removes token from sale
		await auction.remove(tk.address, token0x401, {from: accounts[3]});

		// ensure auction doesn't list this token anymore
		assert(!await auction.isTokenOnSale(tk.address, token0x401), "token 0x401 is still on sale after removing it");
	});

});

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


// import auxiliary function to ensure function `fn` throws
import {assertThrows} from "../scripts/shared_functions";
