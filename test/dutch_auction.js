const ROLE_AUCTION_STAFF = 0x00000001;
const ROLE_AUCTION_MANAGER = 0x00000003;
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

contract('Dutch Auction', function(accounts) {
	it("auction: testing wrong parameters", async function() {
		// zero address token
		await assertThrowsAsync(async () => await Auction.new(0));
		// invalid ERC721  token
		await assertThrowsAsync(async () => await Auction.new(accounts[0]));

		const tk = await Token.new();
		const auction = await Auction.new(tk.address);
		const now = new Date().getTime() / 1000;

		// to list a token in the auction transfers on behalf feature is required
		// to buy a token from an auction transfers feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction - wrong parameters
		await assertThrowsAsync(async () => await auction.addWith(token0x401, now, now + 60, 100, 200));
		await assertThrowsAsync(async () => await auction.addWith(token0x401, now, now, 200, 100));
		await assertThrowsAsync(async () => await auction.add(token0x401, 0, 200, 100));
		await assertThrowsAsync(async () => await auction.add(token0x401, 60, 100, 200));
		await assertThrowsAsync(async () => await auction.addWith(token0x401, now - 60, now, 200, 100));
		await assertThrowsAsync(async () => await auction.addWith(token0x401, 0, now + 60, 200, 100));
		await assertThrowsAsync(async () => await auction.add(0, 60, 200, 100));
		// adding token to an auction - correct parameters
		await auction.addWith(token0x401, now, now + 60, 200, 100);

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
	it("auction: putting up for sale", async function() {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction transfers on behalf feature is required
		// to buy a token from an auction transfers feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction
		await auction.add(token0x401, 60, 200, 100);

		// ensure auction lists this token for sale
		assert(await auction.isTokenOnSale(token0x401), "token 0x401 is not on sale after adding it");
	});
	it("auction: putting up and removing from sale", async function() {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction transfers on behalf feature is required
		// to buy a token from an auction transfers feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction
		await auction.add(token0x401, 60, 200, 100);

			// ensure auction lists this token for sale
		assert(await auction.isTokenOnSale(token0x401), "token 0x401 is not on sale after adding it");

		// removing token from an auction
		await auction.remove(token0x401);

		// ensure auction doesn't list this token anymore
		assert(!await auction.isTokenOnSale(token0x401), "token 0x401 is still on sale after removing it");
	});

	it("auction: selling, buying, adding, removing lifecycle", async function() {
		const tk = await Token.new();
		const auction = await Auction.new(tk.address);

		// to list a token in the auction transfers on behalf feature is required
		// to buy a token from an auction transfers feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// account 1 wants to sell its token on the auction
		const p0 = web3.toWei(1, "finney"); // price starts at 1 finney
		const p1 = web3.toWei(1, "szabo");  // and drops to 1 szabo
		const duration  = 60; // in 1 minutes (60 seconds)
		const offset = 1; // starting in 1 second
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
		const account1Balance = await web3.eth.getBalance(accounts[1]);
		const account2Balance = await web3.eth.getBalance(accounts[2]);

		// account 2 wants to buy that token from the auction
		const tx = await auction.buy(token0x401, {from: accounts[2], value: p0});
		// find out what was the real auction price
		const p = tx.logs[0].args.p;
		// how much gas account 2 spent for the transaction
		const gasUsed = tx.receipt.gasUsed;

		// account 1 is expected to increase balance by p
		const account1ExpectedBalance = account1Balance.plus(p);
		// account 2 is expected in decrease balance by p plus gas used
		const account2ExpectedBalance = account2Balance.minus(p).minus(gasUsed);

		// check the value was transferred properly from account 2 to account 1
		assert(account1ExpectedBalance.eq(await web3.eth.getBalance(accounts[1])), "wrong account 1 balance after selling a gem on auction");
		assert(account2ExpectedBalance.eq(await web3.eth.getBalance(accounts[2])), "wrong account 2 balance after buying a gem on auction");

		// ensure token has correct owner
		assert.equal(accounts[2], await tk.ownerOf(token0x401), "wrong token 0x401 owner after selling it on auction");

		// ensure token has no approved addresses on it
		assert.equal(0, await tk.approvals(token0x401), "token 0x401 still has approved address on it");

		// ensure auction doesn't list this token anymore
		assert(!await auction.isTokenOnSale(token0x401), "token 0x401 is still on sale after it was already bought");

		// account 2 decides to sell this token on the auction
		await tk.approve(auction.address, token0x401, {from: accounts[2]});
		await auction.add(token0x401, duration, p0, p1, {from: accounts[2]});

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
		await auction.add(token0x401, duration, p0, p1, {from: accounts[3]});

		// ensure auction lists this token for sale
		assert(await auction.isTokenOnSale(token0x401), "token 0x401 is not on sale after adding it");

		// account 3 changes his mind and removes token from sale
		await auction.remove(token0x401, {from: accounts[3]});

		// ensure auction doesn't list this token anymore
		assert(!await auction.isTokenOnSale(token0x401), "token 0x401 is still on sale after removing it");
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

