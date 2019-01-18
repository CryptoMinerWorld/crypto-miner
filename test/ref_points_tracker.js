// Role ROLE_REF_POINTS_ISSUER allows increasing `issued`
const ROLE_REF_POINTS_ISSUER = 0x00000001;

// Role ROLE_REF_POINTS_CONSUMER allows increasing `consumed`
const ROLE_REF_POINTS_CONSUMER = 0x00000002;

// Referral points tracker smart contract
const Tracker = artifacts.require("./RefPointsTracker.sol");

contract('RefPointsTracker', (accounts) => {
	it("initial state: all balances are zero", async() => {
		const tracker = await Tracker.new();
		const account0 = accounts[0];
		assert.equal(0, await tracker.issued(account0), "non-zero initial value for issued[account0]");
		assert.equal(0, await tracker.consumed(account0), "non-zero initial value for consumed[account0]");
		assert.equal(0, await tracker.available(account0), "non-zero initial value for available(account0)");
		assert.equal(0, await tracker.balanceOf(account0), "non-zero initial value for balanceOf(account0)");
		assert.equal(0, await tracker.getNumberOfHolders(), "non-zero initial value for getNumberOfHolders()");
		assert.equal(0, (await tracker.getAllHolders()).length, "non-empty initial value for getAllHolders()");
	});
	it("permissions: issuer and consumer are different permissions", async() => {
		assert(ROLE_REF_POINTS_ISSUER != ROLE_REF_POINTS_CONSUMER, "issuer and consumer permissions are equal");
	});
	it("permissions: issuing ref points requires ROLE_REF_POINTS_ISSUER permission", async() => {
		const tracker = await Tracker.new();

		// referral points issuer
		const issuer = accounts[1];

		// player
		const player = accounts[2];

		// functions to issue referral points
		const fn1 = async() => await tracker.issueTo(player, 1, {from: issuer});
		const fn2 = async() => await tracker.bulkIssue([player], [1], {from: issuer});

		// originally issuer doesn't have required permission
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);

		// grant issuer permission required
		await tracker.updateRole(issuer, ROLE_REF_POINTS_ISSUER);

		// verify issuer can perform an operation now
		await fn1();
		await fn2();

		// verify referral points increased correctly
		assert.equal(2, await tracker.issued(player), "incorrect issued value after issuing 2 points");
	});
	it("permissions: consuming ref points requires ROLE_REF_POINTS_CONSUMER permission", async() => {
		const tracker = await Tracker.new();

		// referral points issuer
		const consumer = accounts[1];

		// player
		const player = accounts[2];

		// issue some referral points to player
		await tracker.issueTo(player, 2);

		// functions to consume referral points
		const fn1 = async() => await tracker.consumeFrom(player, 1, {from: consumer});
		const fn2 = async() => await tracker.bulkConsume([player], [1], {from: consumer});

		// originally consumer doesn't have required permission
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);

		// grant consumer permission required
		await tracker.updateRole(consumer, ROLE_REF_POINTS_CONSUMER);

		// verify consumer can perform an operation now
		await fn1();
		await fn2();

		// verify consumed referral points increased correctly
		assert.equal(2, await tracker.consumed(player), "incorrect consumed value after consuming 2 points");
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
		await assertThrowsAsync(consume);

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
		await assertThrowsAsync(consume);
	});
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
		await assertThrowsAsync(consume);

		// issuing using wrong functions is not possible at any time
		await assertThrowsAsync(issue1);
		await assertThrowsAsync(issue2);

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
		await assertThrowsAsync(consume1);
		await assertThrowsAsync(consume2);

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
		await assertThrowsAsync(consume);
	});
	it("issuing and consuming: arithmetic overflow checks", async() => {
		const tracker = await Tracker.new();

		// referral points issuer
		const issuer = accounts[1];

		// referral pints consumer
		const consumer = accounts[2];

		// player
		const player = accounts[3];

		// very vig amount of points, which can cause an overflow
		const bigAmount = web3.toBigNumber(2).pow(255);

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
		await assertThrowsAsync(issue);

		// first time consuming works
		await consume();

		// second consuming leads to arithmetic overflow
		await assertThrowsAsync(consume);

		// verify referral points balances
		assert(bigAmount.eq(await tracker.issued(player)), "incorrect issued value after consuming big amount of point(s)");
		assert(bigAmount.eq(await tracker.consumed(player)), "incorrect consumed value after consuming big amount of point(s)");
		assert.equal(0, await tracker.available(player), "incorrect available value after consuming big amount of point(s)");
		assert.equal(0, await tracker.balanceOf(player), "incorrect balanceOf value after consuming big amount of point(s)");

		// issuing/consuming zero amounts always fails
		await assertThrowsAsync(issue0);
		await assertThrowsAsync(consume0);
	});
});

// default random function to use
function rnd() {
	return Math.round(Math.random() * 4294967296);
}

// auxiliary function to ensure function `fn` throws
async function assertThrowsAsync(fn, ...args) {
	let f = () => {};
	try {
		await fn(...args);
	}
	catch(e) {
		f = () => {
			throw e;
		};
	}
	finally {
		assert.throws(f);
	}
}
