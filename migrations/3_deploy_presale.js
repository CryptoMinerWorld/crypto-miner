const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_COUPON_MANAGER = 0x00000100;

const Gem = artifacts.require("./GemERC721");
const Sale = artifacts.require("./CouponSale");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy presale] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy presale] coverage network - skipping the migration script");
		return;
	}

	// where the funds go to: chestVault - 19.05%, beneficiary - 80.95%
	let chestVault = "0xC352f692F55dEf49f0B736Ec1F7CA0F862eabD23"; // MainNet Founder's Chest Wallet
	let beneficiary = "0xe0123204873fd29a29aef3f99faf1b1c45fe3b1e"; // MainNet MultiSig

	// for test network we redefine MultiSig addresses accordingly
	if(network !== "mainnet") {
		// chestVault = "0xaF8413e5785d63694cF562Cf2dDA9B59Ff00E0FD"; // Rinkeby Chest Wallet
		// beneficiary = "0xb4e8e4f7e6024b37ed2584e8c86b2917dae9a2da"; // Rinkeby MultiSig
		chestVault = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
		beneficiary = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
	}

	// token and presale address already exist, presale 2 is new to deploy
	let tokenAddress = "0xeAe9d154dA7a1cD05076dB1B83233f3213a95e4F"; // MainNet token address
	let saleAddress = "0xa207d2496688134f538a307b25E174b267bA6765"; // MainNet Presale address

	let gem = Gem.at(tokenAddress);
	let sale = Sale.at(saleAddress);

	// for test network we redeploy first Presale
	if(network !== "mainnet") {
		tokenAddress = "0x82FF6Bbd7B64f707e704034907d582C7B6E09d97";
		if(network === "ropsten") {
			tokenAddress = "0x35B5dA40008B225AB540dbBF28D2B5e74836DF2c";
		}

		gem = Gem.at(tokenAddress);

		console.log("deploying Presale (development network)");
		await deployer.deploy(Sale, tokenAddress, chestVault, beneficiary);
		sale = await Sale.deployed();
		saleAddress = sale.address;
	}

	console.log("______________________________________________________");
	console.log("gem:        " + tokenAddress);
	console.log("sale:       " + saleAddress);
	console.log("______________________________________________________");
	console.log("supply:     " + await gem.totalSupply());
	console.log("gems:       " + await gem.balanceOf(accounts[0]));
	console.log("geodes:     " + await sale.geodeBalances(accounts[0]));

};
