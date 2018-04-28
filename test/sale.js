const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000008;

const ROLE_TOKEN_CREATOR = 0x00000010;
const ROLE_STATE_PROVIDER = 0x00000080;
const ROLE_ROLE_MANAGER = 0x01000000;
const ROLE_FEATURE_MANAGER = 0x08000000;

const FULL_PRIVILEGES_MASK = 0xFFFFFFFF;

const Token = artifacts.require("./Token");
const Sale = artifacts.require("./GeodeSale");

contract('GeodeSale', function(accounts) {
	it("geode sale: it is possible to buy geode", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[10]);

		assert.equal(0, await token.balanceOf(accounts[0]), "initial token balance is not zero");
		assert.equal(0, await token.totalSupply(), "initial token total supply is not zero");

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.createOperator(sale.address, ROLE_TOKEN_CREATOR);
		await sale.getGeodes.sendTransaction({value: await sale.GEODE_PRICE()});

		assert(await token.balanceOf(accounts[0]) > 0, "wrong token balance after selling geode");
		assert(await token.totalSupply() > 0, "wrong token total supply after selling geode");
	});
	it("geode sale: it is possible to buy 4 geodes", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[10]);

		assert.equal(0, await token.balanceOf(accounts[0]), "initial token balance is not zero");
		assert.equal(0, await token.totalSupply(), "initial token total supply is not zero");

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.createOperator(sale.address, ROLE_TOKEN_CREATOR);
		await sale.getGeodes.sendTransaction({value: 4 * (await sale.GEODE_PRICE())});

		assert(await token.balanceOf(accounts[0]) > 0, "wrong token balance after selling geode");
		assert(await token.totalSupply() > 0, "wrong token total supply after selling geode");
	});
	it("geode sale: it is possible to buy few geodes and get a change", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[10]);

		assert.equal(0, await token.balanceOf(accounts[0]), "initial token balance is not zero");
		assert.equal(0, await token.totalSupply(), "initial token total supply is not zero");

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.createOperator(sale.address, ROLE_TOKEN_CREATOR);
		await sale.getGeodes.sendTransaction({value: 2.34 * (await sale.GEODE_PRICE())});

		assert(await token.balanceOf(accounts[0]) > 0, "wrong token balance after selling geode");
		assert(await token.totalSupply() > 0, "wrong token total supply after selling geode");
		// TODO: check that the change was returned back
	});
	it("geode sale: gems created from the geode have correct amount and owner", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[10]);

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.createOperator(sale.address, ROLE_TOKEN_CREATOR);
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
		const sale = await Sale.new(token.address, accounts[10]);

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.createOperator(sale.address, ROLE_TOKEN_CREATOR);
		await sale.getGeodes.sendTransaction({from: accounts[1], value: await sale.GEODE_PRICE()});

		const gemNumber10 = await sale.createdGems(1, 10);
		const gemId = gemNumber10.modulo(256);
		const blockId = gemNumber10.dividedToIntegerBy(256).modulo(256 * 256);
		const plotId = gemNumber10.dividedToIntegerBy(16777216).modulo(16777216);
		assert.equal(0xA, gemId, "gemId coordinate is wrong");
		assert.equal(0, blockId, "blockId coordinate is wrong");
		assert.equal(1, plotId, "plotId coordinate is wrong");
	});
	it("geode sale: iterate over the gems bought from few geodes", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[10]);

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.createOperator(sale.address, ROLE_TOKEN_CREATOR);
		// buy n geodes (n * GEMS_IN_GEODE gems)
		const n = 4;
		const GEMS_IN_GEODE = await sale.GEMS_IN_GEODE();
		const GEODE_PRICE = await sale.GEODE_PRICE();
		await sale.getGeodes.sendTransaction({from: accounts[1], value: n * GEODE_PRICE});

		for(let i = 0; i < n * GEMS_IN_GEODE; i++) {
			const gemUid = await token.collections(accounts[1], i);
			const gemId = gemUid.modulo(256);
			const blockId = gemUid.dividedToIntegerBy(256).modulo(256 * 256);
			const plotId = gemUid.dividedToIntegerBy(16777216).modulo(16777216);
			assert.equal(1 + i % GEMS_IN_GEODE, gemId, "gemId coordinate is wrong");
			assert.equal(0, blockId, "blockId coordinate is wrong");
			assert.equal(1 + Math.floor(i / GEMS_IN_GEODE), plotId, "plotId coordinate is wrong");
		}
	});
	it("geode sale: gems created from the geode contain 5 gems of the same color", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[10]);

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.createOperator(sale.address, ROLE_TOKEN_CREATOR);
		const GEMS_IN_GEODE = await sale.GEMS_IN_GEODE();
		const GEODE_PRICE = await sale.GEODE_PRICE();
		await sale.getGeodes.sendTransaction({from: accounts[1], value: GEODE_PRICE});

		// counters for each color occurrence in the geode
		const colors = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		for(let i = 0; i < GEMS_IN_GEODE; i++) {
			const gemUid = await token.collections(accounts[1], i);
			const colorId = gemUid.dividedToIntegerBy(4294967296).dividedToIntegerBy(4294967296).modulo(256);
			colors[colorId.toNumber() - 1]++;
		}
		let maxColors = 0;
		for(let i = 0; i < colors.length; i++) {
			if(maxColors < colors[i]) {
				maxColors = colors[i];
			}
		}
		assert(maxColors >= 5, "there are no 5 gems of the same color");
	});
	it("geode sale: gems created from the geode contain 1 gem of the grade A", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[10]);

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.createOperator(sale.address, ROLE_TOKEN_CREATOR);
		const GEMS_IN_GEODE = await sale.GEMS_IN_GEODE();
		const GEODE_PRICE = await sale.GEODE_PRICE();
		await sale.getGeodes.sendTransaction({from: accounts[1], value: GEODE_PRICE});

		let gradeAFound = false;
		for(let i = 0; i < GEMS_IN_GEODE; i++) {
			const gemUid = await token.collections(accounts[1], i);
			const gradeType = gemUid.dividedToIntegerBy(4294967296).dividedToIntegerBy(16777216).modulo(256);
			if(gradeType == 4) {
				gradeAFound = true;
			}
		}

		assert(gradeAFound, "there is no grade A gem in the collection");
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
