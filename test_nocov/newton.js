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
const CSV_HEADER = "i,age,resting energy,unused age,deviation";

// Miner smart contract tests
contract('Miner Math', (accounts) => {
	it("math: Newton's method (a -> r -> a)", async() => {
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

		// make exponential iterations
		for(let i = 0; i < 1500; i++) {
			const a0 = Math.floor(Math.exp((i)/100) - 1) + i;
			const r = (await miner.restingEnergy(a0)).toNumber();
			const a = (await miner.unusedEnergeticAge(r)).toNumber();
			const dev = Math.abs(a0 - a) / (a0 + 239);
			write_csv("./data/newton.csv", CSV_HEADER, `${i},${a0},${r},${a},${Math.abs(a0 - a)}`);
			if(dev >= 0.01) {
				console.log(`too big deviation - ${i},${a0},${r},${a} -> ${dev}`);
			}
			//assert(Math.abs(i - a) / (i + 239) < 0.01, `too big deviation - ${i},${r},${a}`);
		}
	});
});

// import shared functions
import {write_csv} from "../scripts/shared_functions";
