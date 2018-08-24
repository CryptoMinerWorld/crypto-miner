const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_COUPON_MANAGER = 0x00000100;

const Gem = artifacts.require("./GemERC721");
const Sale = artifacts.require("./CouponSale");
const Sale2 = artifacts.require("./Presale2");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy presale2] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy presale2] coverage network - skipping the migration script");
		return;
	}

	// where the funds go to: chestVault - 19.05%, beneficiary - 80.95%
	let chestVault = "0xc352f692f55def49f0b736ec1f7ca0f862eabd23"; // MainNet Chest Wallet
	let beneficiary = "0xe0123204873fd29a29aef3f99faf1b1c45fe3b1e"; // MainNet MultiSig
	// MainNet Presale2 launch date: August 15, 8PM EST = August 16, 00:15 UTC - 15 seconds reserved
	let sale2LaunchDate = new Date('2018-08-16T00:15Z').getTime() / 1000 | 0;

	// for test network we redefine MultiSig addresses and launch date
	if(network === "development") {
		// beneficiary = "0xb4e8e4f7e6024b37ed2584e8c86b2917dae9a2da"; // Rinkeby MultiSig
		// chestVault = "0xaF8413e5785d63694cF562Cf2dDA9B59Ff00E0FD"; // Rinkeby Chest Wallet
		beneficiary = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
		chestVault = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
		sale2LaunchDate = new Date().getTime() / 1000 | 0;
		sale2LaunchDate += 3600;
	}

	// token and presale address already exist, presale 2 is new to deploy
	let tokenAddress = "0xeae9d154da7a1cd05076db1b83233f3213a95e4f"; // MainNet token address
	let saleAddress = "0xa207d2496688134f538a307b25e174b267ba6765"; // MainNet Presale address
	let sale2Address = "";

	let gem = Gem.at(tokenAddress);
	let sale = Sale.at(saleAddress);
	// sale2 is defined below

	// for test network we redeploy first Presale
	if(network === "development") {
		tokenAddress = "0x82ff6bbd7b64f707e704034907d582c7b6e09d97";
		gem = Gem.at(tokenAddress);

		saleAddress = "0x08d6a2643197afbd46030473ed6f2479a5b574ad";
		sale = Sale.at(saleAddress);
	}

	// deploy sale 2
	await deployer.deploy(Sale2, saleAddress, chestVault, beneficiary, sale2LaunchDate);
	const sale2 = await Sale2.deployed();
	sale2Address = sale2.address;

	// grant new sale a permission to mint gems
	await gem.addOperator(sale2Address, ROLE_TOKEN_CREATOR);

	// grant permissions to create coupons
	await sale2.addOperator("0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", ROLE_COUPON_MANAGER); // John

	console.log("______________________________________________________");
	console.log("gem:        " + tokenAddress);
	console.log("sale:       " + saleAddress);
	console.log("sale2       " + sale2Address);
	console.log("______________________________________________________");
	console.log("supply:     " + await gem.totalSupply());
	console.log("gems:       " + await gem.balanceOf(accounts[0]));
	console.log("geodes:     " + await sale.geodeBalances(accounts[0]));
	console.log("geodes(2):  " + await sale2.geodeBalances(accounts[0]));

};
