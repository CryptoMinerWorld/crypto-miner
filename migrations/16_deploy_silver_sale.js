// Enables the silver / gold sale
const FEATURE_SALE_ENABLED = 0x00000001;
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
	let silverAddress = "";
	let goldAddress = "";
	let refAddress = "";
	let chest = "";
	let beneficiary = "";
	let offset = new Date('2019-92-20T18:00Z').getTime() / 1000 | 0;


	// for test networks addresses are different
	if(network !== "mainnet") {
		silverAddress = "0x453BeAB356D103666FCdc437798630D4CD6B3399";
		goldAddress = "0xe58Bfc8722C6d7Aa9fA52309154BE3a74650e0Be";
		refAddress = "0x83cB6C8A7AB25c1058a3D282Bb8699d631121D25";
		chest = "0xEE169DCC689D0C358F68Ce95DEf41646039aC190"; // Roman
		beneficiary = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69"; // Basil
		offset = new Date().getTime() / 1000 | 0;
	}

	// deploy silver sale
	await deployer.deploy(SilverSale, silverAddress, goldAddress, refAddress, chest, beneficiary, offset);

	// get links to all the deployed instances
	const silver = SilverERC20.at(silverAddress);
	const gold = GoldERC20.at(goldAddress);
	const ref = Ref.at(refAddress);
	const sale = await SilverSale.deployed();

	// enable all features and permissions required to enable buy with referral points
	await sale.updateFeatures(FEATURE_SALE_ENABLED);
	await silver.updateRole(sale.address, ROLE_TOKEN_CREATOR);
	await gold.updateRole(sale.address, ROLE_TOKEN_CREATOR);
	await ref.updateRole(sale.address, ROLE_REF_POINTS_ISSUER | ROLE_REF_POINTS_CONSUMER | ROLE_SELLER);

	// deployment successful, print all relevant
	console.log("______________________________________________________");
	console.log("silver:      " + silverAddress);
	console.log("gold:        " + goldAddress);
	console.log("ref tracker: " + refAddress);
	console.log("chest:       " + chest);
	console.log("beneficiary: " + beneficiary);
	console.log("offset:      " + offset);
	console.log("silver sale: " + sale.address);
};
