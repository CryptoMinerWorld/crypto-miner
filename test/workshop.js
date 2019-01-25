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
		const gradeTypeDeltas = [4, 5, 3, 1, 0];

		// perform calculation
		const prices = await workshop.getUpgradePrice(gems, levelDeltas, gradeTypeDeltas);

		// extract silver and gold required values
		const silverRequired = prices[0];
		const goldRequired = prices[1];

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
		 * Silver: 395 = 0 + (15 + 45 + 135) + (15 + 45) + 5 + 135
		 * Gold:   76 = (2 + 4 + 8 + 16) + (1 + 2 + 4 + 8 + 16) + (4 + 8 + 16) + 2 + 0
		 */
		assert.equal(395, silverRequired, "wrong silver required value");
		assert.equal(76, goldRequired, "wrong gold required value")
	});
});

