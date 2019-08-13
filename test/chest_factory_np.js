// Now provider is used to play with current time
const NowProvider = artifacts.require("./__NowProvider.sol");

// Keys to be used in chest factory
const FoundersKey = artifacts.require("./FoundersKeyERC20.sol");
const ChestKey = artifacts.require("./ChestKeyERC20.sol");

// Chest factory
const ChestFactory = artifacts.require("./__ChestFactory.sol");

// import ERC721Core dependencies
import {FEATURE_TRANSFERS, FEATURE_TRANSFERS_ON_BEHALF} from "./erc721_core";

// features and roles to be used
const ROLE_CHEST_CREATOR = 0x00000001;

// tests for ChestKeyERC20 token
contract('ChestFactory (NowProvider)', (accounts) => {
	it("winning a founders' chest - single participant with single key", async() => {
		// now provider
		const np = await NowProvider.new();

		// define chest factory dependencies
		const fk = await FoundersKey.new();
		const ck = await ChestKey.new();

		// create chest factory instance
		const cf = await ChestFactory.new(fk.address, ck.address, np.address);

		// create a founder's chest ID 1 with a 1 ETH value
		const chestValue = toBN(1000000000000000000);
		await cf.createWith(true, 3600 + new Date().getTime() / 1000 | 0, {value: chestValue});

		// define a player's account
		const player = accounts[1];

		// create two founders' keys
		await fk.mint(player, 2);

		// allow keys transfers
		await fk.updateFeatures(FEATURE_TRANSFERS);

		// a function to send a key
		const fn1 = async() => await fk.safeTransferFrom(player, cf.address, 1, abiPack(1), {from: player});
		// a function to toss a chest
		const fn2 = async() => await cf.toss(1);
		// a function to withdraw keys
		const fn3 = async() => await cf.withdrawKeys(1, player, {from: player});
		// a function to withdraw treasure
		const fn4 = async() => await cf.withdrawTreasure(1, {from: player});

		// rewind 30 minutes forward
		await np.incTime(1800);

		// send a key
		const gas1 = gasUsedBN(await fn1());
		console.log("\tregistering %o key(s) to open a chest gas usage: %o", 1, gas1.toNumber());
		// too early for a toss and withdrawals
		await assertThrows(fn2);
		await assertThrows(fn3);
		await assertThrows(fn4);
		// rewind 60 minutes forward
		await np.incTime(3600);
		// keys are not accepted anymore
		await assertThrows(fn1);
		// toss the chest
		await fn2();
		// toss can be performed only once
		await assertThrows(fn2);

		// verify the winner
		assert.equal(player, await cf.getWinner(1), "incorrect winner");
		assert(!await cf.isEmpty(1), "chest is empty!");
		assert.equal(1, await fk.balanceOf(player), "wrong player key balance before withdraw");
		assert.equal(1, await fk.balanceOf(cf.address), "wrong chest key balance before withdraw");

		// withdraw the key
		await fn3();
		assert.equal(2, await fk.balanceOf(player), "wrong player key balance after withdraw");
		assert.equal(0, await fk.balanceOf(cf.address), "wrong chest key balance after withdraw");

		// withdraw treasure
		const playerBalance = await getBalanceBN(player);
		const gas4 = gasUsedBN(await fn4());
		assert(playerBalance.add(chestValue).sub(gas4).eq(await getBalanceBN(player)), "wrong player balance after treasure withdrawal");

		// verify chest data structure
		// reading internal structure
		const chest = await cf.chests(0);
		assert(chest.foundersFlag, "incorrect chest type");
		assert(chest.emptyFlag, "chest is not empty");
		assert(chestValue.eq(chest.value), "incorrect chest value");
		assert(chest.tossTime > 0, "incorrect tossTime");
		assert.equal(player, chest.winner, "incorrect winner");

		// using public getters
		assert(await cf.isFounders(1), "incorrect chest type (public getter)");
		assert(await cf.isEmpty(1), "chest is not empty (public getter)");
		assert(chestValue.eq(await cf.getValue(1)), "incorrect chest value (public getter)");
		assert(await cf.getTossTime(1) > 0, "incorrect tossTime (public getter)");
		assert.equal(0, await cf.getTossIn(1), "non-zero tossIn (public getter)");
		assert.equal(player, await cf.getWinner(1), "incorrect winner (public getter)");
		assert.equal(1, (await cf.getParticipants(1)).length, "wrong participants array size");

		// key balances
		const balances = await cf.getKeyBalances(1, player);
		assert.equal(0, balances.foundersKeys, "non-zero founders keys balance");
		assert.equal(0, balances.chestKeys, "non-zero chest keys balance");
	});
	it("winning a founders' chest - single participant with multiple keys", async() => {
		// now provider
		const np = await NowProvider.new();

		// define chest factory dependencies
		const fk = await FoundersKey.new();
		const ck = await ChestKey.new();

		// create chest factory instance
		const cf = await ChestFactory.new(fk.address, ck.address, np.address);

		// create a founder's chest ID 1 with a 1 ETH value
		const chestValue = toBN(1000000000000000000);
		await cf.createWith(true, 3600 + new Date().getTime() / 1000 | 0, {value: chestValue});

		// define a player's account
		const player = accounts[1];

		// create n founders' keys
		const n = 50;
		await fk.mint(player, 2 * n);

		// allow keys transfers
		await fk.updateFeatures(FEATURE_TRANSFERS);

		// a function to send the keys
		const fn1 = async() => await fk.safeTransferFrom(player, cf.address, n, abiPack(1), {from: player});
		// a function to toss a chest
		const fn2 = async() => await cf.toss(1);
		// a function to withdraw keys
		const fn3 = async() => await cf.withdrawKeys(1, player, {from: player});
		// a function to withdraw treasure
		const fn4 = async() => await cf.withdrawTreasure(1, {from: player});

		// rewind 30 minutes forward
		await np.incTime(1800);

		// send the keys
		const gas1 = gasUsedBN(await fn1());
		console.log("\tregistering %o key(s) to open a chest gas usage: %o", n, gas1.toNumber());
		// too early for a toss and withdrawals
		await assertThrows(fn2);
		await assertThrows(fn3);
		await assertThrows(fn4);
		// rewind 60 minutes forward
		await np.incTime(3600);
		// keys are not accepted anymore
		await assertThrows(fn1);
		// toss the chest
		await fn2();
		// toss can be performed only once
		await assertThrows(fn2);

		// verify the winner
		assert.equal(player, await cf.getWinner(1), "incorrect winner");
		assert(!await cf.isEmpty(1), "chest is empty!");
		assert.equal(n, await fk.balanceOf(player), "wrong player key balance before withdraw");
		assert.equal(n, await fk.balanceOf(cf.address), "wrong chest key balance before withdraw");

		// withdraw the key
		await fn3();
		assert.equal(2 * n, await fk.balanceOf(player), "wrong player key balance after withdraw");
		assert.equal(0, await fk.balanceOf(cf.address), "wrong chest key balance after withdraw");

		// withdraw treasure
		const playerBalance = await getBalanceBN(player);
		const gas4 = gasUsedBN(await fn4());
		assert(playerBalance.add(chestValue).sub(gas4).eq(await getBalanceBN(player)), "wrong player balance after treasure withdrawal");

		// verify chest data structure
		// reading internal structure
		const chest = await cf.chests(0);
		assert(chest.foundersFlag, "incorrect chest type");
		assert(chest.emptyFlag, "chest is not empty");
		assert(chestValue.eq(chest.value), "incorrect chest value");
		assert(chest.tossTime > 0, "incorrect tossTime");
		assert.equal(player, chest.winner, "incorrect winner");

		// using public getters
		assert(await cf.isFounders(1), "incorrect chest type (public getter)");
		assert(await cf.isEmpty(1), "chest is not empty (public getter)");
		assert(chestValue.eq(await cf.getValue(1)), "incorrect chest value (public getter)");
		assert(await cf.getTossTime(1) > 0, "incorrect tossTime (public getter)");
		assert.equal(0, await cf.getTossIn(1), "non-zero tossIn (public getter)");
		assert.equal(player, await cf.getWinner(1), "incorrect winner (public getter)");
		assert.equal(n, (await cf.getParticipants(1)).length, "wrong participants array size");

		// key balances
		const balances = await cf.getKeyBalances(1, player);
		assert.equal(0, balances.foundersKeys, "non-zero founders keys balance");
		assert.equal(0, balances.chestKeys, "non-zero chest keys balance");
	});
	it("winning a founders' chest - two participants", async() => {
		// now provider
		const np = await NowProvider.new();

		// define chest factory dependencies
		const fk = await FoundersKey.new();
		const ck = await ChestKey.new();

		// create chest factory instance
		const cf = await ChestFactory.new(fk.address, ck.address, np.address);

		// create a founder's chest ID 1 with a 1 ETH value
		const chestValue = toBN(1000000000000000000);
		await cf.createWith(true, 3600 + new Date().getTime() / 1000 | 0, {value: chestValue});

		// define two players' accounts
		const player1 = accounts[1];
		const player2 = accounts[2];

		// create n, m founders' keys
		const m = 50;
		const n = 100;
		await fk.mint(player1, m);
		await fk.mint(player2, n);

		// allow keys transfers
		await fk.updateFeatures(FEATURE_TRANSFERS);

		// functions to send the keys
		const fn11 = async() => await fk.safeTransferFrom(player1, cf.address, m, abiPack(1), {from: player1});
		const fn12 = async() => await fk.safeTransferFrom(player2, cf.address, n, abiPack(1), {from: player2});
		// a function to toss a chest
		const fn2 = async() => await cf.toss(1);
		// functions to withdraw keys
		const fn3 = async(p) => await cf.withdrawKeys(1, p, {from: p});
		// function to withdraw treasure
		const fn4 = async(p) => await cf.withdrawTreasure(1, {from: p});

		// rewind 30 minutes forward
		await np.incTime(1800);

		// send the keys
		const gas1 = gasUsedBN(await fn11());
		const gas2 = gasUsedBN(await fn12());
		console.log("\tregistering %o key(s) to open a chest gas usage: %o", m, gas1.toNumber());
		console.log("\tregistering %o key(s) to open a chest gas usage: %o", n, gas2.toNumber());
		// rewind 60 minutes forward
		await np.incTime(3600);
		// toss the chest
		await fn2();

		// verify the winner
		const winner = await cf.getWinner(1);
		assert(player1 === winner || player2 === winner, "incorrect winner");
		assert(!await cf.isEmpty(1), "chest is empty!");
		assert.equal(0, await fk.balanceOf(player1), "wrong player1 key balance before withdraw");
		assert.equal(0, await fk.balanceOf(player1), "wrong player2 key balance before withdraw");
		assert.equal(m + n, await fk.balanceOf(cf.address), "wrong chest key balance before withdraw");

		// withdraw the keys
		await fn3(player1);
		await fn3(player2);
		assert.equal(m, await fk.balanceOf(player1), "wrong player1 key balance after withdraw");
		assert.equal(n, await fk.balanceOf(player2), "wrong player2 key balance after withdraw");
		assert.equal(0, await fk.balanceOf(cf.address), "wrong chest key balance after withdraw");

		// withdraw treasure
		const winnerBalance = await getBalanceBN(winner);
		const gas4 = gasUsedBN(await fn4(winner));
		assert(winnerBalance.add(chestValue).sub(gas4).eq(await getBalanceBN(winner)), "wrong winner balance after treasure withdrawal");

		// verify chest data structure
		// reading internal structure
		const chest = await cf.chests(0);
		assert(chest.foundersFlag, "incorrect chest type");
		assert(chest.emptyFlag, "chest is not empty");
		assert(chestValue.eq(chest.value), "incorrect chest value");
		assert(chest.tossTime > 0, "incorrect tossTime");
		assert.equal(winner, chest.winner, "incorrect winner");

		// using public getters
		assert(await cf.isFounders(1), "incorrect chest type (public getter)");
		assert(await cf.isEmpty(1), "chest is not empty (public getter)");
		assert(chestValue.eq(await cf.getValue(1)), "incorrect chest value (public getter)");
		assert(await cf.getTossTime(1) > 0, "incorrect tossTime (public getter)");
		assert.equal(0, await cf.getTossIn(1), "non-zero tossIn (public getter)");
		assert.equal(winner, await cf.getWinner(1), "incorrect winner (public getter)");
		assert.equal(m + n, (await cf.getParticipants(1)).length, "wrong participants array size");

		// key balances
		const balances1 = await cf.getKeyBalances(1, player1);
		const balances2 = await cf.getKeyBalances(1, player2);
		assert.equal(0, balances1.foundersKeys, "non-zero founders keys balance for player1");
		assert.equal(0, balances1.chestKeys, "non-zero chest keys balance for player1");
		assert.equal(0, balances2.foundersKeys, "non-zero founders keys balance for player2");
		assert.equal(0, balances2.chestKeys, "non-zero chest keys balance for player2");
	});
	it("winning a chest - single participant with single key");
	it("winning a chest - single participant with multiple keys");
	it("winning a chest - two participants");
	it("expired chest - no participants", async() => {
		// now provider
		const np = await NowProvider.new();

		// define chest factory dependencies
		const fk = await FoundersKey.new();
		const ck = await ChestKey.new();

		// create chest factory instance
		const cf = await ChestFactory.new(fk.address, ck.address, np.address);

		// create a founder's chest ID 1 with a 1 ETH value
		const chestValue = toBN(1000000000000000000);
		await cf.createWith(false, 3600 + new Date().getTime() / 1000 | 0, {value: chestValue});

		// define an operator address
		const operator = accounts[1];

		// define a function to withdraw funds
		const fn = async() => await cf.withdrawTreasure(1, {from: operator});

		// rewind 90 minutes forward - no participants
		await np.incTime(5400);

		// initially operator doesn't have any permissions and cannot withdraw
		await assertThrows(fn);

		// grant operator ROLE_CHEST_CREATOR permission
		await cf.updateRole(operator, ROLE_CHEST_CREATOR);

		// perform the withdraw
		const operatorBalance = await getBalanceBN(operator);
		const gas = gasUsedBN(await fn());
		assert(operatorBalance.add(chestValue).sub(gas).eq(await getBalanceBN(operator)), "wrong operator balance after withdrawal");

		// verify chest data structure
		// reading internal structure
		const chest = await cf.chests(0);
		assert(!chest.foundersFlag, "incorrect chest type");
		assert(chest.emptyFlag, "chest is not empty");
		assert(chestValue.eq(chest.value), "incorrect chest value");
		assert(chest.tossTime > 0, "incorrect tossTime");
		assert.equal(ZERO_ADDR, chest.winner, "incorrect winner");

		// using public getters
		assert(!await cf.isFounders(1), "incorrect chest type (public getter)");
		assert(await cf.isEmpty(1), "chest is not empty (public getter)");
		assert(chestValue.eq(await cf.getValue(1)), "incorrect chest value (public getter)");
		assert(await cf.getTossTime(1) > 0, "incorrect tossTime (public getter)");
		assert.equal(0, await cf.getTossIn(1), "non-zero tossIn (public getter)");
		assert.equal(ZERO_ADDR, await cf.getWinner(1), "incorrect winner (public getter)");
		assert.equal(0, (await cf.getParticipants(1)).length, "wrong participants array size");
	});
});

// packs chestId into abi-compliant structure
function abiPack(chestId) {
	// convert inputs to BNs
	chestId = toBN(chestId);

	// pack and return
	return toBytes(chestId);
}



// import auxiliary function to ensure function `fn` throws
import {assertThrows, gasUsedBN, getBalanceBN, toBN, toBytes, ZERO_ADDR} from "../scripts/shared_functions";
