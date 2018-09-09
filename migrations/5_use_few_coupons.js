const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_COUPON_MANAGER = 0x00000100;

const Gem = artifacts.require("./GemERC721");
const Sale = artifacts.require("./CouponSale");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[use few coupons] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[use few coupons] coverage network - skipping the migration script");
		return;
	}

	// token and presale address already exist, presale 2 is new to deploy
	let tokenAddress = "0xeae9d154da7a1cd05076db1b83233f3213a95e4f"; // MainNet token address
	let saleAddress = "0xa207d2496688134f538a307b25e174b267ba6765"; // MainNet Presale address

	let gem = Gem.at(tokenAddress);
	let sale = Sale.at(saleAddress);

	// for test network we use few coupons
	if(network !== "mainnet") {
		tokenAddress = "0x82ff6bbd7b64f707e704034907d582c7b6e09d97";
		gem = Gem.at(tokenAddress);

		saleAddress = "0x08d6a2643197afbd46030473ed6f2479a5b574ad";
		sale = Sale.at(saleAddress);

		// buy few geodes using old presale, create and use few coupons
		await gem.addOperator(saleAddress, ROLE_TOKEN_CREATOR);
		await sale.addCoupon(web3.sha3("COUPON-1"), 1);
		await sale.addCoupon(web3.sha3("COUPON-3"), 3);
		await sale.useCoupon("COUPON-1");
		await sale.useCoupon("COUPON-3");
		await gem.removeOperator(saleAddress);
	}

	console.log("______________________________________________________");
	console.log("gem:        " + tokenAddress);
	console.log("sale:       " + saleAddress);
	console.log("______________________________________________________");
	console.log("supply:     " + await gem.totalSupply());
	console.log("gems:       " + await gem.balanceOf(accounts[0]));
	console.log("geodes:     " + await sale.geodeBalances(accounts[0]));

};
