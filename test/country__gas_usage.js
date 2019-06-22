// smart contract to test gas usage for
const Token = artifacts.require("./CountryERC721.sol");

// import country data
import {COUNTRY_DATA} from "../data/country_data";

// import features and roles required
import {FEATURE_TRANSFERS} from "./erc721_core";

// gas usage tests
contract("CountrySale: Gas Usage", (accounts) => {
	it("gas: deploying a country requires 4,958,389 gas", async() => {
		const tk = await Token.new(COUNTRY_DATA);
		const txHash = tk.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(4958389, gasUsed, "deploying CountryERC721 gas usage mismatch: " + gasUsed);
	});

	it("gas: minting a country requires 165,560 gas", async() => {
		const tk = await Token.new(COUNTRY_DATA);
		const gasUsed = (await tk.mint(accounts[0], 1)).receipt.gasUsed;

		assertEqual(165560, gasUsed, "minting a country gas usage mismatch: " + gasUsed);
	});

	it("gas: transferring a country requires 72,017 gas", async() => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.mint(accounts[0], 1);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		const gasUsed = (await tk.safeTransferFrom(accounts[0], accounts[1], 1)).receipt.gasUsed;

		assertEqual(72017, gasUsed, "transferring a country gas usage mismatch: " + gasUsed);
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
