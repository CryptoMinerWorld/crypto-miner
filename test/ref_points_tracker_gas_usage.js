// Referral points tracker smart contract
const Tracker = artifacts.require("./RefPointsTracker.sol");

contract('RefPointsTracker: Gas Usage', (accounts) => {
	it("gas: deploying RefPointsTracker requires 1027454 gas", async() => {
		const tracker = await Tracker.new();
		const txHash = tracker.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(1027454, gasUsed, "deploying RefPointsTracker gas usage mismatch: " + gasUsed);
	});
	it("gas: issuing some ref points requires gas", async() => {
		const tracker = await Tracker.new();
		const gasUsed = (await tracker.issueTo(accounts[1], 1)).receipt.gasUsed;

		assertEqual(88278, gasUsed, "issuing some ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: issuing some additional ref points requires gas", async() => {
		const tracker = await Tracker.new();
		await tracker.issueTo(accounts[1], 1);
		const gasUsed = (await tracker.issueTo(accounts[1], 1)).receipt.gasUsed;

		assertEqual(32743, gasUsed, "issuing some additional ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: consuming some ref points requires gas", async() => {
		const tracker = await Tracker.new();
		await tracker.issueTo(accounts[1], 1);
		const gasUsed = (await tracker.consumeFrom(accounts[1], 1)).receipt.gasUsed;

		assertEqual(48564, gasUsed, "issuing some ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk issuing ref points to 10 addresses requires 541090 gas", async() => {
		const tracker = await Tracker.new();
		const size = 10;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const points = new Array(size).fill(1);
		const gasUsed = (await tracker.bulkIssue(addresses, points)).receipt.gasUsed;

		assertEqual(541090, gasUsed, "bulk issuing ref points to 10 addresses gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk issuing ref points to 100 addresses requires 5064214 gas", async() => {
		const tracker = await Tracker.new();
		const size = 100;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const points = new Array(size).fill(1);
		const gasUsed = (await tracker.bulkIssue(addresses, points)).receipt.gasUsed;

		assertEqual(5064214, gasUsed, "bulk issuing ref points to 100 addresses gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk consuming ref points from 10 addresses requires 275936 gas", async() => {
		const tracker = await Tracker.new();
		const size = 10;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const points = new Array(size).fill(1);
		await tracker.bulkIssue(addresses, points);
		const gasUsed = (await tracker.bulkConsume(addresses, points)).receipt.gasUsed;

		assertEqual(275936, gasUsed, "bulk consuming ref points from 10 addresses gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk consuming ref points from 100 addresses requires 2549060 gas", async() => {
		const tracker = await Tracker.new();
		const size = 100;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const points = new Array(size).fill(1);
		await tracker.bulkIssue(addresses, points);
		const gasUsed = (await tracker.bulkConsume(addresses, points)).receipt.gasUsed;

		assertEqual(2549060, gasUsed, "bulk consuming ref points from 10 addresses gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk adding 10 known addresses requires 519451 gas", async() => {
		const tracker = await Tracker.new();
		const size = 10;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const gasUsed = (await tracker.bulkAddKnownAddresses(addresses)).receipt.gasUsed;

		assertEqual(519451, gasUsed, "bulk adding 10 known addresses gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk adding 100 known addresses requires 4852252 gas", async() => {
		const tracker = await Tracker.new();
		const size = 100;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const gasUsed = (await tracker.bulkAddKnownAddresses(addresses)).receipt.gasUsed;

		assertEqual(4852252, gasUsed, "bulk adding 100 known addresses gas usage mismatch: " + gasUsed);
	});
});


// asserts equal with precision of 5%
function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, 0.05, actual, msg);
}

// asserts equal with the precisions defined in leeway
function assertEqualWith(expected, leeway, actual, msg) {
	assert(expected * (1 - leeway) < actual && expected * (1 + leeway) > actual, msg);
}
