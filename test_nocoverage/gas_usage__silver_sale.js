// Silver smart contract
const Silver = artifacts.require("./SilverERC20.sol");
// GoldERC20 smart contract
const Gold = artifacts.require("./GoldERC20.sol");
// Referral points tracker smart contract
const Tracker = artifacts.require("./RefPointsTracker.sol");

// Silver Box Sale smart contract
const Sale = artifacts.require("./SilverSale.sol");

// initial and final prices of the boxes
const INITIAL_PRICES = [96000000000000000, 320000000000000000, 760000000000000000];

// Enables the silver / gold sale
const FEATURE_SALE_ENABLED = 0x00000001;
// Token creator is responsible for creating tokens
const ROLE_TOKEN_CREATOR = 0x00000001;
// Allows setting an address as known
const ROLE_SELLER = 0x00000004;

/**
 * Test verifies gas usage for different transactions
 * within the SilverSale smart contract
 */
contract('SilverSale: Gas Usage', (accounts) => {
	it("gas: deploying a sale requires 4232150 gas", async() => {
		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		const txHash = sale.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(4232150, gasUsed, "deploying SilverSale gas usage mismatch: " + gasUsed);
	});

	it("gas: buying one Silver Box requires 182207 gas", async() => {
		const boxType = 0;
		const qty = 1;

		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_SELLER);

		const gasUsed = (await sale.buy(boxType, qty, {from: player, value: qty * INITIAL_PRICES[boxType]})).receipt.gasUsed;
		assertEqual(182207, gasUsed, "buying one Silver Box gas usage mismatch: " + gasUsed);
	});
	it("gas: buying two Silver Boxes requires 184685 gas", async() => {
		const boxType = 0;
		const qty = 2;

		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_SELLER);

		const gasUsed = (await sale.buy(boxType, qty, {from: player, value: qty * INITIAL_PRICES[boxType]})).receipt.gasUsed;
		assertEqual(184685, gasUsed, "buying two Silver Boxes gas usage mismatch: " + gasUsed);
	});
	it("gas: buying 500 Silver Boxes requires 1418793 gas", async() => {
		const boxType = 0;
		const qty = 500;

		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_SELLER);

		const gasUsed = (await sale.buy(boxType, qty, {from: player, value: qty * INITIAL_PRICES[boxType]})).receipt.gasUsed;
		assertEqual(1418793, gasUsed, "buying 500 Silver Boxes gas usage mismatch: " + gasUsed);
	});

	it("gas: buying one Rotund Silver Box requires 182721 gas", async() => {
		const boxType = 1;
		const qty = 1;

		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_SELLER);

		const gasUsed = (await sale.buy(boxType, qty, {from: player, value: qty * INITIAL_PRICES[boxType]})).receipt.gasUsed;
		assertEqual(182721, gasUsed, "buying one Rotund Silver Box gas usage mismatch: " + gasUsed);
	});
	it("gas: buying two Rotund Silver Box requires 185349 gas", async() => {
		const boxType = 1;
		const qty = 2;

		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_SELLER);

		const gasUsed = (await sale.buy(boxType, qty, {from: player, value: qty * INITIAL_PRICES[boxType]})).receipt.gasUsed;
		assertEqual(185349, gasUsed, "buying two Rotund Silver Boxes gas usage mismatch: " + gasUsed);
	});
	it("gas: buying 300 Rotund Silver Box requires 968557 gas", async() => {
		const boxType = 1;
		const qty = 300;

		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_SELLER);

		const gasUsed = (await sale.buy(boxType, qty, {from: player, value: qty * INITIAL_PRICES[boxType]})).receipt.gasUsed;
		assertEqual(968557, gasUsed, "buying 300 Rotund Silver Boxes gas usage mismatch: " + gasUsed);
	});

	it("gas: buying one Goldish Silver Box requires 182859/230305 gas", async() => {
		const boxType = 2;
		const qty = 1;

		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_SELLER);

		const gasUsed = (await sale.buy(boxType, qty, {from: player, value: qty * INITIAL_PRICES[boxType]})).receipt.gasUsed;
		assertOneOf(182859, 230305, gasUsed, "buying one Goldish Silver Box gas usage mismatch: " + gasUsed);
	});
	it("gas: buying two Goldish Silver Box requires 185625/233071 gas", async() => {
		const boxType = 2;
		const qty = 2;

		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_SELLER);

		const gasUsed = (await sale.buy(boxType, qty, {from: player, value: qty * INITIAL_PRICES[boxType]})).receipt.gasUsed;
		assertOneOf(185625, 233071, gasUsed, "buying two Goldish Silver Boxes gas usage mismatch: " + gasUsed);
	});
	it("gas: buying 150 Goldish Silver Box requires 643537 gas", async() => {
		const boxType = 2;
		const qty = 150;

		const silver = await Silver.new();
		const gold = await Gold.new();
		const ref = await Tracker.new();
		const player = accounts[1];
		const chest = accounts[7];
		const beneficiary = accounts[8];
		const offset = -3600 + new Date().getTime() / 1000 | 0;
		const sale = await Sale.new(silver.address, gold.address, ref.address, chest, beneficiary, offset);

		await sale.updateFeatures(FEATURE_SALE_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_SELLER);

		const gasUsed = (await sale.buy(boxType, qty, {from: player, value: qty * INITIAL_PRICES[boxType]})).receipt.gasUsed;
		assertEqual(643537, gasUsed, "buying 150 Goldish Silver Boxes gas usage mismatch: " + gasUsed);
	});
});

// check if one of two values are equal with a 5% precision
function assertOneOf(expected1, expected2, actual, msg) {
	assertOneOfWith(expected1, expected2, 0.05, actual, msg);
}

// check if one of two values are equal with the 'leeway' precision
function assertOneOfWith(expected1, expected2, leeway, actual, msg) {
	assert(equalWith(expected1, leeway, actual) || equalWith(expected2, leeway, actual), msg);
}

// assert if 2 values are equal with a 5% precision
function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, 0.05, actual, msg);
}

// assert if 2 values are equal with the 'leeway' precision
function assertEqualWith(expected, leeway, actual, msg) {
	assert(equalWith(expected, leeway, actual), msg);
}

// check if 2 values are equal with the 'leeway' precision
function equalWith(expected, leeway, actual) {
	return expected * (1 - leeway) < actual && expected * (1 + leeway) > actual;
}
