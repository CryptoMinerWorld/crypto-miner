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

contract('Workshop', (accounts) => {
	it("upgrades: price calculation - general flow", async() => {
		// construct workshop dependencies
		const gem = await Gem.new();
		const silver = await Silver.new();
		const gold = await Gold.new();

		// construct workshop itself
		const workshop = await Workshop.new(gem.address, silver.address, gold.address);

		// define some gem IDs
		const gems = [1, 2, 3, 4, 5];

		// create these gems
		await gem.mint(accounts[0], 1, 1, 0, 1, 1, 1, 2, 1);
		await gem.mint(accounts[0], 2, 1, 0, 1, 1, 2, 1, 1);
		await gem.mint(accounts[0], 3, 1, 0, 1, 1, 2, 3, 1);
		await gem.mint(accounts[0], 4, 1, 0, 1, 1, 1, 2, 1);
		await gem.mint(accounts[0], 5, 1, 0, 1, 1, 4, 1, 1);

		// define level upgrade request
		const levelDeltas = [0, 3, 2, 1, 1];

		// define grade upgrade request
		const gradeDeltas = [4, 5, 3, 1, 0];

		// perform few gem upgrade calculations
		const silverRequired1 = await workshop.getLevelUpPrice(gems[1], levelDeltas[1]);
		const goldRequired1 = await workshop.getUpgradePrice(gems[1], gradeDeltas[1]);

		// perform bulk calculation
		const bulkPrice = await workshop.getBulkUpgradePrice(gems, levelDeltas, gradeDeltas);

		// extract silver and gold required values
		const bulkSilverRequired = bulkPrice[0];
		const bulkGoldRequired = bulkPrice[1];

		/*
		 * Verify calculated values according to the level up and upgrade price table:
		 * Levels:
		 *      1-2:    5
		 *      2-3:    15
		 *      3-4:    45
		 *      4-5:    135
		 * Grades:
		 *      D-C:    1
		 *      C-B:    2
		 *      B-A:    4
		 *      A-AA:   8
		 *      AA-AAA: 16
		 *
		 * Silver (1): 195 = 15 + 45 + 135
		 * Gold (1):   31 = 1 + 2 + 4 + 8 + 16
		 * Silver (Bulk): 395 = 0 + (15 + 45 + 135) + (15 + 45) + 5 + 135
		 * Gold (Bulk):   76 = (2 + 4 + 8 + 16) + (1 + 2 + 4 + 8 + 16) + (4 + 8 + 16) + 2 + 0
		 */
		assert.equal(195, silverRequired1, "wrong silver required (1) value");
		assert.equal(31, goldRequired1, "wrong gold required (1) value");
		assert.equal(395, bulkSilverRequired, "wrong bulk silver required value");
		assert.equal(91, bulkGoldRequired, "wrong bulk gold required value")
	});
});

