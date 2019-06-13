// smart contract to test gas usage for
const Token = artifacts.require("./PlotERC721.sol");

// import features and roles required
import {FEATURE_TRANSFERS, FEATURE_TRANSFERS_ON_BEHALF} from "../test/erc721_core";

// gas usage tests
contract("PlotERC721: Gas Usage", (accounts) => {
	it("gas: deploying PlotERC721 requires 3999130 gas", async() => {
		const tk = await Token.new();
		const txHash = tk.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(3999130, gasUsed, "deploying PlotERC721 gas usage mismatch: " + gasUsed);
	});

	it("gas: minting a token requires 205299 gas", async() => {
		const tk = await Token.new();
		const gasUsed = (await tk.mint(accounts[0], 1, toBN("0x05002341555F6400"))).receipt.gasUsed;

		assertEqual(205299, gasUsed, "minting a token gas usage mismatch: " + gasUsed);
	});

	it("gas: transferring a token requires 72113 gas", async() => {
		const player = accounts[1];
		const player2 = accounts[2];
		const tk = await Token.new();
		await tk.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(player, 0, toBN("0x05002341555F6400"));
		const gasUsed = (await tk.safeTransferFrom(player, player2, 1, {from: player})).receipt.gasUsed;

		assertEqual(72113, gasUsed, "transferring a token gas usage mismatch: " + gasUsed);
	});

	it("gas: mining a plot by 1 block requires 33352 gas", async() => {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0, toBN("0x05002341555F6400"));
		const gasUsed = (await tk.mineBy(1, 1)).receipt.gasUsed;

		assertEqual(33352, gasUsed, "mining a plot by 1 block gas usage mismatch: " + gasUsed);
	});

	it("gas: mining a plot to block 1 requires 32230 gas", async() => {
		const tk = await Token.new();
		await tk.mint(accounts[0], 0, toBN("0x05002341555F6400"));
		const gasUsed = (await tk.mineTo(1, 1)).receipt.gasUsed;

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

// import auxiliary functions
import {toBN} from "../scripts/shared_functions";
