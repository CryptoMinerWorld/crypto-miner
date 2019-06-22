// Referral points tracker smart contract
const Tracker = artifacts.require("./RefPointsTracker.sol");

contract('RefPointsTracker: Gas Usage', (accounts) => {
	it("gas: deploying RefPointsTracker requires 1,445,642 gas", async() => {
		const tracker = await Tracker.new();
		const txHash = tracker.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(1445642, gasUsed, "deploying RefPointsTracker gas usage mismatch: " + gasUsed);
	});
	it("gas: issuing some ref points requires 88,334 gas", async() => {
		const tracker = await Tracker.new();
		const gasUsed = (await tracker.issueTo(accounts[1], 1)).receipt.gasUsed;

		assertEqual(88334, gasUsed, "issuing some ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: issuing some additional ref points requires 32,743 gas", async() => {
		const tracker = await Tracker.new();
		await tracker.issueTo(accounts[1], 1);
		const gasUsed = (await tracker.issueTo(accounts[1], 1)).receipt.gasUsed;

		assertEqual(32743, gasUsed, "issuing some additional ref points gas usage mismatch: " + gasUsed);
	});
	it("gas: consuming some ref points requires 48,564 gas", async() => {
		const tracker = await Tracker.new();
		await tracker.issueTo(accounts[1], 1);
		const gasUsed = (await tracker.consumeFrom(accounts[1], 1)).receipt.gasUsed;

		assertEqual(48564, gasUsed, "issuing some ref points gas usage mismatch: " + gasUsed);
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
