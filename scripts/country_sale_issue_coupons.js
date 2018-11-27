const Sale = artifacts.require("./CountrySale");

// using secure random generator instead of default Math.random()
const secureRandomInRange = require("random-number-csprng");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[country sale - issue coupons] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[country sale - issue coupons] coverage network - skipping the migration script");
		return;
	}

	// deployed sale smart contract address
	let saleAddress = "0x66d106B2aebF18693177e9FdF72D4088e52943cB"; // MainNet sale address
	if(network !== "mainet") {
		saleAddress = "0x63E70723c2D871b032DE07236C17FA03453551e1"; // Rinkeby sale address
	}

	// link to deployed sale contract
	const sale = Sale.at(saleAddress);

	// 20 coupons starting from country 171 (5 plots countries) – for mainnet
	let offset = 171;
	let length = 20;

	// 40 coupons starting from country 151 - for testnets
	if(network !== "mainnet") {
		offset = 151;
		length = 40;
	}

	// generate coupons for the countries in the list
	const couponCodes = [];
	const couponKeys = [];
	for(let i = offset; i < offset + length; i++) {
		let couponCode = await generateCouponCode(i);
		couponCodes.push(couponCode);
		couponKeys.push(web3.sha3(couponCode));
	}

	// print all coupons to be added
	console.log("coupon codes to add:");
	for(let i = 0; i < length; i++) {
		console.log(couponCodes[i] + "\t" + couponKeys[i]);
	}

	// register created coupons in smart contract
	for(let i = 0; i < length; i++) {
		await sale.addCoupon(couponKeys[i], i + offset);
		console.log("added coupon " + couponCodes[i] + " -> " + couponKeys[i]);
	}

};

// generate a secure random coupon code for country `i`
async function generateCouponCode(i) {
	let couponCode = "";
	for(let j = 0; j < 16; j++) {
		couponCode += String.fromCharCode(await secureRandomInRange(65, 90));
	}
	couponCode += "_" + i;
	return couponCode;
}
