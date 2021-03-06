// Referral points tracker smart contract
const Tracker = artifacts.require("./RefPointsTracker.sol");

// Role ROLE_REF_POINTS_ISSUER allows increasing `issued`
const ROLE_REF_POINTS_ISSUER = 0x00000001;

// Role ROLE_REF_POINTS_CONSUMER allows increasing `consumed`
const ROLE_REF_POINTS_CONSUMER = 0x00000002;

// Role ROLE_SELLER allows adding known addresses
const ROLE_SELLER = 0x00000004;

// tests for Referral Points Tracker
contract('RefPointsTracker', (accounts) => {
	it("initial state: all balances are zero", async() => {
		const tracker = await Tracker.new();
		const account0 = accounts[0];
		assert.equal(0, await tracker.issued(account0), "non-zero initial value for issued[account0]");
		assert.equal(0, await tracker.consumed(account0), "non-zero initial value for consumed[account0]");
		assert.equal(0, await tracker.available(account0), "non-zero initial value for available(account0)");
		assert.equal(0, await tracker.balanceOf(account0), "non-zero initial value for balanceOf(account0)");
		assert(!await tracker.isKnown(account0), "non-false initial value for isKnown(account0)");
		assert(!await tracker.isValid(account0, account0), "non-false value for isValid(account0, account0)");
		assert.equal(0, await tracker.getNumberOfHolders(), "non-zero initial value for getNumberOfHolders()");
		assert.equal(0, await tracker.getNumberOfKnownAddresses(), "non-zero initial value for getNumberOfKnownAddresses()");
		assert.equal(0, (await tracker.getAllHolders()).length, "non-empty initial value for getAllHolders()");
		assert.equal(0, (await tracker.getKnownAddresses()).length, "non-empty initial value for getKnownAddresses()");
	});
	it("permissions: issuer, consumer and seller are different permissions", async() => {
		assert(ROLE_REF_POINTS_ISSUER !== ROLE_REF_POINTS_CONSUMER, "issuer and consumer permissions are equal");
		assert(ROLE_REF_POINTS_CONSUMER !== ROLE_SELLER, "consumer and seller permissions are equal");
		assert(ROLE_SELLER !== ROLE_REF_POINTS_ISSUER, "seller and issuer permissions are equal");
	});
	it("permissions: issuing ref points requires ROLE_REF_POINTS_ISSUER permission", async() => {
		const tracker = await Tracker.new();

		// referral points issuer
		const issuer = accounts[1];

		// player
		const player = accounts[2];

		// functions to issue referral points
		const fn1 = async() => await tracker.issueTo(player, 1, {from: issuer});

		// originally issuer doesn't have required permission
		await assertThrows(fn1);

		// grant issuer permission required
		await tracker.updateRole(issuer, ROLE_REF_POINTS_ISSUER);

		// verify issuer can perform operations now
		await fn1();

		// verify referral points increased correctly
		assert.equal(1, await tracker.issued(player), "incorrect issued value after issuing 1 point(s)");
	});
	it("permissions: consuming ref points requires ROLE_REF_POINTS_CONSUMER permission", async() => {
		const tracker = await Tracker.new();

		// referral points consumer
		const consumer = accounts[1];

		// player
		const player = accounts[2];

		// issue some referral points to player
		await tracker.issueTo(player, 2);

		// functions to consume referral points
		const fn1 = async() => await tracker.consumeFrom(player, 1, {from: consumer});

		// originally consumer doesn't have required permission
		await assertThrows(fn1);

		// grant consumer permission required
		await tracker.updateRole(consumer, ROLE_REF_POINTS_CONSUMER);

		// verify consumer can perform operations now
		await fn1();

		// verify consumed referral points increased correctly
		assert.equal(1, await tracker.consumed(player), "incorrect consumed value after consuming 1 point(s)");
	});
	it("permissions: adding known addresses requires ROLE_SELLER permission", async() => {
		const tracker = await Tracker.new();

		// seller
		const seller = accounts[1];

		// functions to consume referral points
		const fn1 = async() => await tracker.addKnownAddress(accounts[0], {from: seller});
		const fn2 = async() => await tracker.addKnownAddress(accounts[1], {from: seller});

		// originally seller doesn't have required permission
		await assertThrows(fn1);

		// grant seller permission required
		await tracker.updateRole(seller, ROLE_SELLER);

		// verify seller can perform operations now
		await fn1();
		// at this point accounts[0] can be a referrer
		assert(await tracker.isValid(accounts[0], accounts[1]), "account0 is not a valid referrer for account1");

		// additional add will make second address known
		await fn2();
		// and here same "isValid" validation fails
		assert(!await tracker.isValid(accounts[0], accounts[1]), "account0 is still a valid referrer for account1");

		// verify known addresses were tracked correctly
		assert.equal(2, await tracker.getNumberOfKnownAddresses(), "wrong number of known addresses");
		assert(await tracker.isKnown(accounts[1]), "known addresses doesn't contain account 1");
	});
	it("issuing and consuming: general flow", async() => {
		const tracker = await Tracker.new();

		// referral points issuer
		const issuer = accounts[1];

		// referral pints consumer
		const consumer = accounts[2];

		// player
		const player = accounts[3];

		// amount of points to issue/consume
		const amt = rnd();

		// grant permissions required
		await tracker.updateRole(issuer, ROLE_REF_POINTS_ISSUER);
		await tracker.updateRole(consumer, ROLE_REF_POINTS_CONSUMER);

		// functions to issue and consume referral points
		const issue = async() => await tracker.issueTo(player, amt, {from: issuer});
		const consume = async() => await tracker.consumeFrom(player, amt, {from: consumer});

		// consuming is not possible initially - no points to consume
		await assertThrows(consume);

		// issue some ref point(s)
		await issue();

		// verify referral points balances and holders array
		assert.equal(amt, await tracker.issued(player), "incorrect issued value after issuing " + amt + " point(s)");
		assert.equal(0, await tracker.consumed(player), "incorrect consumed value after issuing  " + amt + " point(s)");
		assert.equal(amt, await tracker.available(player), "incorrect available value after issuing " + amt + " point(s)");
		assert.equal(amt, await tracker.balanceOf(player), "incorrect balanceOf value after issuing " + amt + " point(s)");
		assert.equal(1, await tracker.getNumberOfHolders(), "incorrect number of holders after issuing some points");
		assert.equal(player, await tracker.holders(0), "incorrect holder at index 0 after issuing some points");

		// consume some ref point(s)
		await consume();

		// verify referral points balances and holders array
		assert.equal(amt, await tracker.issued(player), "incorrect issued value after consuming " + amt + " point(s)");
		assert.equal(amt, await tracker.consumed(player), "incorrect consumed value after consuming  " + amt + " point(s)");
		assert.equal(0, await tracker.available(player), "incorrect available value after consuming " + amt + " point(s)");
		assert.equal(0, await tracker.balanceOf(player), "incorrect balanceOf value after consuming " + amt + " point(s)");
		assert.equal(1, await tracker.getNumberOfHolders(), "incorrect number of holders after consuming some points");
		assert.equal(player, await tracker.holders(0), "incorrect holder at index 0 after consuming some points");

		// consuming is not possible anymore - no points to consume
		await assertThrows(consume);
	});
/*
	it("issuing and consuming: bulk flow", async() => {
		const tracker = await Tracker.new();

		// referral points issuer
		const issuer = accounts[1];

		// referral pints consumer
		const consumer = accounts[2];

		// const bulk size
		const bulkSize = 5;

		// players and amounts initialization
		const players = [];
		const ams = [];
		for(let i = 0; i < bulkSize; i++) {
			players.push(accounts[3 + i]);
			ams.push(rnd());
		}

		// grant permissions required
		await tracker.updateRole(issuer, ROLE_REF_POINTS_ISSUER);
		await tracker.updateRole(consumer, ROLE_REF_POINTS_CONSUMER);

		// functions to issue and consume referral points
		const issue = async() => await tracker.bulkIssue(players, ams, {from: issuer});
		const consume = async() => await tracker.bulkConsume(players, ams, {from: consumer});

		// incorrect functions to issue and consume referral points
		const issue1 = async() => await tracker.bulkIssue([], [], {from: issuer});
		const issue2 = async() => await tracker.bulkIssue([players[0]], ams, {from: issuer});
		const consume1 = async() => await tracker.bulkConsume([], [], {from: consumer});
		const consume2 = async() => await tracker.bulkConsume([players[0]], ams, {from: consumer});

		// consuming is not possible initially - no points to consume
		await assertThrows(consume);

		// issuing using wrong functions is not possible at any time
		await assertThrows(issue1);
		await assertThrows(issue2);

		// issue some ref point(s)
		await issue();

		// verify referral points balances
		for(let i = 0; i < bulkSize; i++) {
			assert.equal(ams[i], await tracker.issued(players[i]), "incorrect issued value after issuing " + ams[i] + " point(s)");
			assert.equal(0, await tracker.consumed(players[i]), "incorrect consumed value after issuing  " + ams[i] + " point(s)");
			assert.equal(ams[i], await tracker.available(players[i]), "incorrect available value after issuing " + ams[i] + " point(s)");
			assert.equal(ams[i], await tracker.balanceOf(players[i]), "incorrect balanceOf value after issuing " + ams[i] + " point(s)");
			assert.equal(players[i], await tracker.holders(i), "incorrect holder at index " + i + " after issuing some points");
		}
		assert.equal(players.length, await tracker.getNumberOfHolders(), "incorrect number of holders after issuing some points");

		// consuming using wrong functions is not possible at any time
		await assertThrows(consume1);
		await assertThrows(consume2);

		// consume some ref point(s)
		await consume();

		// verify referral points balances
		for(let i = 0; i < bulkSize; i++) {
			assert.equal(ams[i], await tracker.issued(players[i]), "incorrect issued value after consuming " + ams[i] + " point(s)");
			assert.equal(ams[i], await tracker.consumed(players[i]), "incorrect consumed value after consuming  " + ams[i] + " point(s)");
			assert.equal(0, await tracker.available(players[i]), "incorrect available value after consuming " + ams[i] + " point(s)");
			assert.equal(0, await tracker.balanceOf(players[i]), "incorrect balanceOf value after consuming " + ams[i] + " point(s)");
			assert.equal(players[i], await tracker.holders(i), "incorrect holder at index " + i + " after consuming some points");
		}
		assert.equal(players.length, await tracker.getNumberOfHolders(), "incorrect number of holders after consuming some points");

		// consuming is not possible anymore - no points to consume
		await assertThrows(consume);
	});
*/
	it("issuing and consuming: arithmetic overflow checks", async() => {
		const tracker = await Tracker.new();

		// referral points issuer
		const issuer = accounts[1];

		// referral pints consumer
		const consumer = accounts[2];

		// player
		const player = accounts[3];

		// very vig amount of points, which can cause an overflow
		const bigAmount = web3.utils.toBN(2).pow(web3.utils.toBN(255));

		// grant permissions required
		await tracker.updateRole(issuer, ROLE_REF_POINTS_ISSUER);
		await tracker.updateRole(consumer, ROLE_REF_POINTS_CONSUMER);

		// functions to issue and consume referral points
		const issue = async() => await tracker.issueTo(player, bigAmount, {from: issuer});
		const consume = async() => await tracker.consumeFrom(player, bigAmount, {from: consumer});
		// functions to issue/consumer zero values (incorrect functions)
		const issue0 = async() => await tracker.issueTo(player, 0, {from: issuer});
		const consume0 = async() => await tracker.consumeFrom(player, 0, {from: consumer});

		// first time issuing works
		await issue();

		// second issuing leads to arithmetic overflow
		await assertThrows(issue);

		// first time consuming works
		await consume();

		// second consuming leads to arithmetic overflow
		await assertThrows(consume);

		// verify referral points balances
		assert(bigAmount.eq(await tracker.issued(player)), "incorrect issued value after consuming big amount of point(s)");
		assert(bigAmount.eq(await tracker.consumed(player)), "incorrect consumed value after consuming big amount of point(s)");
		assert.equal(0, await tracker.available(player), "incorrect available value after consuming big amount of point(s)");
		assert.equal(0, await tracker.balanceOf(player), "incorrect balanceOf value after consuming big amount of point(s)");

		// issuing/consuming zero amounts always fails
		await assertThrows(issue0);
		await assertThrows(consume0);
	});
/*
	it("adding known addresses: bulk flow", async() => {
		const tracker = await Tracker.new();

		// seller
		const seller = accounts[1];

		// grant seller permission required
		await tracker.updateRole(seller, ROLE_SELLER);

		// verify wrong bulk address parameters
		await assertThrows(tracker.bulkAddKnownAddresses, [], {from: seller});

		// define 0, 1, 2, 3 addresses in a valid format
		const a0 = "0x0000000000000000000000000000000000000000";
		const a1 = "0x0000000000000000000000000000000000000001";
		const a2 = "0x0000000000000000000000000000000000000002";
		const a3 = "0x0000000000000000000000000000000000000003";

		// verify initial state of known addresses
		assert(!await tracker.isKnown(a0), 'address "0" is known');
		assert(!await tracker.isKnown(a1), 'address "1" is not known');
		assert(!await tracker.isKnown(a2), 'address "2" is not known');

		// non empty array works good
		await tracker.bulkAddKnownAddresses([a0], {from: seller});
		await tracker.bulkAddKnownAddresses([a0, a1], {from: seller});
		await tracker.bulkAddKnownAddresses([a0, a1, a2], {from: seller});

		// verify final state of known addresses
		assert(!await tracker.isKnown(a0), 'address "0" is known');
		assert(await tracker.isKnown(a1), 'address "1" is not known');
		assert(await tracker.isKnown(a2), 'address "2" is not known');

		// verify few referral pairs
		assert(!await tracker.isValid(a1, a0), "zero address is a valid referrer");
		assert(!await tracker.isValid(a0, a1), "zero address is a valid referrer");
		assert(!await tracker.isValid(a1, a2), "two known addresses produced valid referral link");
		assert(!await tracker.isValid(a2, a1), "two known addresses produced valid referral link (2)");
		assert(await tracker.isValid(a1, a3), "known and unknown addresses didn't produce valid referral link");
		assert(!await tracker.isValid(a3, a1), "unknown and known addresses produced valid referral link");
	});
*/
});

// default random function to use
function rnd() {
	return Math.round(Math.random() * 4294967296);
}


// import auxiliary function to ensure function `fn` throws
import {assertThrows} from "../scripts/shared_functions";
