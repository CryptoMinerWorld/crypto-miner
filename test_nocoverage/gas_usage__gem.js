const Gem = artifacts.require("./GemERC721.sol");

contract('GemERC721: Gas Usage', (accounts) => {
	it("gas: deploying GemERC721 requires ? gas");
	it("gas: minting a gem requires 208526 gas", async() => {
		const player = accounts[1];
		const gem = await Gem.new();
		const gasUsed = (await gem.mint(player, 1, 1, 0, 1, 1, 1, 1, 1)).receipt.gasUsed;
		assertEqual(208526, gasUsed, "minting a gem usage mismatch: " + gasUsed);
	});
	it("gas: leveling up a gem requires ? gas");
	it("gas: upgrading a gem requires ? gas");
	it("gas: updating gem state requires 32987 gas", async() => {
		const player = accounts[1];
		const gem = await Gem.new();
		await gem.mint(player, 1, 1, 0, 1, 1, 1, 1, 1);
		const gasUsed = (await gem.setState(1, 1)).receipt.gasUsed;
		assertEqual(32987, gasUsed, "updating gem state gas usage mismatch: " + gasUsed);
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
