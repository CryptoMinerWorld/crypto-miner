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
	let saleAddress = "";
	if(network !== "mainet") {
		saleAddress = "0x63E70723c2D871b032DE07236C17FA03453551e1";
	}

	const sale = Sale.at(saleAddress);

	// 20 coupons starting from country 171
	const offset = 151;
	const length = 20;

	// generate 20 coupons for the last 20 (5-plots) countries
	const couponCodes = [];
	for(let i = offset; i < offset + length; i++) {
		let couponCode = await generateCouponCode(i);
		couponCodes.push(couponCode);
	}

	// print all coupons to be added
	console.log("coupon codes to add:");
	for(const couponCode of couponCodes) {
		console.log(couponCode);
	}

	// register created coupons in smart contract
	for(let i = 0; i < length; i++) {
		await sale.addCoupon(web3.sha3(couponCodes[i]), i + offset);
		console.log("added coupon " + couponCodes[i]);
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
