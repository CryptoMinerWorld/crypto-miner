// Keys to be used in chest factory
const FoundersKey = artifacts.require("./FoundersKeyERC20.sol");
const ChestKey = artifacts.require("./ChestKeyERC20.sol");

// Chest factory
const ChestFactory = artifacts.require("./ChestFactory.sol");

// import ERC721Core dependencies
import {FEATURE_TRANSFERS, FEATURE_TRANSFERS_ON_BEHALF} from "./erc721_core";

// features and roles to be used
const ROLE_CHEST_MANAGER = 0x00000001;

// tests for ChestKeyERC20 token
contract('ChestFactory', (accounts) => {
	it("deploying treasure chest factory", async() => {
		// define chest factory dependencies
		const fk = await FoundersKey.new();
		const ck = await ChestKey.new();

		// verify wrong constructor parameters fail
		await assertThrows(ChestFactory.new, 0, ck.address);
		await assertThrows(ChestFactory.new, fk.address, 0);
		await assertThrows(ChestFactory.new, ck.address, fk.address);

		// create chest factory instance
		const cf = await ChestFactory.new(fk.address, ck.address);

		// verify founders key and chest key are set correctly
		assert.equal(fk.address, await cf.foundersKey(), "incorrect founders key");
		assert.equal(ck.address, await cf.chestKey(), "incorrect chest key");
	});

	it("creating a chest requires ROLE_CHEST_MANAGER role", async() => {
		// define chest factory dependencies
		const fk = await FoundersKey.new();
		const ck = await ChestKey.new();

		// create chest factory instance
		const cf = await ChestFactory.new(fk.address, ck.address);

		// define chest manager account
		const manager = accounts[15];

		// define a function to create a chest
		const fn = async(value) => await cf.createChest(true, {from: manager, value: value});

		// initially manager doesn't have a role and cannot create a chest
		await assertThrows(fn, 0);
		await assertThrows(fn, 1);

		// grant manager a role
		await cf.updateRole(manager, ROLE_CHEST_MANAGER);

		// zero chest value always fail
		await assertThrows(fn, 0);
		// non-zero succeeds
		await fn(1);

		// verify chest is created correctly
		// reading internal structure
		const chest = await cf.chests(0);
		assert(chest.foundersFlag, "incorrect chest type");
		assert(!chest.emptyFlag, "chest is empty initially");
		assert.equal(1, chest.value, "incorrect chest value");
		assert(chest.tossTime > 0, "incorrect tossTime");
		assert.equal(ZERO_ADDR, chest.winner, "non-zero winner");

		// using public getters
		assert(await cf.isFounders(1), "incorrect chest type (public getter)");
		await assertThrows(cf.isEmpty, 1);
		assert.equal(1, await cf.getValue(1), "incorrect chest value (public getter)");
		assert(await cf.getTossTime(1) > 0, "incorrect tossTime (public getter)");
		assert(await cf.getTossIn(1) > 0, "incorrect tossIn (public getter)");
		await assertThrows(cf.getWinner, 1);
		assert.equal(0, (await cf.getParticipants(1)).length, "non-empty participants array");

		// key balances
		const balances = await cf.getKeyBalances(1, accounts[0]);
		assert.equal(0, balances.foundersKeys, "non-zero founders keys balance");
		assert.equal(0, balances.chestKeys, "non-zero chest keys balance");
	});

	it("creating a chest, putting a key to unlock", async() => {
		// define chest factory dependencies
		const fk = await FoundersKey.new();
		const ck = await ChestKey.new();

		// create chest factory instance
		const cf = await ChestFactory.new(fk.address, ck.address);

		// create a chest ID 1
		await cf.createChest(true, {value: 1});

		// define a player's account
		const player = accounts[1];

		// create a founder's and regular keys
		await fk.mint(player, 1);
		await ck.mint(player, 1);

		// player sends a key to unlock the chest
		await fk.updateFeatures(FEATURE_TRANSFERS);
		await ck.updateFeatures(FEATURE_TRANSFERS);
		await fk.safeTransferFrom(player, cf.address, 1, abiPack(1), {from: player});
		await assertThrows(ck.safeTransferFrom, player, ck.address, 1, abiPack(1), {from: player}); // fails for founder's chest

		// verify the key was transferred properly
		assert.equal(0, await fk.balanceOf(player), "wrong founder's key balance");
		assert.equal(1, await ck.balanceOf(player), "wrong chest key balance");

		const participants = await cf.getParticipants(1);
		assert.equal(1, participants.length, "incorrect number of participants");
		assert.equal(player, participants[0], "incorrect participant 0");
	});

	it("creating a founder's and regular chests", async() => {
		// define chest1 factory dependencies
		const fk = await FoundersKey.new();
		const ck = await ChestKey.new();

		// create chest1 factory instance
		const cf = await ChestFactory.new(fk.address, ck.address);

		// create a founder's chest1 ID 1
		await cf.createChest(true, {value: 1});
		// create regular chest1 ID 2
		await cf.createChest(false, {value: 2});

		// define two players' accounts
		const player1 = accounts[1];
		const player2 = accounts[2];

		// create few founder's and regular keys
		await fk.mint(player1, 4);
		await ck.mint(player1, 3);
		await fk.mint(player2, 2);
		await ck.mint(player2, 5);

		// enable transfers of the keys
		await fk.updateFeatures(FEATURE_TRANSFERS);
		await ck.updateFeatures(FEATURE_TRANSFERS);

		// define functions to send the keys
		const fn = async(p, f, id) => await f.safeTransferFrom(p, cf.address, 1, abiPack(id), {from: p});

		// test these functions
		await fn(player1, fk, 1);
		await fn(player2, fk, 1);
		await assertThrows(fn, player1, ck, 1);
		await assertThrows(fn, player2, ck, 1);

		await fn(player1, fk, 2);
		await fn(player2, fk, 2);
		await fn(player1, ck, 2);
		await fn(player2, ck, 2);

		// check key balances
		assert.equal(2, await fk.balanceOf(player1), "wrong fk player1 balance");
		assert.equal(0, await fk.balanceOf(player2), "wrong fk player2 balance");
		assert.equal(2, await ck.balanceOf(player1), "wrong ck player1 balance");
		assert.equal(4, await ck.balanceOf(player2), "wrong ck player2 balance");

		// check chest states
		// reading internal structure
		const chest1 = await cf.chests(0);
		const chest2 = await cf.chests(1);
		assert(chest1.foundersFlag, "incorrect chest1 type");
		assert(!chest2.foundersFlag, "incorrect chest2 type");
		assert(!chest1.emptyFlag, "chest1 is empty initially");
		assert(!chest2.emptyFlag, "chest2 is empty initially");
		assert.equal(1, chest1.value, "incorrect chest1 value");
		assert.equal(2, chest2.value, "incorrect chest2 value");
		assert(chest1.tossTime > 0, "incorrect chest1 tossTime");
		assert(chest2.tossTime > 0, "incorrect chest2 tossTime");
		assert.equal(ZERO_ADDR, chest1.winner, "non-zero chest1 winner");
		assert.equal(ZERO_ADDR, chest2.winner, "non-zero chest2 winner");

		// using public getters
		assert(await cf.isFounders(1), "incorrect chest1 type (public getter)");
		assert(!await cf.isFounders(2), "incorrect chest2 type (public getter)");
		await assertThrows(cf.isEmpty, 1);
		await assertThrows(cf.isEmpty, 2);
		assert.equal(1, await cf.getValue(1), "incorrect chest1 value (public getter)");
		assert.equal(2, await cf.getValue(2), "incorrect chest2 value (public getter)");
		assert(await cf.getTossTime(1) > 0, "incorrect chest1 tossTime (public getter)");
		assert(await cf.getTossTime(2) > 0, "incorrect chest2 tossTime (public getter)");
		assert(await cf.getTossIn(1) > 0, "incorrect chest1 tossIn (public getter)");
		assert(await cf.getTossIn(2) > 0, "incorrect chest2 tossIn (public getter)");
		await assertThrows(cf.getWinner, 1);
		await assertThrows(cf.getWinner, 2);
		assert.equal(2, (await cf.getParticipants(1)).length, "wrong chest1 participants array size");
		assert.equal(4, (await cf.getParticipants(2)).length, "wrong chest2 participants array size");

		// key balances
		const balances11 = await cf.getKeyBalances(1, player1);
		const balances12 = await cf.getKeyBalances(1, player2);
		const balances21 = await cf.getKeyBalances(2, player1);
		const balances22 = await cf.getKeyBalances(2, player2);
		assert.equal(1, balances11.foundersKeys, "wrong 1-1 founders keys balance");
		assert.equal(0, balances11.chestKeys, "wrong 1-1 chest keys balance");
		assert.equal(1, balances12.foundersKeys, "wrong 1-2 founders keys balance");
		assert.equal(0, balances12.chestKeys, "wrong 1-2 chest keys balance");
		assert.equal(1, balances21.foundersKeys, "wrong 2-1 founders keys balance");
		assert.equal(1, balances21.chestKeys, "wrong 2-1 chest keys balance");
		assert.equal(1, balances22.foundersKeys, "wrong 2-2 founders keys balance");
		assert.equal(1, balances22.chestKeys, "wrong 2-2 chest keys balance");

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
import {assertThrows, toBN, toBytes, ZERO_ADDR} from "../scripts/shared_functions";
