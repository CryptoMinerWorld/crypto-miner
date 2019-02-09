// Enables gem leveling up and grade type upgrades (workshop)
const FEATURE_UPGRADES_ENABLED = 0x00000001;
// Token destroyer is responsible for destroying tokens (silver/gold)
const ROLE_TOKEN_DESTROYER = 0x00000002;

// Level provider is responsible for enabling the workshop (gem)
const ROLE_LEVEL_PROVIDER = 0x00100000;
// Grade provider is responsible for enabling the workshop (gem)
const ROLE_GRADE_PROVIDER = 0x00200000;

// Gem token (ERC721)
const GemERC721 = artifacts.require("./GemERC721");

// Silver and Gold tokens (ERC20)
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");

// Workshop
const Workshop = artifacts.require("./Workshop");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy workshop] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy workshop] coverage network - skipping the migration script");
		return;
	}

	// deployed gem instance address
	let gemAddress = "0xeAe9d154dA7a1cD05076dB1B83233f3213a95e4F";
	// deployed silver and gold smart contract addresses
	let silverAddress = "";
	let goldAddress = "";

	// for test networks addresses are different
	if(network !== "mainnet") {
		gemAddress = "0x82FF6Bbd7B64f707e704034907d582C7B6E09d97";
		silverAddress = "0x659b95eC3A948D25b091c871f51fbb9292Ed2452";
		goldAddress = "0xAFCf531dBD2D976FB85a02E8356f55cc2cae36EA";
	}

	// deploy workshop
	await deployer.deploy(Workshop, gemAddress, silverAddress, goldAddress);

	// get links to all the deployed instances
	const gem = GemERC721.at(gemAddress);
	const silver = SilverERC20.at(silverAddress);
	const gold = GoldERC20.at(goldAddress);
	const workshop = await Workshop.deployed();

	// enable upgrades on the workshop
	await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);

	// grant a workshop ROLE_TOKEN_DESTROYER role on both silver and gold
	await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
	await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

	// grant workshop permission to act as a level and grade provider on the gem
	await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER);
	await gem.addRole(workshop.address, ROLE_GRADE_PROVIDER);

	console.log("________________________________________________________________________");
	console.log("gem:      " + gemAddress);
	console.log("silver:   " + silverAddress);
	console.log("gold:     " + goldAddress);
	console.log("workshop: " + workshop.address);
};
