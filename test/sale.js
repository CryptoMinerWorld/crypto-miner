const PERM_TRANSFER      = 0x00000001;
const PERM_APPROVE       = 0x00000002;
const PERM_APPROVE_ALL   = 0x00000004;
const PERM_TRANSFER_FROM = 0x00000008;
const PERM_MINT          = 0x00000010;
const PERM_BURN          = 0x00000020;
const PERM_UPDATE_LOCK   = 0x00000040;
const PERM_UPDATE_ENERGY = 0x00000080;
const PERM_UPDATE_STATE  = 0x00000100;
const PERM_OP_CREATE     = 0x01000000;
const PERM_OP_UPDATE     = 0x02000000;
const PERM_OP_DELETE     = 0x04000000;
const PERM_UPDATE_GLOBAL = 0x08000000;
const PERM_FULL          = 0xFFFFFFFF;

const Token = artifacts.require("./Token");
const Sale = artifacts.require("./GeodeSale");

contract('GeodeSale', function(accounts) {
	it("geode sale basics: it is possible to buy geode", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address);

		assert.equal(await token.balanceOf(accounts[0]), 0, "initial token balance is not zero");
		assert.equal(await token.totalSupply(), 0, "initial token total supply is not zero");

		await token.updateFeatures(PERM_OP_CREATE | PERM_MINT);
		await token.createOperator(sale.address, PERM_MINT);
		await sale.getGeodes.sendTransaction({value: 100000000000000000});

		assert(await token.balanceOf(accounts[0]) > 0, "wrong token balance after selling geode");
		assert(await token.totalSupply() > 0, "wrong token total supply after selling geode");
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
