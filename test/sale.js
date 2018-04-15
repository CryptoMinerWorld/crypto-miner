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
	it("geode sale: it is possible to buy geode", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address);

		assert.equal(0, await token.balanceOf(accounts[0]), "initial token balance is not zero");
		assert.equal(0, await token.totalSupply(), "initial token total supply is not zero");

		await token.updateFeatures(PERM_OP_CREATE | PERM_MINT);
		await token.createOperator(sale.address, PERM_MINT);
		await sale.getGeodes.sendTransaction({value: await sale.GEODE_PRICE()});

		assert(await token.balanceOf(accounts[0]) > 0, "wrong token balance after selling geode");
		assert(await token.totalSupply() > 0, "wrong token total supply after selling geode");
	});
	it("geode sale: gems created from the geode have correct amount and owner", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address);

		await token.updateFeatures(PERM_OP_CREATE | PERM_MINT);
		await token.createOperator(sale.address, PERM_MINT);
		await sale.getGeodes.sendTransaction({from: accounts[1], value: await sale.GEODE_PRICE()});

		const gemsInGeode = (await sale.GEMS_IN_GEODE()).toNumber();

		assert.equal(gemsInGeode, await token.totalSupply(), "wrong number of gems in geode");
		assert.equal(gemsInGeode, await token.balanceOf(accounts[1]), "wrong number of gems on account");

		const gemNumber15 = await sale.createdGems(1, 15);

		assert(await token.exists(gemNumber15), "gem #15 doesn't exist!");
		assert.equal(accounts[1], await token.ownerOf(gemNumber15), "gem #15 has wrong owner");
	});
	it("geode sale: gems created from the geode have correct coordinates", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address);

		await token.updateFeatures(PERM_OP_CREATE | PERM_MINT);
		await token.createOperator(sale.address, PERM_MINT);
		await sale.getGeodes.sendTransaction({from: accounts[1], value: await sale.GEODE_PRICE()});

		const gemNumber10 = await sale.createdGems(1, 10);
		const gemId = gemNumber10.modulo(256);
		const blockId = gemNumber10.dividedToIntegerBy(256).modulo(256 * 256);
		const plotId = gemNumber10.dividedToIntegerBy(256 * 256 * 256).modulo(256 * 256 * 256);
		assert.equal(0xA, gemId, "gemId coordinate is wrong");
		assert.equal(0, blockId, "blockId coordinate is wrong");
		assert.equal(1, plotId, "blockId coordinate is wrong");
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
