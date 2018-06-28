const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_ROLE_MANAGER = 0x10000000;

const Token = artifacts.require("./GemERC721");
const Sale = artifacts.require("./Presale");

contract('Presale', function(accounts) {
	it("geode sale: it is possible to buy geode", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		assert.equal(0, await tk.balanceOf(accounts[0]), "initial token balance is not zero");
		assert.equal(0, await tk.totalSupply(), "initial token total supply is not zero");

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		await sale.getGeodes.sendTransaction({value: await sale.currentPrice()});

		const gemsInGeode = await sale.GEMS_IN_GEODE();
		assert(gemsInGeode.eq(await tk.balanceOf(accounts[0])), "wrong token balance after buying geode");
		assert(gemsInGeode.eq(await tk.totalSupply()), "wrong token total supply after buying geode");
		assert.equal(1, await sale.geodeBalances(accounts[0]), "wrong geode balance after buying one geode");
	});
	it("geode sale: it is possible to buy 5 geodes and get 1 free gem", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		assert.equal(0, await tk.balanceOf(accounts[0]), "initial token balance is not zero");
		assert.equal(0, await tk.totalSupply(), "initial token total supply is not zero");

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		await sale.getGeodes.sendTransaction({value: (await sale.currentPrice()).times(5)});

		const gemsInGeode = await sale.GEMS_IN_GEODE();
		assert(gemsInGeode.times(5).plus(1).eq(await tk.balanceOf(accounts[0])), "wrong token balance after buying 5 geodes");
		assert(gemsInGeode.times(5).plus(1).eq(await tk.totalSupply()), "wrong token total supply after buying 5 geodes");
	});
	it("geode sale: it is possible to buy 10 geodes and get 1 free geode", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		assert.equal(0, await tk.balanceOf(accounts[0]), "initial token balance is not zero");
		assert.equal(0, await tk.totalSupply(), "initial token total supply is not zero");

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		await sale.getGeodes.sendTransaction({value: (await sale.currentPrice()).times(10)});

		const gemsInGeode = await sale.GEMS_IN_GEODE();
		assert(gemsInGeode.times(11).plus(1).eq(await tk.balanceOf(accounts[0])), "wrong token balance after buying 10 geodes (+1 free)");
		assert(gemsInGeode.times(11).plus(1).eq(await tk.totalSupply()), "wrong token total supply after buying 10 geodes (+1 free)");
		assert.equal(11, await sale.geodeBalances(accounts[0]), "wrong geode balance after buying 10 geodes (+1 free)");
	});
	it("geode sale: it is possible to buy few geodes and get a change", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		assert.equal(0, await tk.balanceOf(accounts[0]), "initial token balance is not zero");
		assert.equal(0, await tk.totalSupply(), "initial token total supply is not zero");

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		const geodePrice = await sale.currentPrice();
		const valueToSend = geodePrice.times(2.34);
		const initialBalance = await web3.eth.getBalance(accounts[0]);
		const txHash = await sale.getGeodes.sendTransaction({value: valueToSend, gasPrice: 1});
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const balanceDelta = initialBalance.minus(await web3.eth.getBalance(accounts[0]));
		assert(balanceDelta.minus(txReceipt.gasUsed).eq(geodePrice.times(2)), "wrong buyer balances after buying 2 geodes");
	});
	it("geode sale: gems created from the geode have correct amount and owner", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		await sale.getGeodes.sendTransaction({from: accounts[1], value: await sale.currentPrice()});

		const gemsInGeode = (await sale.GEMS_IN_GEODE()).toNumber();

		assert.equal(gemsInGeode, await tk.totalSupply(), "wrong number of gems in geode");
		assert.equal(gemsInGeode, await tk.balanceOf(accounts[1]), "wrong number of gems on account");

		const gemNumber4 = await tk.collections(accounts[1], 3);

		assert.equal(accounts[1], await tk.ownerOf(gemNumber4), "gem #4 has wrong owner");
	});
	it("geode sale: gems created from the geode have correct coordinates", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		await sale.getGeodes.sendTransaction({from: accounts[1], value: await sale.currentPrice()});

		const gem4Id = await tk.collections(accounts[1], 3);
		const gem4Coordinates = await tk.getCoordinates(gem4Id);
		const plotId = gem4Coordinates.dividedToIntegerBy(4294967296);
		const depth = gem4Coordinates.dividedToIntegerBy(65536).modulo(65536);
		const gemNum = gem4Coordinates.modulo(65536);
		assert.equal(1, plotId, "plotId coordinate is wrong");
		assert.equal(0, depth, "depth coordinate is wrong");
		assert.equal(0x4, gemNum, "gemNum coordinate is wrong");
	});
	it("geode sale: iterate over the gems bought from few geodes", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		// buy n geodes (n * GEMS_IN_GEODE gems)
		const n = 4;
		const GEMS_IN_GEODE = await sale.GEMS_IN_GEODE();
		const currentPrice = await sale.currentPrice();
		await sale.getGeodes.sendTransaction({from: accounts[1], value: currentPrice.times(n)});

		for(let i = 0; i < n * GEMS_IN_GEODE; i++) {
			const gemId = await tk.collections(accounts[1], i);
			const gemCoordinates = await tk.getCoordinates(gemId);
			const plotId = gemCoordinates.dividedToIntegerBy(4294967296);
			const depth = gemCoordinates.dividedToIntegerBy(65536).modulo(65536);
			const gemNum = gemCoordinates.modulo(65536);
			const color = await tk.getColor(gemId);
			assert.equal(1 + i % GEMS_IN_GEODE, gemNum, "gemNum coordinate is wrong");
			assert.equal(0, depth, "depth coordinate is wrong");
			assert.equal(1 + Math.floor(i / GEMS_IN_GEODE), plotId, "plotId coordinate is wrong");
			assert(color >= 9 && color <= 10 || color >= 1 && color <= 2, "wrong color ID " + color);
		}
	});
	it("geode sale: gems created from the geode contain 1 gem of the level 2", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		const GEMS_IN_GEODE = await sale.GEMS_IN_GEODE();
		const currentPrice = await sale.currentPrice();
		await sale.getGeodes.sendTransaction({from: accounts[1], value: currentPrice});

		let level2Found = false;
		for(let i = 0; i < GEMS_IN_GEODE; i++) {
			const gemId = await tk.collections(accounts[1], i);
			const levelId = await tk.getLevel(gemId);
			if(levelId.eq(2)) {
				level2Found = true;
			}
		}

		assert(level2Found, "there is no level 2 gem in the collection");
	});
	it("geode sale: gems created from the geode contain 1 gem of the grade A", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		const GEMS_IN_GEODE = await sale.GEMS_IN_GEODE();
		const currentPrice = await sale.currentPrice();
		await sale.getGeodes.sendTransaction({from: accounts[1], value: currentPrice});

		let gradeAFound = false;
		for(let i = 0; i < GEMS_IN_GEODE; i++) {
			const gemId = await tk.collections(accounts[1], i);
			const gradeType = await tk.getGradeType(gemId);
			if(gradeType.eq(4)) {
				gradeAFound = true;
			}
		}

		assert(gradeAFound, "there is no grade A gem in the collection");
	});
	it("geode sale: adding a color", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9]);

		assert.equal(9, await sale.colors(0), "wrong initial color at index 0");
		assert.equal(10, await sale.colors(1), "wrong initial color at index 0");
		assert.equal(1, await sale.colors(2), "wrong initial color at index 0");
		assert.equal(2, await sale.colors(3), "wrong initial color at index 0");
		await assertThrowsAsync(async function() {await sale.colors(4);});
		await assertThrowsAsync(async function() {await sale.colors(5);});

		const fn1 = async () => await sale.addColor(11);
		const fn1a = async () => await sale.addColor(12);
		const fn2 = async () => await sale.addColor(11, {from: accounts[1]});
		const fn2a = async () => await sale.addColor(12, {from: accounts[1]});
		await assertThrowsAsync(fn2);
		await assertThrowsAsync(fn2a);
		await fn1();
		await assertThrowsAsync(fn1);
		await fn1a();
		await assertThrowsAsync(fn1a);

		assert.equal(11, await sale.colors(4), "wrong color at index 4");
		assert.equal(12, await sale.colors(5), "wrong color at index 4");
		await assertThrowsAsync(async function() {await sale.colors(6);});
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
