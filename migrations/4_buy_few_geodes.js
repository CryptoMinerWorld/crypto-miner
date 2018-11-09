const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_COUPON_MANAGER = 0x00000100;

const Gem = artifacts.require("./GemERC721");
const Sale = artifacts.require("./CouponSale");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[buy few geodes] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[buy few geodes] coverage network - skipping the migration script");
		return;
	}

	// token and presale address already exist, presale 2 is new to deploy
	let tokenAddress = "0xeAe9d154dA7a1cD05076dB1B83233f3213a95e4F"; // MainNet token address
	let saleAddress = "0xa207d2496688134f538a307b25E174b267bA6765"; // MainNet Presale address

	let gem = Gem.at(tokenAddress);
	let sale = Sale.at(saleAddress);

	// for test network we buy some geodes
	if(network !== "mainnet") {
		tokenAddress = "0x82FF6Bbd7B64f707e704034907d582C7B6E09d97";
		saleAddress = "0x08d6A2643197aFBd46030473ed6F2479A5b574AD";
		if(network === "ropsten") {
			tokenAddress = "0x35B5dA40008B225AB540dbBF28D2B5e74836DF2c";
			saleAddress = "0x410879a9de3aa893b1f987752f0663f759786017";
		}

		gem = Gem.at(tokenAddress);
		sale = Sale.at(saleAddress);

		// buy few geodes using old presale, create and use few coupons
		console.log("buying few geodes (development network)");
		const price1 = await sale.currentPrice();
		await gem.addOperator(saleAddress, ROLE_TOKEN_CREATOR);
		await sale.getGeodes({value: price1});
		await sale.getGeodes({value: price1.times(5)});
		await sale.getGeodes({value: price1.times(10)});
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
