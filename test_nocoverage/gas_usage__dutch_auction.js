const FEATURE_ADD = 0x00000001;
const FEATURE_BUY = 0x00000002;
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

contract('Dutch Auction: Gas Usage', accounts => {
	// 189724 - without optimizer
	// 181021 - with optimizer
	it("auction: putting up for sale - approve() + addNow() - consumes 181021 gas", async () => {
		const tk = await Token.new();
		const auction = await Auction.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(tk.address, true);
		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction transfers on behalf feature is required
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		const tx1 = await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction
		const tx2 = await auction.addNow(tk.address, token0x401, 60, P0, P1);

		// calculate total gas usage
		const gasUsed = tx1.receipt.gasUsed + tx2.receipt.gasUsed;

		// ensure gas used is in reasonable bounds
		assertEqual(181021, gasUsed, "putting gem for sale gas usage mismatch: " + gasUsed);
	});
	// 151604 - without optimizer
	// 142385 - with optimizer
	it("auction: putting up for sale - safeTransferFrom() - consumes 142385 gas", async () => {
		const tk = await Token.new();
		const auction = await Auction.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(tk.address, true);
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
		const two = web3.toBigNumber(2);
		const data = toBytes(two.pow(224).times(tokenId)
			.plus(two.pow(192).times(t0))
			.plus(two.pow(160).times(t1))
			.plus(two.pow(80).times(p0))
			.plus(p1));

		// account 1 transfers token to an auction automatically activating it
		const tx = await tk.safeTransferFrom(accounts[1], auction.address, token0x401, data, {from: accounts[1]});

		// get the gas usage
		const gasUsed = tx.receipt.gasUsed;

		// ensure gas used is in reasonable bounds
		assertEqual(142385, gasUsed, "putting gem for sale gas usage mismatch: " + gasUsed);
	});
	// 95394 - without optimizer
	// 65502 - with optimizer
	it("auction: buying on an auction before it starts - consumes 65502 gas", async () => {
		const tk = await Token.new();
		const auction = await Auction.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(tk.address, true);
		// to list a token in the auction FEATURE_ADD is required
		// to buy a token from an auction FEATURE_BUY is required
		await auction.updateFeatures(FEATURE_ADD | FEATURE_BUY);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// current time
		const now = new Date().getTime() / 1000 | 0;

		// adding token to an auction
		await auction.addWith(tk.address, token0x401, now + 600, now + 6000, P0, P1);

		// account 2 buys that token on an auction
		const tx = await auction.buy(tk.address, token0x401, {from: accounts[2], value: P0});

		// get the gas usage
		const gasUsed = tx.receipt.gasUsed;

		// ensure gas used is in reasonable bounds
		assertEqual(65502, gasUsed, "buying gem on an auction gas usage mismatch: " + gasUsed);
	});
	// 95432 - without optimizer
	// 65502 - with optimizer
	it("auction: buying on an auction after it ends - consumes 65502 gas", async () => {
		const tk = await Token.new();
		const auction = await Auction.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(tk.address, true);
		// to list a token in the auction FEATURE_ADD is required
		// to buy a token from an auction FEATURE_BUY is required
		await auction.updateFeatures(FEATURE_ADD | FEATURE_BUY);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction
		await auction.addNow(tk.address, token0x401, 60, P0, P1);

		// skip 90 seconds to ensure an auction ends
		await increaseTime(90);

		// account 2 buys that token on an auction
		const tx = await auction.buy(tk.address, token0x401, {from: accounts[2], value: P1});

		// get the gas usage
		const gasUsed = tx.receipt.gasUsed;

		// ensure gas used is in reasonable bounds
		assertEqual(65502, gasUsed, "buying gem on an auction gas usage mismatch: " + gasUsed);
	});
	// 103176 - without optimizer
	// 76324 - with optimizer
	it("auction: buying on an auction in the middle - consumes 76324 gas", async () => {
		const tk = await Token.new();
		const auction = await Auction.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(tk.address, true);
		// to list a token in the auction FEATURE_ADD is required
		// to buy a token from an auction FEATURE_BUY is required
		await auction.updateFeatures(FEATURE_ADD | FEATURE_BUY);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction
		await auction.addNow(tk.address, token0x401, 600, P0, P1);

		// skip 300 seconds to ensure an auction is in the middle
		await increaseTime(300);

		// account 2 buys that token on an auction
		const tx = await auction.buy(tk.address, token0x401, {from: accounts[2], value: P0});

		// get the gas usage
		const gasUsed = tx.receipt.gasUsed;

		// ensure gas used is in reasonable bounds
		assertEqual(76324, gasUsed, "buying gem on an auction gas usage mismatch: " + gasUsed);
	});
	// 82008 - without optimizer
	// 57692 - with optimizer
	it("auction: removing from an auction - consumes 57692 gas", async () => {
		const tk = await Token.new();
		const auction = await Auction.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(tk.address, true);
		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// issue a token to account 1
		await mint0x401(tk, accounts);

		// account 1 is required to allow auction to transfer that token on its behalf
		await tk.approve(auction.address, token0x401, {from: accounts[1]});

		// adding token to an auction
		await auction.addNow(tk.address, token0x401, 60, P0, P1);

		// account 2 buys that token on an auction
		const tx = await auction.remove(tk.address, token0x401);

		// get the gas usage
		const gasUsed = tx.receipt.gasUsed;

		// ensure gas used is in reasonable bounds
		assertEqual(57692, gasUsed, "removing gem from an auction gas usage mismatch: " + gasUsed);
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

// increases time by delta in seconds
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

// asserts equal with precision of 5%
function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, 0.05, actual, msg);
}

// asserts equal with the precisions defined in leeway
function assertEqualWith(expected, leeway, actual, msg) {
	assert(expected * (1 - leeway) < actual && expected * (1 + leeway) > actual, msg);
}
