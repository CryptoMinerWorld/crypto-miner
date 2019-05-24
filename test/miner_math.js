// Miner smart contract dependencies
const Gem = artifacts.require("./GemERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");
const Artifact = artifacts.require("./PlotERC721.sol"); // TODO
const Silver = artifacts.require("./SilverERC20.sol");
const Gold = artifacts.require("./GoldERC20.sol");
const ArtifactERC20 = artifacts.require("./ArtifactERC20.sol");
const FoundersKey = artifacts.require("./FoundersKeyERC20.sol");
const ChestKey = artifacts.require("./ChestKeyERC20.sol");

// Miner smart contract itself
const Miner = artifacts.require("./Miner.sol");

// CSV Header
const CSV_HEADER = "age,resting energy,unused age";

// Miner smart contract tests
contract('Miner Math', (accounts) => {
	it("math: Newton's method", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		for(let i = 0; i < 50000; i++) {
			const r = await miner.restingEnergy(i);
			const a = await miner.unusedEnergeticAge(r);
			write_csv("./data/newton.csv", CSV_HEADER, `${i},${r.toNumber()},${a.toNumber()}`);
			// assertEqualWith(i, a.toNumber(), 50, `too big leeway - ${i},${r.toNumber()},${a.toNumber()}`);
		}
	});


});

// import shared functions
import {write_csv} from "../scripts/shared_functions";

// asserts equal with the precisions defined in leeway (absolute value)
function assertEqualWith(expected, actual, leeway, msg) {
	assert(expected - leeway < actual && expected + leeway > actual, msg);
}
