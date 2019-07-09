// ERC721 and ERC20 Token smart contracts
const GemERC721 = artifacts.require("./GemERC721");
const CountryERC721 = artifacts.require("./CountryERC721");
const PlotERC721 = artifacts.require("./PlotERC721");
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");
const ArtifactERC20 = artifacts.require("./ArtifactERC20");
const ChestKeyERC20 = artifacts.require("./ChestKeyERC20");
const FoundersKeyERC20 = artifacts.require("./FoundersKeyERC20");
const RefPointsTracker = artifacts.require("./RefPointsTracker");

// Country ERC721 depends on country data
import {COUNTRY_DATA} from "../data/country_data";

// verify mint test tokens scenario for migration script
contract("test tokens", (accounts) => {
	it("mint test tokens", async() => {

		// testing addresses
		const testers = [
			"0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", // John
			"0xEE169DCC689D0C358F68Ce95DEf41646039aC190", // Roman
			"0x5F185Da55f7BBD9217E3b3CeE06b180721FA6d34", // Basil
		];

		// deployed instances
		const instances = {
			GemERC721: await GemERC721.new(),
			CountryERC721: await CountryERC721.new(COUNTRY_DATA),
			PlotERC721: await PlotERC721.new(),
			SilverERC20: await SilverERC20.new(),
			GoldERC20: await GoldERC20.new(),
			ArtifactERC20: await ArtifactERC20.new(),
			ChestKeyERC20: await ChestKeyERC20.new(),
			FoundersKeyERC20: await FoundersKeyERC20.new(),
			RefPointsTracker: await RefPointsTracker.new(),
		};

		// mint few ERC721 tokens
		// gems – GemERC721
		const colors = [1, 2, 5, 6, 7, 9, 10];
		for(let i = 0; i < 0xF * testers.length; i++) {
			const to = testers[i % testers.length];
			const color = colors[i % colors.length];
			const level = 1 + i % 5;
			const gradeType = 1 + i % 6;
			const gradeValue = Math.floor(Math.random() * 1000000);

			const exists = await instances.GemERC721.exists(i + 1);
			console.log("%s gem %o, %o, %o, %o, %o", (exists? "skipping": "minting"), i + 1, color, level, gradeType, gradeValue);
			if(!exists) {
				await instances.GemERC721.mint(to, i + 1, color, level, gradeType << 24 | gradeValue);
			}
		}
		// countries - CountryERC721
		for(let i = 0; i < 3 * testers.length; i++) {
			const exists = await instances.CountryERC721.exists(i + 1);
			console.log("%s country %o", (exists? "skipping": "minting"), i + 1);
			if(!exists) {
				await instances.CountryERC721.mint(testers[i % testers.length], i + 1);
			}
		}
		// plots - PlotERC721
		// Antarctica - 2 tiers
		for(let i = 0; i < 5 * testers.length; i++) {
			const exists = await instances.PlotERC721.exists(i + 1);
			console.log("%s Antarctica plot %o", (exists? "skipping": "minting"), i + 1);
			if(!exists) {
				await instances.PlotERC721.mint(testers[i % testers.length], 0, "0x0200236464646400");
			}
		}
		// Rest of the World - 5 tiers
		for(let i = 0; i < 10 * testers.length; i++) {
			const exists = await instances.PlotERC721.exists(5 * testers.length + i + 1);
			console.log("%s regular plot %o", (exists? "skipping": "minting"), 5 * testers.length + i + 1);
			if(!exists) {
				await instances.PlotERC721.mint(testers[i % testers.length], 0, "0x05002341555F6400");
			}
		}

		// mint few ERC20 tokens
		for(let i = 0; i < testers.length; i++) {
			let exists;

			// Silver ERC20
			exists = !(await instances.SilverERC20.balanceOf(testers[i])).isZero();
			console.log((exists? "skipping ": "") + "minting 10000 silver " + i);
			if(!exists) {
				await instances.SilverERC20.mint(testers[i], 10000);
			}

			// Gold ERC20
			exists = !(await instances.GoldERC20.balanceOf(testers[i])).isZero();
			console.log((exists? "skipping ": "") + "minting 1000 gold " + i);
			if(!exists) {
				await instances.GoldERC20.mint(testers[i], 1000);
			}

			// Artifacts ERC20
			exists = !(await instances.ArtifactERC20.balanceOf(testers[i])).isZero();
			console.log((exists? "skipping ": "") + "minting 10 artifacts " + i);
			if(!exists) {
				await instances.ArtifactERC20.mint(testers[i], 10);
			}

			// Chest Keys ERC20
			exists = !(await instances.ChestKeyERC20.balanceOf(testers[i])).isZero();
			console.log((exists? "skipping ": "") + "minting 10 chest keys " + i);
			if(!exists) {
				await instances.ChestKeyERC20.mint(testers[i], 10);
			}

			// Founder's Keys ERC20
			exists = !(await instances.FoundersKeyERC20.balanceOf(testers[i])).isZero();
			console.log((exists? "skipping ": "") + "minting 10 founder's keys " + i);
			if(!exists) {
				await instances.FoundersKeyERC20.mint(testers[i], 10);
			}
		}

		// issue some referral points
		for(let i = 0; i < testers.length; i++) {
			// check if points already issued
			const exists = !(await instances.RefPointsTracker.balanceOf(testers[i])).isZero();

			if(!exists) {
				// issue some amount
				console.log("issuing ref points " + i);
				await instances.RefPointsTracker.issueTo(testers[i], 2000);
				// consume twice less amount
				console.log("consuming ref points " + i);
				await instances.RefPointsTracker.consumeFrom(testers[i], 1000);
			}
			else {
				console.log("skipping issuing and consuming ref points " + i);
			}
		}

		// check minting was successful
		for(let i = 0; i < testers.length; i++) {
			assert.equal(15, await instances.GemERC721.balanceOf(testers[i]), "wrong gem balance for account " + testers[i]);
			assert.equal(3, await instances.CountryERC721.balanceOf(testers[i]), "wrong country balance for account " + testers[i]);
			assert.equal(15, await instances.PlotERC721.balanceOf(testers[i]), "wrong plot balance for account " + testers[i]);
			assert.equal(10000000, await instances.SilverERC20.balanceOf(testers[i]), "wrong silver balance for account " + testers[i]);
			assert.equal(1000000, await instances.GoldERC20.balanceOf(testers[i]), "wrong gold balance for account " + testers[i]);
			assert.equal(10, await instances.ArtifactERC20.balanceOf(testers[i]), "wrong artifact balance for account " + testers[i]);
			assert.equal(10, await instances.ChestKeyERC20.balanceOf(testers[i]), "wrong chest keys balance for account " + testers[i]);
			assert.equal(10, await instances.FoundersKeyERC20.balanceOf(testers[i]), "wrong founder's keys balance for account " + testers[i]);
		}
	});

});
