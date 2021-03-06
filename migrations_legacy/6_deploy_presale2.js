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
	let chestVault = "0xC352f692F55dEf49f0B736Ec1F7CA0F862eabD23"; // MainNet Founder's Chest Wallet
	let beneficiary = "0xe0123204873fd29a29aef3f99faf1b1c45fe3b1e"; // MainNet MultiSig
	// MainNet Presale2 launch date: August 15, 8PM EST = August 16, 00:15 UTC - 15 seconds reserved
	let sale2LaunchDate = new Date('2018-08-16T00:15Z').getTime() / 1000 | 0;

	// for test network we redefine MultiSig addresses and launch date
	if(network !== "mainnet") {
		// chestVault = "0xaF8413e5785d63694cF562Cf2dDA9B59Ff00E0FD"; // Rinkeby Chest Wallet
		// beneficiary = "0xb4e8e4f7e6024b37ed2584e8c86b2917dae9a2da"; // Rinkeby MultiSig
		chestVault = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
		beneficiary = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
		sale2LaunchDate = new Date().getTime() / 1000 | 0;
		sale2LaunchDate += 3600;
	}

	// token and presale address already exist, presale 2 is new to deploy
	let tokenAddress = "0xeAe9d154dA7a1cD05076dB1B83233f3213a95e4F"; // MainNet token address
	let saleAddress = "0xa207d2496688134f538a307b25E174b267bA6765"; // MainNet Presale address
	let sale2Address = "";

	let gem = Gem.at(tokenAddress);
	let sale = Sale.at(saleAddress);
	// sale2 is defined below

	// for test network we redeploy first Presale
	if(network !== "mainnet") {
		tokenAddress = "0x82FF6Bbd7B64f707e704034907d582C7B6E09d97";
		saleAddress = "0x08d6A2643197aFBd46030473ed6F2479A5b574AD";
		if(network === "ropsten") {
			tokenAddress = "0x35B5dA40008B225AB540dbBF28D2B5e74836DF2c";
			saleAddress = "0x410879a9de3aa893b1f987752f0663f759786017";
		}

		gem = Gem.at(tokenAddress);
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

	console.log("________________________________________________________________________");
	console.log("gem:        " + tokenAddress);
	console.log("sale:       " + saleAddress);
	console.log("sale2       " + sale2Address);
	console.log("________________________________________________________________________");
	console.log("supply:     " + await gem.totalSupply());
	console.log("gems:       " + await gem.balanceOf(accounts[0]));
	console.log("geodes:     " + await sale.geodeBalances(accounts[0]));
	console.log("geodes(2):  " + await sale2.geodeBalances(accounts[0]));

};
