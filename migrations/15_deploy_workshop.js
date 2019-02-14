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
		silverAddress = "0x901C62b3194C6c460B303537Ab3F39e80f933d48";
		goldAddress = "0x6c4BC3179A2B28f641ae15DD55419240bB61e1A6";
	}

	// deploy workshop
	await deployer.deploy(Workshop, gemAddress, silverAddress, goldAddress);
	const workshop = await Workshop.deployed();

	// for test networks set all the permissions automatically
	if(network !== "mainnet") {
		// get links to all the deployed instances
		const gem = GemERC721.at(gemAddress);
		const silver = SilverERC20.at(silverAddress);
		const gold = GoldERC20.at(goldAddress);

		// enable upgrades on the workshop
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);

		// grant a workshop ROLE_TOKEN_DESTROYER role on both silver and gold
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		// grant workshop permission to act as a level and grade provider on the gem
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER);
		await gem.addRole(workshop.address, ROLE_GRADE_PROVIDER);
	}

	// deployment successful, print all relevant info to the log
	console.log("________________________________________________________________________");
	console.log("gem:      %s", gemAddress);
	console.log("silver:   %s", silverAddress);
	console.log("gold:     %s", goldAddress);
	console.log("workshop: %s", workshop.address);
};
