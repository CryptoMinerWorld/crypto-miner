// Enables the silver / gold sale
const FEATURE_SALE_ENABLED = 0x00000001;
// Enables getting silver / gold for referral points
const FEATURE_GET_ENABLED = 0x00000002;
// Token creator is responsible for creating tokens
const ROLE_TOKEN_CREATOR = 0x00000001;
// Allows issuing referral points
const ROLE_REF_POINTS_ISSUER = 0x00000001;
// Allows consuming referral points
const ROLE_REF_POINTS_CONSUMER = 0x00000002;
// Allows setting an address as known
const ROLE_SELLER = 0x00000004;

// Silver and Gold tokens (ERC20)
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");

// Referral Point Tracker
const Ref = artifacts.require("./RefPointsTracker");

// Silver/Gold Sale
const SilverSale = artifacts.require("./SilverSale");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy silver sale] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy silver sale] coverage network - skipping the migration script");
		return;
	}

	// dependencies: smart contract addresses and external addresses
	let refTrackerAddress = "0xD06d436763a3207a24A3EE393541f924d9b323fd";
	let silverAddress = "0x5eAb0Ea7AC3cC27f785D8e3fABA56b034aa56208";
	let goldAddress = "0x4e55C62f4e2ca19B22c2156273F5900e124B9acD";
	let chest = "0xC352f692F55dEf49f0B736Ec1F7CA0F862eabD23"; // MainNet Founder's Chest (MultiSig)
	let beneficiary = "0xe0123204873fD29A29aEf3f99FaF1b1c45fe3B1E"; // MainNet MultiSig
	let offset = 1550772000; // 02/21/2019 @ 6:00pm UTC


	// for test networks addresses are different
	if(network !== "mainnet") {
		refTrackerAddress = "0x1F85f59eC94725E75B8CfDe50da3e47Bf3605B13";
		silverAddress = "0x901C62b3194C6c460B303537Ab3F39e80f933d48";
		goldAddress = "0x6c4BC3179A2B28f641ae15DD55419240bB61e1A6";
		chest = "0xEE169DCC689D0C358F68Ce95DEf41646039aC190"; // Roman
		beneficiary = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69"; // Basil
		offset = 1551916800; // 03/07/2019 @ 0:00am UTC
	}

	// deploy silver sale
	await deployer.deploy(SilverSale, silverAddress, goldAddress, refTrackerAddress, chest, beneficiary, offset);
	const sale = await SilverSale.deployed();

	// for test networks set all the permissions automatically
	if(network !== "mainnet") {
		// get links to all the deployed instances
		const silver = SilverERC20.at(silverAddress);
		const gold = GoldERC20.at(goldAddress);
		const ref = Ref.at(refTrackerAddress);

		// enable all features and permissions required to enable buy with referral points
		await sale.updateFeatures(FEATURE_SALE_ENABLED | FEATURE_GET_ENABLED);
		await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
		await ref.updateRole(sale.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);
	}

	// deployment successful, print all relevant info to the log
	console.log("________________________________________________________________________");
	console.log("silver:      %s", silverAddress);
	console.log("gold:        %s", goldAddress);
	console.log("ref tracker: %s", refTrackerAddress);
	console.log("chest:       %s", chest);
	console.log("beneficiary: %s", beneficiary);
	console.log("offset:      %s (%d)", new Date(offset * 1000), offset);
	console.log("silver sale: %s", sale.address);
};
