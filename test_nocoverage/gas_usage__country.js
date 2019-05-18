const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
const ROLE_TOKEN_CREATOR = 0x00040000;

const Token = artifacts.require("./CountryERC721.sol");
const Sale = artifacts.require("./CountrySale.sol");

// import country data
import {COUNTRY_DATA, COUNTRY_PRICE_DATA} from "../data/country_data";

const tokenId = 117;

contract("CountrySale: Gas Usage", (accounts) => {
	it("CountryERC721: deploying a country requires 4360176 gas", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		const txHash = tk.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(4360176, gasUsed, "deploying CountryERC721 gas usage mismatch: " + gasUsed);
	});

	it("CountryERC721: minting a country requires 165560 gas", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		const gasUsed = (await tk.mint(accounts[0], tokenId)).receipt.gasUsed;

		assertEqual(165560, gasUsed, "minting a country gas usage mismatch: " + gasUsed);
	});

	it("CountryERC721: transferring a country requires 72017 gas", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await tk.mint(accounts[0], tokenId);
		const gasUsed = (await tk.safeTransferFrom(accounts[0], accounts[1], tokenId, "")).receipt.gasUsed;

		assertEqual(72017, gasUsed, "transferring a country gas usage mismatch: " + gasUsed);
	});

	it("CountrySale: deploying a country sale requires 3165563 gas", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		const sale = await Sale.new(tk.address, accounts[0], COUNTRY_PRICE_DATA);
		const txHash = sale.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(3165563, gasUsed, "deploying CountrySale gas usage mismatch: " + gasUsed);
	});

	it("CountrySale: buying a country requires 184086 gas", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		const sale = await Sale.new(tk.address, accounts[0], COUNTRY_PRICE_DATA);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		const gasUsed = (await sale.buy(tokenId, {from: accounts[1], value: getPrice(tokenId)})).receipt.gasUsed;

		assertEqual(184086, gasUsed, "buying a country gas usage mismatch: " + gasUsed);
	});

	it("CountrySale: buying 5 countries requires 541798 gas", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		const sale = await Sale.new(tk.address, accounts[0], COUNTRY_PRICE_DATA);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		const countries = [1, 2, 3, 4, 5];
		const price = countries.reduce((a, b) => a.plus(getPrice(b)), web3.toBigNumber(0));
		const gasUsed = (await sale.bulkBuy(countries, {from: accounts[1], value: price})).receipt.gasUsed;

		assertEqual(541798, gasUsed, "buying 5 countries gas usage mismatch: " + gasUsed);
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

// get price by token ID
function getPrice(tokenId) {
	return COUNTRY_PRICE_DATA[tokenId - 1];
}
