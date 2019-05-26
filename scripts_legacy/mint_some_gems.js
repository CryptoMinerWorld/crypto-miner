/**
 * Mint some gems for testing – test networks only!
 */

const Gem = artifacts.require("./GemERC721");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[mint some gems] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[mint some gems] coverage network - skipping the migration script");
		return;
	}
	if(network === "mainnet") {
		console.warn("[mint some gems] !!!main network!!! - aborting execution");
		return;
	}

	const colors = [9, 10, 1, 2];

	for(let i = 0; i < 100; i++) {
		await Gem.at("0x82FF6Bbd7B64f707e704034907d582C7B6E09d97").mint(
			"0xEE169DCC689D0C358F68Ce95DEf41646039aC190",
			0x10001 + i,
			1024,
			0,
			i,
			colors[i % colors.length],
			1,
			1,
			0
		);
	}

};
