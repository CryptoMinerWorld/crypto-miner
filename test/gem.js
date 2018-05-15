const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
const ROLE_TOKEN_CREATOR = 0x00040000;

const Token = artifacts.require("./GemERC721.sol");

contract('GemERC721', function(accounts) {
	it("initial state: no tokens exist initially", async function() {
		const tk = await Token.new();
		assert.equal(0, await tk.totalSupply(), "wrong initial totalSupply value");
		assert.equal(0, await tk.balanceOf(accounts[0]), "wrong initial totalSupply value");
	});

	it("mint: creating a token", async function() {
		const tk = await Token.new();
		await assertThrowsAsync(async function() {await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 0x0101);});
		await tk.updateFeatures(ROLE_TOKEN_CREATOR);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 0x0101);
		assert.equal(1, await tk.totalSupply(), "wrong totalSupply value after minting a token");
		await tk.mint(accounts[1], 0x402, 1, 0, 1, 1, 1, 0x0101);
		assert.equal(2, await tk.totalSupply(), "wrong totalSupply value after minting two tokens");
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " has wrong balance after minting a token");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " has wrong balance after minting a token");
		assert.equal(0, await tk.balanceOf(accounts[2]), accounts[2] + " has wrong initial balance");
	});

	it("transfer: transferring a token", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR);
		await tk.mint(accounts[0], 0x401, 1, 0, 1, 1, 1, 0x0101);
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance before token transfer");
		assert.equal(0, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		await assertThrowsAsync(async function() {await tk.transferToken(accounts[1], 0x401);});
		await tk.updateFeatures(FEATURE_TRANSFERS | ROLE_TOKEN_CREATOR);
		await tk.transferToken(accounts[1], 0x401);
		assert.equal(0, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance after token transfer");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
	});

	it("transferFrom: transferring on behalf", async function() {
		const tk = await Token.new();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[1], 0x401, 1, 0, 1, 1, 1, 0x0101);
		await tk.mint(accounts[0], 0x402, 1, 0, 1, 1, 1, 0x0101);
		await assertThrowsAsync(async function() {await tk.approveToken(accounts[0], 0x401);});
		await assertThrowsAsync(async function() {await tk.transferTokenFrom(accounts[1], accounts[2], 0x401);});
		await tk.approveToken.sendTransaction(accounts[0], 0x401, {from: accounts[1]});
		await tk.transferTokenFrom(accounts[1], accounts[2], 0x401);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await assertThrowsAsync(async function() {await tk.transferTokenFrom(accounts[0], accounts[1], 0x402);});
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await tk.transferTokenFrom(accounts[0], accounts[1], 0x402);
		assert.equal(accounts[1], await tk.ownerOf(0x402), "wrong token 0x402 owner after transfer on behalf");
		assert.equal(accounts[2], await tk.ownerOf(0x401), "wrong token 0x401 owner after transfer on behalf");
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
