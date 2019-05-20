// World Plot Sale dependencies
const Tracker = artifacts.require("./RefPointsTracker.sol");
const Country = artifacts.require("./CountryERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");
// World Plot Sale itself
const Sale = artifacts.require("./PlotSale.sol");

// Plot Antarctica dependencies
const FoundersPlotsMock = artifacts.require("./FoundersPlotsMock.sol");
// Plot Antarctica itself
const Antarctica = artifacts.require("./PlotAntarctica.sol");

// import country data
import {COUNTRY_DATA} from "../data/country_data";

// auxiliary variable 2 as BigNumber
const two = web3.toBigNumber(2);

// Tiers randomized structure related tests
contract('Tiers RND', (accounts) => {
	it("rnd: tiers2 (Antarctica) structure randomization", async() => {
		// define plot Antarctica dependencies
		const m = await FoundersPlotsMock.new(); // Founders Plots Mock simulates Presale2
		const t = await Plot.new(); // plot ERC721

		// instantiate plot Antarctica smart contract
		const s = await Antarctica.new(m.address, t.address);

		// generate 200 randomized tier structures
		const tiersArray = await s.random2TiersArray(0, 200);

		// define header for output CSV file
		const csv_header = "tier1,tier2,tier3,tier4,tier5";
		// evaluate data for output CSV file
		const csv_data = tiersArray.map(tiers => {
			const t = new Array(5);
			for(let i = 0; i < t.length; i++) {
				t[i] = tiers.dividedToIntegerBy(two.pow(8 * (5 - i))).modulo(256).toNumber();
			}
			return t.join(",");
		}).join("\n");

		// write statistical raw data into the file
		write_csv("./data/tiers2_structure.csv", csv_header, csv_data);

		// TODO: verify some statistics constraints
	});

	it("rnd: tiers5 structure randomization", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);

		// generate 1000 randomized tier structures
		const tiersArray = await s.random5TiersArray(0, 1000);

		// define header for output CSV file
		const csv_header = "tier1,tier2,tier3,tier4,tier5";
		// evaluate data for output CSV file
		const csv_data = tiersArray.map(tiers => {
			const t = new Array(5);
			for(let i = 0; i < t.length; i++) {
				t[i] = tiers.dividedToIntegerBy(two.pow(8 * (5 - i))).modulo(256).toNumber();
			}
			return t.join(",");
		}).join("\n");

		// write statistical raw data into the file
		write_csv("./data/tiers5_structure.csv", csv_header, csv_data);

		// TODO: verify some statistics constraints
	});
});


// import function to write CSV data
import {write_csv} from "../scripts/shared_functions";
