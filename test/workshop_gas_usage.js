// Level provider is responsible for enabling the workshop
const ROLE_LEVEL_PROVIDER = 0x00100000;

// Grade provider is responsible for enabling the workshop
const ROLE_GRADE_PROVIDER = 0x00200000;

// Enables gem leveling up and grade type upgrades
const FEATURE_UPGRADES_ENABLED = 0x00000001;

// Token destroyer is responsible for destroying tokens
const ROLE_TOKEN_DESTROYER = 0x00000002;

// GemERC721 smart contract
const Gem = artifacts.require("./GemERC721.sol");
// Silver smart contract
const Silver = artifacts.require("./SilverERC20.sol");
// GoldERC20 smart contract
const Gold = artifacts.require("./GoldERC20.sol");
// Workshop smart contract
const Workshop = artifacts.require("./Workshop.sol");

contract('Workshop: Gas Usage', (accounts) => {
	it("gas: deploying workshop requires 1896069 gas", async() => {
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		const txHash = workshop.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(1896069, gasUsed, "deploying Workshop gas usage mismatch: " + gasUsed);
	});
	it("gas: leveling up a gem requires 77264 gas", async() => {
		const player = accounts[1];
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
		await gem.mint(player, 1, 1, 0, 1, 1, 1, 1, 1);
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER);
		await silver.mint(player, 10000);
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		const gasUsed = (await workshop.upgrade(1, 1, 0, {from: player})).receipt.gasUsed;
		assertEqual(77264, gasUsed, "leveling up a gem gas usage mismatch: " + gasUsed);
	});
	it("gas: leveling up 4 levels requires 112850 gas", async() => {
		const player = accounts[1];
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
		await gem.mint(player, 1, 1, 0, 1, 1, 1, 1, 1);
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER);
		await silver.mint(player, 10000);
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		const gasUsed = (await workshop.upgrade(1, 4, 0, {from: player})).receipt.gasUsed;
		assertEqual(112850, gasUsed, "leveling up 4 levels gas usage mismatch: " + gasUsed);
	});
	it("gas: upgrading a gem requires 83547 gas", async() => {
		const player = accounts[1];
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
		await gem.mint(player, 1, 1, 0, 1, 1, 1, 1, 1);
		await gem.addOperator(workshop.address, ROLE_GRADE_PROVIDER);
		await gold.mint(player, 10000);
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		const gasUsed = (await workshop.upgrade(1, 0, 1, {from: player})).receipt.gasUsed;
		assertEqual(83547, gasUsed, "upgrading a gem gas usage mismatch: " + gasUsed);
	});
	it("gas: leveling up and upgrading a gem requires 113258 gas", async() => {
		const player = accounts[1];
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
		await gem.mint(player, 1, 1, 0, 1, 1, 1, 1, 1);
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER | ROLE_GRADE_PROVIDER);
		await silver.mint(player, 10000);
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		await gold.mint(player, 10000);
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		const gasUsed = (await workshop.upgrade(1, 1, 1, {from: player})).receipt.gasUsed;
		assertEqual(113258, gasUsed, "leveling up and upgrading a gem gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk level up / upgrade of 5 gems requires 661406 gas", async() => {
		const bulkSize = 5;

		const player = accounts[1];
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER | ROLE_GRADE_PROVIDER);
		await silver.mint(player, 10000);
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		await gold.mint(player, 10000);
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		const gemIds = new Array(bulkSize);
		for(let i = 0; i < bulkSize; i++) {
			gemIds[i] = i + 1;
			await gem.mint(player, gemIds[i], 1, 0, 1, 1, 1, 1, 1);
		}
		const lvlUps = new Array(bulkSize).fill(4);
		const upgrades = new Array(bulkSize).fill(5);

		const gasUsed = (await workshop.bulkUpgrade(gemIds, lvlUps, upgrades, {from: player})).receipt.gasUsed;
		assertEqual(661406, gasUsed, "bulk level up / upgrade of " + bulkSize + " gems gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk level up / upgrade of 10 gems requires 1300238 gas", async() => {
		const bulkSize = 10;

		const player = accounts[1];
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER);
		await gem.addRole(workshop.address, ROLE_GRADE_PROVIDER);
		await silver.mint(player, 10000);
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		await gold.mint(player, 10000);
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		const gemIds = new Array(bulkSize);
		for(let i = 0; i < bulkSize; i++) {
			gemIds[i] = i + 1;
			await gem.mint(player, gemIds[i], 1, 0, 1, 1, 1, 1, 1);
		}
		const lvlUps = new Array(bulkSize).fill(4);
		const upgrades = new Array(bulkSize).fill(5);

		const gasUsed = (await workshop.bulkUpgrade(gemIds, lvlUps, upgrades, {from: player})).receipt.gasUsed;
		assertEqual(1300238, gasUsed, "bulk level up / upgrade of " + bulkSize + " gems gas usage mismatch: " + gasUsed);
	});
	it("gas: bulk level up / upgrade of 20 gems requires 2581900 gas", async() => {
		const bulkSize = 20;

		const player = accounts[1];
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);
		await workshop.updateFeatures(FEATURE_UPGRADES_ENABLED);
		await gem.addOperator(workshop.address, ROLE_LEVEL_PROVIDER | ROLE_GRADE_PROVIDER);
		await silver.mint(player, 10000);
		await silver.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);
		await gold.mint(player, 10000);
		await gold.updateRole(workshop.address, ROLE_TOKEN_DESTROYER);

		const gemIds = new Array(bulkSize);
		for(let i = 0; i < bulkSize; i++) {
			gemIds[i] = i + 1;
			await gem.mint(player, gemIds[i], 1, 0, 1, 1, 1, 1, 1);
		}
		const lvlUps = new Array(bulkSize).fill(4);
		const upgrades = new Array(bulkSize).fill(5);

		const gasUsed = (await workshop.bulkUpgrade(gemIds, lvlUps, upgrades, {from: player})).receipt.gasUsed;
		assertEqual(2581900, gasUsed, "bulk level up / upgrade of " + bulkSize + " gems gas usage mismatch: " + gasUsed);
	});
});

// asserts equal with precision of 5%
function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, actual, 0.05, msg);
}

// asserts equal with the precisions defined in leeway
function assertEqualWith(expected, actual, leeway, msg) {
	assert(expected * (1 - leeway) < actual && expected * (1 + leeway) > actual, msg);
}
