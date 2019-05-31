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

	// testing addresses
	const testers = [
		"0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6", // John
		"0xEE169DCC689D0C358F68Ce95DEf41646039aC190", // Roman
		"0x5F185Da55f7BBD9217E3b3CeE06b180721FA6d34", // Basil
	];

	// deployed instances' addresses
	const conf = {
		GemERC721: "0x874828Da14178e4C07Fd32FA37cDFC8BbE5bDb6E",
		CountryERC721: "0xD6c9bf5b99B18D8ff48d6E8B622624ea98b9AB46",
		PlotERC721: "0x7d45f25636BcF3B19e0527ab0F7cFB7839ba74ac",
		SilverERC20: "0xeb5aBE47DD8766443D6d386bDe8117098BAadAF4",
		GoldERC20: "0x17787355dd0ACD6f890051a1BddF1659Ce63C022",
		ArtifactERC20: "0x06D32F8E3792a7F08f54A165Cb302b0c0612B689",
		ChestKeyERC20: "0x62Ef1c0f809e7dEbc866c3EBdDF89d2B61AE6C48",
		FoundersKeyERC20: "0x9ac197768D4bC204aD83CC8c9E564F6B66a98170",
		RefPointsTracker: "0x3E73B24CBfbc0C14eaE581384E0D1681f80e88bf",
	};

	// deployed instances
	const instances = {
		GemERC721: await GemERC721.at(conf.GemERC721),
		CountryERC721: await CountryERC721.at(conf.CountryERC721),
		PlotERC721: await PlotERC721.at(conf.PlotERC721),
		SilverERC20: await SilverERC20.at(conf.SilverERC20),
		GoldERC20: await GoldERC20.at(conf.GoldERC20),
		ArtifactERC20: await ArtifactERC20.at(conf.ArtifactERC20),
		ChestKeyERC20: await ChestKeyERC20.at(conf.ChestKeyERC20),
		FoundersKeyERC20: await FoundersKeyERC20.at(conf.FoundersKeyERC20),
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
		console.log("\tminting gem %o, %o, %o, %o, %o", i + 1, color, level, gradeType, gradeValue);
		if(!await instances.GemERC721.exists(i + 1)) {
			await instances.GemERC721.mint(to, i + 1, i + 1, color, level, gradeType << 24 | gradeValue);
		}
	}
	// countries - CountryERC721
	for(let i = 0; i < 3 * testers.length; i++) {
		console.log("\tminting country %o", i + 1);
		if(!await instances.CountryERC721.exists(i + 1)) {
			await instances.CountryERC721.mint(testers[i % testers.length], i + 1);
		}
	}
	// plots - PlotERC721
	// Antarctica - 2 tiers
	for(let i = 0; i < 5 * testers.length; i++) {
		console.log("\tminting Antarctica plot %o", i + 1);
		if(!await instances.PlotERC721.exists(i + 1)) {
			await instances.PlotERC721.mint(testers[i % testers.length], 0, "0x0200236464646400");
		}
	}
	// Rest of the World - 5 tiers
	for(let i = 0; i < 10 * testers.length; i++) {
		console.log("\tminting regular plot %o", 5 * testers.length + i + 1);
		if(!await instances.PlotERC721.exists(5 * testers.length + i + 1)) {
			await instances.PlotERC721.mint(testers[i % testers.length], 0, "0x05002341555F6400");
		}
	}

	// mint few ERC20 tokens
	for(let i = 0; i < testers.length; i++) {
		// Silver ERC20
		console.log("\tminting silver " + i);
		await instances.SilverERC20.mint(testers[i], 10000);
		// Gold ERC20
		console.log("\tminting gold " + i);
		await instances.GoldERC20.mint(testers[i], 1000);
		// Artifacts ERC20
		console.log("\tminting artifacts " + i);
		await instances.ArtifactERC20.mint(testers[i], 10);
		// Chest Keys ERC20
		console.log("\tminting chest keys " + i);
		await instances.ChestKeyERC20.mint(testers[i], 10);
		// Founder's Keys ERC20
		console.log("\tminting founder's keys " + i);
		await instances.FoundersKeyERC20.mint(testers[i], 10);
	}

	// issue some referral points
	for(let i = 0; i < testers.length; i++) {
		// issue some amount
		console.log("\tissuing ref points " + i);
		await instances.RefPointsTracker.issueTo(testers[i], 2000);
		// consume twice less amount
		console.log("\tconsuming ref points " + i);
		await instances.RefPointsTracker.consumeFrom(testers[i], 1000);
	}

};
