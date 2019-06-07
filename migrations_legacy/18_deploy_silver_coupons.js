// Enables using coupons i.e. exchanging them for boxes
const FEATURE_USING_COUPONS_ENABLED = 0x00000001;
// Token creator is responsible for creating tokens
const ROLE_TOKEN_CREATOR = 0x00000001;
// Allows setting an address as known
const ROLE_SELLER = 0x00000004;

// Silver and Gold tokens (ERC20)
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");
// Referral Point Tracker
const Ref = artifacts.require("./RefPointsTracker");
// Silver/Gold Sale
const SilverSale = artifacts.require("./SilverSale");

// Silver/Gold Coupons smart contract
const SilverCoupons = artifacts.require("./SilverCoupons");

// using secure random generator instead of default Math.random()
const secureRandomInRange = require("random-number-csprng");

// using file system to create raw csv data file
const fs = require('fs');

// deploys silver sale coupons smart contract,
// adds 30/20/10 coupon codes to it
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy silver coupons] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy silver coupons] coverage network - skipping the migration script");
		return;
	}

	// dependencies: smart contract addresses and external addresses
	let refTrackerAddress = "0xD06d436763a3207a24A3EE393541f924d9b323fd";
	let silverAddress = "0x5eAb0Ea7AC3cC27f785D8e3fABA56b034aa56208";
	let goldAddress = "0x4e55C62f4e2ca19B22c2156273F5900e124B9acD";
	let silverSaleAddress = "0x8D060AB4F2543A3b785Ba724bCfC2cEE47031E09";

	// for test networks addresses are different
	if(network !== "mainnet") {
		refTrackerAddress = "0x1F85f59eC94725E75B8CfDe50da3e47Bf3605B13";
		silverAddress = "0x901C62b3194C6c460B303537Ab3F39e80f933d48";
		goldAddress = "0x6c4BC3179A2B28f641ae15DD55419240bB61e1A6";
		silverSaleAddress = "0x36391d55755997Ea529D27Dc49a75138A14eb293";
	}

	// deploy silver coupons
	await deployer.deploy(SilverCoupons, silverAddress, goldAddress, refTrackerAddress, silverSaleAddress);
	const coupons = await SilverCoupons.deployed();

	// by default we enable all the permissions only on test networks
	if(network !== "mainnet") {
		// get links to the deployed instances
		const ref = Ref.at(refTrackerAddress);
		const silver = SilverERC20.at(silverAddress);
		const gold = GoldERC20.at(goldAddress);

		// grant all the required permissions
		// enable required features and give the coupons all the required permissions
		await coupons.updateFeatures(FEATURE_USING_COUPONS_ENABLED);
		await silver.updateRole(coupons.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(coupons.address, ROLE_TOKEN_CREATOR); // gold is not required for silver box coupon
		await ref.updateRole(coupons.address, ROLE_SELLER);
	}

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
	// print coupon codes to be added
	console.log("adding coupon codes (Silver Box):\n%s", codes0.join("\n"));
	console.log("adding coupon codes (Rotund Silver Box):\n%s", codes1.join("\n"));
	console.log("adding coupon codes (Goldish Silver Box):\n%s", codes2.join("\n"));

	// bulk add the codes generated:
	await coupons.bulkAddCoupons(keys0, 0);
	await coupons.bulkAddCoupons(keys1, 1);
	await coupons.bulkAddCoupons(keys2, 2);

	// deployment successful, print all relevant info to the log
	console.log("________________________________________________________________________");
	console.log("silver:         %s", silverAddress);
	console.log("gold:           %s", goldAddress);
	console.log("ref tracker:    %s", refTrackerAddress);
	console.log("silver sale:    %s", silverAddress);
	console.log("silver coupons: %s", coupons.address);
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
		const key = web3.sha3(code);
		codes.push(code);
		keys.push(key);
	}
}
