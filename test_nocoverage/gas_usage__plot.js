// Based on PlotERC721 smart contract
const Token = artifacts.require("./PlotERC721.sol");

// Enables ERC721 transfers of the tokens (token owner performs a transfer)
const FEATURE_TRANSFERS = 0x00000001;

// token ID to work with
const tokenId = 1;

contract("PlotERC721: Gas Usage", (accounts) => {
	it("PlotERC721: deploying a SM requires 3249360 gas", async () => {
		const tk = await Token.new();
		const txHash = tk.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(3249360, gasUsed, "deploying SM gas usage mismatch: " + gasUsed);
	});

	it("PlotERC721: minting a token requires 187583 gas", async () => {
		const tk = await Token.new();
		const gasUsed = (await tk.mint(accounts[0], tokenId, web3.toBigNumber("0x05002341555F6400"))).receipt.gasUsed;

		assertEqual(187583, gasUsed, "minting a token gas usage mismatch: " + gasUsed);
	});

	it("PlotERC721: transferring a token requires 72113 gas", async () => {
		const tk = await Token.new();
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await tk.mint(accounts[0], tokenId, web3.toBigNumber("0x05002341555F6400"));
		const gasUsed = (await tk.safeTransferFrom(accounts[0], accounts[1], tokenId)).receipt.gasUsed;

		assertEqual(72113, gasUsed, "transferring a token gas usage mismatch: " + gasUsed);
	});

	it("PlotERC721: mining a plot by 1 block requires 33352 gas", async() => {
		const tk = await Token.new();
		await tk.mint(accounts[0], tokenId, web3.toBigNumber("0x05002341555F6400"));
		const gasUsed = (await tk.mineBy(tokenId, 1)).receipt.gasUsed;

		assertEqual(33352, gasUsed, "mining a plot by 1 block gas usage mismatch: " + gasUsed);
	});

	it("PlotERC721: mining a plot to block 1 requires 32230 gas", async() => {
		const tk = await Token.new();
		await tk.mint(accounts[0], tokenId, web3.toBigNumber("0x05002341555F6400"));
		const gasUsed = (await tk.mineTo(tokenId, 1)).receipt.gasUsed;

		assertEqual(32230, gasUsed, "mining a plot to block 1 gas usage mismatch: " + gasUsed);
	});
});

// check if 2 values are equal with a 5% precision
function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, 0.05, actual, msg);
}

// check if 2 values are equal with the 'leeway' precision
function assertEqualWith(expected, leeway, actual, msg) {
	assert(expected * (1 - leeway) < actual && expected * (1 + leeway) > actual, msg);
}

