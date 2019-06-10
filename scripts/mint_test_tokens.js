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

// a process to mint tokens in test network
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[mint test tokens] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[mint test tokens] coverage network - skipping the migration script");
		return;
	}
	if(network === "mainnet") {
		console.log("[mint test tokens] mainnet network - skipping the migration script");
		return;
	}

	console.log("network: %o", network);

	// testing addresses
	const testers = [
		"0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", // John
		"0xEE169DCC689D0C358F68Ce95DEf41646039aC190", // Roman
		"0x5F185Da55f7BBD9217E3b3CeE06b180721FA6d34", // Basil
	];

	// deployed instances' addresses
	const conf = { // Ropsten Addresses
		GemERC721:          "0x60014A33fe30E471c406Ddd99361487Ffe7f1189",
		CountryERC721:      "0xf23197d25Ca59e4554Ef7BBcF579971A14882601",
		PlotERC721:         "0x4ED45BeC5762aB8b191Dd978db5609a53F21576f",
		SilverERC20:        "0x7EDC3fea733E790814e3c2A9D997A55f531D8868",
		GoldERC20:          "0x41FecF81B49B9Bc3eC80EdDdffe266922Ff2BD1f",
		ArtifactERC20:      "0x06D09B097D56B5DEB70C31eaa5802d6447913eeC",
		FoundersKeyERC20:   "0x901E6a702D832Cff1356639F4a99046aB4cE4bCa",
		ChestKeyERC20:      "0x604206004488Aa28F5b57dfF4BF3d235cec63234",
		RefPointsTracker:   "0x33e0BD722e9e357bAa7BEF0F0192F7ad889BaD8f",
	};

	// deployed instances
	const instances = {
		GemERC721: await GemERC721.at(conf.GemERC721),
		CountryERC721: await CountryERC721.at(conf.CountryERC721),
		PlotERC721: await PlotERC721.at(conf.PlotERC721),
		SilverERC20: await SilverERC20.at(conf.SilverERC20),
		GoldERC20: await GoldERC20.at(conf.GoldERC20),
		ArtifactERC20: await ArtifactERC20.at(conf.ArtifactERC20),
		FoundersKeyERC20: await FoundersKeyERC20.at(conf.FoundersKeyERC20),
		ChestKeyERC20: await ChestKeyERC20.at(conf.ChestKeyERC20),
		RefPointsTracker: await RefPointsTracker.at(conf.RefPointsTracker),
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
			await instances.GemERC721.mint(to, i + 1, i + 1, color, level, gradeType << 24 | gradeValue);
		}
	}
	// countries - CountryERC721
	for(let i = 0; i < 3 * testers.length; i++) {
		const exists = await instances.CountryERC721.exists(190 - i);
		console.log("%s country %o", (exists? "skipping": "minting"), 190 - i);
		if(!exists) {
			await instances.CountryERC721.mint(testers[i % testers.length], 190 - i);
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

		// Founder's Keys ERC20
		exists = !(await instances.FoundersKeyERC20.balanceOf(testers[i])).isZero();
		console.log((exists? "skipping ": "") + "minting 10 founder's keys " + i);
		if(exists) {
			await instances.FoundersKeyERC20.mint(testers[i], 10);
		}

		// Chest Keys ERC20
		exists = !(await instances.ChestKeyERC20.balanceOf(testers[i])).isZero();
		console.log((exists? "skipping ": "") + "minting 10 chest keys " + i);
		if(!exists) {
			await instances.ChestKeyERC20.mint(testers[i], 10);
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

};
