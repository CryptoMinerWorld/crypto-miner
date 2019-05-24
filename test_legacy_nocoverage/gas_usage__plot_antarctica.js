// Plot Antarctica dependencies
const FoundersPlotsMock = artifacts.require("./FoundersPlotsMock.sol");
const Plot = artifacts.require("./PlotERC721.sol");
// Plot Antarctica itself
const Antarctica = artifacts.require("./PlotAntarctica.sol");

// PlotAntarctica gas usage related tests
contract('PlotAntarctica: Gas Usage', (accounts) => {
	it("gas: deploying a SC requires 930,256 gas", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);
		const txHash = s.transactionHash;
		const txReceipt = await web3.eth.getTransactionReceipt(txHash);
		const gasUsed = txReceipt.gasUsed;

		assertEqual(930256, gasUsed, "deploying SC gas usage mismatch: " + gasUsed);
	});

	it("gas: getting one plot requires 276,493 gas", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);
		// enable getting plots feature
		await s.updateFeatures(0x00000001); // get enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator

		// buy one plot in Russia - no country owner
		const gasUsed = (await s.get(1, {from: p})).receipt.gasUsed;

		assertEqual(276493, gasUsed, "getting one plot gas usage mismatch: " + gasUsed);
	});
	it("gas: getting ten plots requires 1,658,096 gas", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);
		// enable getting plots feature
		await s.updateFeatures(0x00000001); // get enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator

		// buy one plot in Russia - no country owner
		const gasUsed = (await s.get(10, {from: p})).receipt.gasUsed;

		assertEqual(1658096, gasUsed, "getting ten plots gas usage mismatch: " + gasUsed);
	});
	it("gas: getting 50 plots requires 7,918,951 gas", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);
		// enable getting plots feature
		await s.updateFeatures(0x00000001); // get enabled feature
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, 0x00000001); // token creator

		// buy one plot in Russia - no country owner
		const gasUsed = (await s.get(50, {from: p})).receipt.gasUsed;

		assertEqual(7918951, gasUsed, "getting 50 plots gas usage mismatch: " + gasUsed);
	});
});

// check if 2 values are equal with a 5% precision
function assertEqual(expected, actual, msg) {
	assertEqualWith(expected, 0.05, actual, msg);
}

// check if 2 values are equal with the 'leeway' precision
function assertEqualWith(expected, leeway, actual, msg) {
	assert(expected * (1 - leeway) < actual && expected * (1 + leeway) > actual, msg);
}

