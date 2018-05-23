const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_ROLE_MANAGER = 0x10000000;

const Token = artifacts.require("./GemERC721");
const Sale = artifacts.require("./GeodeSale");

contract('GeodeSale: Gas Usage', function(accounts) {
	it("Gem ERC721: deploying a GemERC721 requires 4743729 gas", async function() {
		const token = await Token.new();
		const txHash = token.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(4743729, gasUsed, "deploying a GemERC721 gas usage mismatch: " + gasUsed);
	});

	it("geode sale: buying a geode requires 615660 gas", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[9]);

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		const txHash = await sale.getGeodes.sendTransaction({value: await sale.currentPrice()});
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(615660, gasUsed, "buying a geode gas usage mismatch: " + gasUsed);
	});

	it("geode sale: buying 10 geodes requires 6373548 gas", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[9]);

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		const txHash = await sale.getGeodes.sendTransaction({value: (await sale.currentPrice()).times(10)});
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(6373548, gasUsed, "buying a geode gas usage mismatch: " + gasUsed);
	});
});


function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, 0.05, actual, msg);
}

function assertEqualWith(expected, leeway, actual, msg) {
	assert(expected * (1 - leeway) < actual && expected * (1 + leeway) > actual, msg);
}
