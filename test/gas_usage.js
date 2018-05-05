const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

const ROLE_TOKEN_CREATOR = 0x00010000;
const ROLE_STATE_PROVIDER = 0x00020000;
const ROLE_ROLE_MANAGER = 0x00040000;
const ROLE_FEATURE_MANAGER = 0x00080000;

const FULL_PRIVILEGES_MASK = 0xFFFFFFFF;

const Token = artifacts.require("./Token");
const Sale = artifacts.require("./GeodeSale");

contract('GeodeSale: Gas Usage', function(accounts) {
	it("geode sale: buying a geode requires 411003 gas", async function() {
		const token = await Token.new();
		const sale = await Sale.new(token.address, accounts[9]);

		await token.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await token.createOperator(sale.address, ROLE_TOKEN_CREATOR);
		const txHash = await sale.getGeodes.sendTransaction({value: await sale.GEODE_PRICE()});
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assert.equal(411003, gasUsed, "buying a geode gas usage mismatch: " + gasUsed);
	});
});
