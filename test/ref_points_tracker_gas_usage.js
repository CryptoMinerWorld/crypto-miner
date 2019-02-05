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
	it("gas: issuing some ref points requires 88334 gas", async() => {
		const tracker = await Tracker.new();
		const gasUsed = (await tracker.issueTo(accounts[1], 1)).receipt.gasUsed;

		assertEqual(88334, gasUsed, "issuing some ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: issuing some additional ref points requires 32743 gas", async() => {
		const tracker = await Tracker.new();
		await tracker.issueTo(accounts[1], 1);
		const gasUsed = (await tracker.issueTo(accounts[1], 1)).receipt.gasUsed;

		assertEqual(32743, gasUsed, "issuing some additional ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: consuming some ref points requires 48564 gas", async() => {
		const tracker = await Tracker.new();
		await tracker.issueTo(accounts[1], 1);
		const gasUsed = (await tracker.consumeFrom(accounts[1], 1)).receipt.gasUsed;

		assertEqual(48564, gasUsed, "issuing some ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk issuing ref points to 10 addresses requires 541112 gas", async() => {
		const tracker = await Tracker.new();
		const size = 10;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const points = new Array(size).fill(1);
		const gasUsed = (await tracker.bulkIssue(addresses, points)).receipt.gasUsed;

		assertEqual(541112, gasUsed, "bulk issuing ref points to 10 addresses gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk issuing ref points to 68 addresses requires 3456000 gas", async() => {
		const tracker = await Tracker.new();
		const size = 68;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const points = new Array(size).fill(1);
		const gasUsed = (await tracker.bulkIssue(addresses, points)).receipt.gasUsed;

		assertEqual(3456000, gasUsed, "bulk issuing ref points to 68 addresses gas usage mismatch: " + gasUsed);
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
	it("gas: bulk consuming ref points from 37 addresses requires 957796 gas", async() => {
		const tracker = await Tracker.new();
		const size = 37;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const points = new Array(size).fill(1);
		await tracker.bulkIssue(addresses, points);
		const gasUsed = (await tracker.bulkConsume(addresses, points)).receipt.gasUsed;

		assertEqual(957796, gasUsed, "bulk consuming ref points from 37 addresses gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk adding 10 known addresses requires 519451 gas", async() => {
		const tracker = await Tracker.new();
		const size = 10;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const gasUsed = (await tracker.bulkAddKnownAddresses(addresses)).receipt.gasUsed;

		assertEqual(519451, gasUsed, "bulk adding 10 known addresses gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk adding 65 known addresses requires 3167270 gas", async() => {
		const tracker = await Tracker.new();
		const size = 65;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const gasUsed = (await tracker.bulkAddKnownAddresses(addresses)).receipt.gasUsed;

		assertEqual(3167270, gasUsed, "bulk adding 65 known addresses gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk adding 211 known addresses requires 10196084 gas", async() => {
		const tracker = await Tracker.new();
		const size = 211;
		const addresses = Array.from(new Array(size), (x, i) => i + 1);
		const gasUsed = (await tracker.bulkAddKnownAddresses(addresses)).receipt.gasUsed;

		assertEqual(10196084, gasUsed, "bulk adding 211 known addresses gas usage mismatch: " + gasUsed);
	});
});


// asserts equal with precision of 5%
function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, actual, 0.05, msg);
}

// asserts equal with the precisions defined in leeway
function assertEqualWith(expected, actual, leeway, msg) {
	assert(expected * (1 - leeway) < actual && expected * (1 + leeway) > actual, msg);
}
