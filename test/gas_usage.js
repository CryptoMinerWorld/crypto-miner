const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_ROLE_MANAGER = 0x10000000;

const Token = artifacts.require("./GemERC721");
const Sale = artifacts.require("./GeodeSale");

contract('GeodeSale: Gas Usage', function(accounts) {
	it("geode sale: buying a geode requires 716044 gas", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[9]);

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.addOperator(sale.address, ROLE_TOKEN_CREATOR);
		const txHash = await sale.getGeodes.sendTransaction({value: await sale.GEODE_PRICE()});
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(716044, gasUsed, "buying a geode gas usage mismatch: " + gasUsed);
	});
});


function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, 0.05, actual, msg);
}

function assertEqualWith(expected, leeway, actual, msg) {
	assert(expected * (1 - leeway) < actual && expected * (1 + leeway) > actual, msg);
}
