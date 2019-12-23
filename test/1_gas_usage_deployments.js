// List of smart contract to deploy
const FoundersPlots = artifacts.require("./FoundersPlotsMock");
const BalanceProxy = artifacts.require("./BalanceProxy");
const TokenHelper = artifacts.require("./TokenHelper");
const TokenReader = artifacts.require("./TokenReader");
const TokenWriter = artifacts.require("./TokenWriter");
const DutchAuction = artifacts.require("./DutchAuction");

const RefPointsTracker = artifacts.require("./RefPointsTracker");
const ArtifactERC20 = artifacts.require("./ArtifactERC20");
const FoundersKeyERC20 = artifacts.require("./FoundersKeyERC20");
const ChestKeyERC20 = artifacts.require("./ChestKeyERC20");
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");
const CountryERC721 = artifacts.require("./CountryERC721");
const PlotERC721 = artifacts.require("./PlotERC721");
const GemERC721 = artifacts.require("./GemERC721");

const Workshop = artifacts.require("./Workshop");
const SilverSale = artifacts.require("./SilverSale");

const PlotSale = artifacts.require("./PlotSale");
const PlotAntarctica = artifacts.require("./PlotAntarctica");

const Miner = artifacts.require("./Miner");

const MintHelper = artifacts.require("./MintHelper");

const GemBurner = artifacts.require("./GemBurner");

// import country data
import {COUNTRY_DATA} from "../data/country_data";

// Smart contract deployment gas measuring
contract('Gas (Deployment)', (accounts) => {
	it("deployment costs", async() => {
		const foundersPlots = await deploy(FoundersPlots);
		await deploy(BalanceProxy);
		await deploy(TokenHelper);
		await deploy(TokenReader);
		await deploy(TokenWriter);
		await deploy(DutchAuction);

		const ref = await deploy(RefPointsTracker);
		const artifact20 = await deploy(ArtifactERC20);
		const foundersKey = await deploy(FoundersKeyERC20);
		const chestKey = await deploy(ChestKeyERC20);
		const silver = await deploy(SilverERC20);
		const gold = await deploy(GoldERC20);
		const country = await deploy(CountryERC721, COUNTRY_DATA);
		const plot = await deploy(PlotERC721);
		const gem = await deploy(GemERC721);

		await deploy(Workshop, gem, silver, gold);
		await deploy(SilverSale, ref, silver, gold, accounts[1], accounts[2], 1552500000);
		await deploy(PlotSale, ref, country, plot, accounts[1], accounts[2], accounts[3], 1563210000);
		await deploy(PlotAntarctica, foundersPlots, plot);
		await deploy(Miner, gem, plot, accounts[10], silver, gold, artifact20, foundersKey, chestKey);
		await deploy(MintHelper, gem);
		await deploy(GemBurner, gem, silver, gold);
	})
});

async function deploy(contract, ...params) {
	const instance = await contract.new(...params);
	const txHash = instance.transactionHash;
	const txReceipt = await web3.eth.getTransactionReceipt(txHash);
	const gasUsed = txReceipt.gasUsed;
	console.log("\t%o: %o gas used", contract.contractName, gasUsed);
	return instance.address;
}