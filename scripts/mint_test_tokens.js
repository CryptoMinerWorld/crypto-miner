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
		RefPointsTracker:   "0xF703407ADbFFC0d7f7Fe413eE86Cc82c9f51Df06",
		ArtifactERC20:      "0xa14F80E7F7333122B634Fea9EA5990C53100fDa0",
		FoundersKeyERC20:   "0x9bBEE0dA678FcDdf30b4D7e8434FeC3D45b4694F",
		ChestKeyERC20:      "0x00D14DFB6a5A0a240700C563A732e71cDD2FF455",
		SilverERC20:        "0xB373E86e650236CAf952F6cdE206dfe196FeEC35",
		GoldERC20:          "0xbE713aC93fF6d7e0dA88e024DC9Cf0d5D05c3A5A",
		CountryERC721:      "0xdccf4653fc2F90e6fC0B151E0b9B7CFE4eF63402",
		PlotERC721:         "0x33369f4870703489CE21B8BeF92ADa5820b5ffED",
		GemERC721:          "0x8ad156dA5ea1053D4858987Ca1165151B5702479",
	};

	// deployed instances
	const instances = {
		RefPointsTracker: await RefPointsTracker.at(conf.RefPointsTracker),
		ArtifactERC20: await ArtifactERC20.at(conf.ArtifactERC20),
		FoundersKeyERC20: await FoundersKeyERC20.at(conf.FoundersKeyERC20),
		ChestKeyERC20: await ChestKeyERC20.at(conf.ChestKeyERC20),
		SilverERC20: await SilverERC20.at(conf.SilverERC20),
		GoldERC20: await GoldERC20.at(conf.GoldERC20),
		CountryERC721: await CountryERC721.at(conf.CountryERC721),
		PlotERC721: await PlotERC721.at(conf.PlotERC721),
		GemERC721: await GemERC721.at(conf.GemERC721),
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

	console.log("minting complete");

};
