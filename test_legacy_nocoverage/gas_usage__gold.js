// Enables ERC20 transfers of the tokens
const FEATURE_TRANSFERS = 0x00000001;

// Enables ERC20 transfers on behalf
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

// GoldERC20 smart contract
const Gold = artifacts.require("./GoldERC20.sol");

contract('GoldERC20: Gas Usage', (accounts) => {
	it("gas: deploying GoldERC20 requires 1048208 gas", async() => {
		const tk = await Gold.new();
		const txHash = tk.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(1048208, gasUsed, "deploying GoldERC20 gas usage mismatch: " + gasUsed);
	});
	it("gas: minting some tokens requires 68429 gas", async() => {
		const tk = await Gold.new();
		const gasUsed = (await tk.mint(accounts[1], 17)).receipt.gasUsed;

		assertEqual(68429, gasUsed, "minting some tokens gas usage mismatch: " + gasUsed);
	});
	it("gas: burning some tokens requires 38664 gas", async() => {
		const tk = await Gold.new();
		await tk.mint(accounts[1], 23);
		const gasUsed = (await tk.burn(accounts[1], 17)).receipt.gasUsed;

		assertEqual(38664, gasUsed, "burning some tokens gas usage mismatch: " + gasUsed);
	});
	it("gas: transferring some tokens requires 52593 gas", async() => {
		const tk = await Gold.new();
		await tk.mint(accounts[1], 23);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		const gasUsed = (await tk.transfer(accounts[2], 17, {from: accounts[1]})).receipt.gasUsed;

		assertEqual(52593, gasUsed, "transferring some tokens gas usage mismatch: " + gasUsed);
	});
	it("gas: allowing transfers on behalf requires 45238 gas", async() => {
		const tk = await Gold.new();
		const gasUsed = (await tk.approve(accounts[3], 17, {from: accounts[1]})).receipt.gasUsed;

		assertEqual(45238, gasUsed, "allowing transfers on behalf gas usage mismatch: " + gasUsed);
	});
	it("gas: transferring on behalf requires 59474 gas", async() => {
		const tk = await Gold.new();
		await tk.mint(accounts[1], 23);
		await tk.approve(accounts[3], 19, {from: accounts[1]});
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		const gasUsed = (await tk.transferFrom(accounts[1], accounts[2], 17, {from: accounts[3]})).receipt.gasUsed;

		assertEqual(59474, gasUsed, "transferring on behalf gas usage mismatch: " + gasUsed);
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
