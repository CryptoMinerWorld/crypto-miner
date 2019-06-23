// Enables using coupons i.e. exchanging them for boxes
const FEATURE_USING_COUPONS_ENABLED = 0x00000001;

// Silver/Gold Sale
const SilverSale = artifacts.require("./SilverSale");

// using secure random generator instead of default Math.random()
const secureRandomInRange = require("random-number-csprng");

// using file system to create raw csv data file
const fs = require('fs');

// deploys silver sale coupons smart contract,
// adds 30/20/10 coupon codes to it
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[write silver coupons] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[write silver coupons] coverage network - skipping the migration script");
		return;
	}

	// deployed SilverSale address
	const saleAddress = network === "mainnet"?
		// Mainnet addresses
		"":
		// Ropsten address
		"0x7e48d4102de1Bd47aA456AAE21D899bd898B6954";

	// link to the instance
	const sale = await SilverSale.at(saleAddress);

	// to generate 30/20/10 coupons define code and keys variables first
	const codes0 = [];
	const keys0 = [];
	const codes1 = [];
	const keys1 = [];
	const codes2 = [];
	const keys2 = [];

	// generate 30 Silver Box coupons
	await generateNCouponsOfType(30, 0, codes0, keys0);
	// generate 20 Rotund Silver Box coupons
	await generateNCouponsOfType(20, 1, codes1, keys1);
	// generate 10 Goldish Silver Box coupons
	await generateNCouponsOfType(10, 2, codes2, keys2);

	// save generated coupons into the file
	fs.writeFileSync("./data/silver_codes0_" + network + ".csv", codes0.join("\n"));
	fs.writeFileSync("./data/silver_codes1_" + network + ".csv", codes1.join("\n"));
	fs.writeFileSync("./data/silver_codes2_" + network + ".csv", codes2.join("\n"));

	// print and add coupon codes to be added
	console.log("adding coupon codes (Silver Box):\n%s", codes0.join("\n"));
	await sale.bulkAddCoupons(keys0, 0);
	console.log("adding coupon codes (Rotund Silver Box):\n%s", codes1.join("\n"));
	await sale.bulkAddCoupons(keys1, 1);
	console.log("adding coupon codes (Goldish Silver Box):\n%s", codes2.join("\n"));
	await sale.bulkAddCoupons(keys2, 2);

	console.log("execution complete");
};

// generate a secure random coupon code for box type `i`
async function generateCouponCode(boxType) {
	let couponCode = "";
	for(let j = 0; j < 16; j++) {
		couponCode += String.fromCharCode(await secureRandomInRange(65, 90));
	}
	couponCode += "_" + boxType;
	return couponCode;
}

// generate `n` Silver Box coupons of type `boxType`
async function generateNCouponsOfType(n, boxType, codes, keys) {
	for(let i = 0; i < n; i++) {
		const code = await generateCouponCode(boxType);
		// TODO: use keccak256(string) from shared_functions.js
		const key = web3.utils.soliditySha3(web3.eth.abi.encodeParameter("string", code));
		codes.push(code);
		keys.push(key);
	}
}
