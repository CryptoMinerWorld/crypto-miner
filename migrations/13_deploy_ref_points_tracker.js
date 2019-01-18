const Tracker = artifacts.require("./RefPointsTracker");

const addresses_issued = [
	"0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69",
	"0xe66338c67b82fcaa0ac4c8369c74c2b4ec5a0bad",
	"0xfdf03cf3c7a260fdb732929948fd5c3cb39544bf",
	"0x4c83d4dca7b0e92a4b7e108e98f59178680a5acb",
	"0xc69325fe2449fbdc064018b0c0ca246e7067db54",
	"0x220c30ce36bbb22b57bd1c60e9ee4dcf44ca211d",
	"0x183febd8828a9ac6c70c0e27fbf441b93004fc05",
	"0x718ffdc2b4e813e7d200c6086b5425fd6a219cff",
	"0xe820f08968489c466c77c2ea1a5c436d8c70d896",
	"0xd1692f1c6b50d299993363be1c869e3e64842732",
	"0x921e7ebebfb4f37a3770c5ccafc108ac31c8d438",
	"0x360bbad1120b0abf63573e2e21b6727e07d1bf18",
	"0x765fec224e701c36870f088bab3d18648eb765e3",
	"0xc857ec9a3ed2c59cbbc4954f11311fdd7532db15",
	"0x22406c0a2eb0a0a1c4fdabd56f695f205e3fa2d1",
	"0x5d92fd7e52f9ba04abb84d80c1a107dfe51f8473",
	"0xa1559b8c9b52dfdc6300549e3f6a8374b91bd50e",
	"0x80ea4ece903c42497cd7a41f541985c7211d6216",
	"0x0e75143296497f488f0e5a3bb3cf11ed9328fd78",
	"0x965a166c4c6f662fcee05902bf2e137afa80b3a2",
	"0xbbef61229a8d6eb2d6fb5d3a968af24a95984f0e",
	"0xbd55b2e3167637b71dd41e31f84d223930584798",
	"0xd820e895956e5315f813a53b2bb9cea29b6adc61",
	"0x2aab510050bdabcd204c9c6877a2281fc122e946",
	"0x040bfa96615fceed61e68223fef17b72ec0197ff",
	"0xaec539a116fa75e8bdcf016d3c146a25bc1af93b",
	"0x95cd2b7e952cda42d16d21d07c49f66ae14da2ec",
	"0xd1f622d61a11cd420415cb7de5482956d761dbe8",
	"0x726614e49e844aae1c167a293bd06beca8a51705",
	"0xcff9963b8602dfbb7fb0a44c2d5c73aa1bcbff03",
	"0x5c4a99410bbb5fdd330c65488afaaa121e7fb437",
	"0x263b604509d6a825719859ee458b2d91fb7d330d",
	"0xa9232c4ef4725a8a256ab638065ac03eb8651fa0",
	"0x30404a2900e8ea5c08eeeb284e9b2bebfc01c58d",
	"0xf39d65ecfea0497cb5911dc499222f81506ca249",
	"0xd3758d7a3f28b0ebb44be71bb78bdd773b1b14c2",
	"0xa15e09311a8b0fcc8edebdceb427eeaf1cf96d98",
	"0xf5e37e330b170d7c9b7ebec5f6dd92d71a1b45a4",
	"0x573a6bf63ad5e24275f686e9655731cc6048e005",
	"0x22f0146e4ffdf109b7069bb92f4f421edee87d4e",
	"0x91bda0b13aeb5ec89533fcd4f5b190e1ac93f5ca",
	"0x21ae65e0d62775a01ebd6a292994080c91fa92f8",
	"0xb51694051d0294eccda91b62b05c7637b5bf348b",
	"0xb9ace70ce234180f009aee04fc84fd755856fe86",
	"0xbc1b89612b8c8e006929197569818e785e427bfb",
	"0x35632b6976b5b6ec3f8d700fabb7e1e0499c1bfa",
	"0xdd25963251fceb0a7bef9bb713eed260829f5656",
	"0xf73421c341218cb40148a9bdfc60fa7b989576c8",
	"0x8735117d6110ae36fd15ac093046ac9a31b5a9e2",
	"0x6771450accb00177f0392094d3b41e648a96f1e0",
	"0x01af7eeacae5f2303b2b5dafaed55ecb4ebfe0ed",
	"0x4906e4f95ad546ce865916f65c825e00630bffa8",
	"0xe669331ac656ef11ac75391278ba7fb83ae62394",
	"0x254f441fcc7fa80b494c6e65bf8ec0a4e894f282",
	"0xdb856e59b077f9d2548719a71e549a7b61cb78e3",
	"0xfbf13497056f33300ad82511c6a1349dd3d2ae26",
	"0x778f7434956b899303708fa3c5fad85bf9d93e06",
	"0x2845a83d2a6cb264a5e35103ef10472746f43c4d",
	"0x7a92881f55bf105ff5954a637a37f2f9a07dc5a0",
	"0xfefbdc19a0d855a8b9bbf79144bc32cc7eeda019",
	"0x198d5bf898d7cb4531fd35c8a9b9853c915904ea",
	"0x24257f2ffb8b962ff7d48819617b095bea9eae2a",
	"0x983961f34fc4cfc5eafec371cdba9d56ff8c1935",
	"0x8c78481e28dc6b2285099b2c7dc4515680d0dc7c",
	"0xf7ee6c2f811b52c72efd167a1bb3f4adaa1e0f89",
	"0x8fd1ac1c6530acc0a8ca18311925264c9ec9121d",
	"0xcb9b03196f1232c4c3cc16cb806afdd93da4126b",
	"0xf38de5479c638a157812bc959be5892e7d22e8ee"
];

const points_issued = [
	1,
	2,
	1,
	2,
	1,
	4,
	7,
	10,
	1,
	612,
	20,
	30,
	1,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	1,
	18,
	10,
	10,
	10,
	30,
	10,
	5,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	20,
	10,
	22,
	1,
	10,
	10,
	10,
	2,
	4,
	10,
	10,
	1,
	5,
	20,
	2,
	1,
	2,
	1,
	1,
	1,
	1,
	10,
	20,
	1,
	1
];

const addresses_consumed = [
	"0xd1692f1c6b50d299993363be1c869e3e64842732",
	"0x921e7ebebfb4f37a3770c5ccafc108ac31c8d438",
	"0x360bbad1120b0abf63573e2e21b6727e07d1bf18",
	"0xc857ec9a3ed2c59cbbc4954f11311fdd7532db15",
	"0x22406c0a2eb0a0a1c4fdabd56f695f205e3fa2d1",
	"0x5d92fd7e52f9ba04abb84d80c1a107dfe51f8473",
	"0xa1559b8c9b52dfdc6300549e3f6a8374b91bd50e",
	"0x80ea4ece903c42497cd7a41f541985c7211d6216",
	"0x0e75143296497f488f0e5a3bb3cf11ed9328fd78",
	"0x965a166c4c6f662fcee05902bf2e137afa80b3a2",
	"0xbbef61229a8d6eb2d6fb5d3a968af24a95984f0e",
	"0xbd55b2e3167637b71dd41e31f84d223930584798",
	"0xd820e895956e5315f813a53b2bb9cea29b6adc61",
	"0x2aab510050bdabcd204c9c6877a2281fc122e946",
	"0x95cd2b7e952cda42d16d21d07c49f66ae14da2ec",
	"0xd1f622d61a11cd420415cb7de5482956d761dbe8",
	"0x726614e49e844aae1c167a293bd06beca8a51705",
	"0xcff9963b8602dfbb7fb0a44c2d5c73aa1bcbff03",
	"0xa9232c4ef4725a8a256ab638065ac03eb8651fa0",
	"0x30404a2900e8ea5c08eeeb284e9b2bebfc01c58d",
	"0xf39d65ecfea0497cb5911dc499222f81506ca249",
	"0xd3758d7a3f28b0ebb44be71bb78bdd773b1b14c2",
	"0xa15e09311a8b0fcc8edebdceb427eeaf1cf96d98",
	"0xf5e37e330b170d7c9b7ebec5f6dd92d71a1b45a4",
	"0x573a6bf63ad5e24275f686e9655731cc6048e005",
	"0x22f0146e4ffdf109b7069bb92f4f421edee87d4e",
	"0x91bda0b13aeb5ec89533fcd4f5b190e1ac93f5ca",
	"0x21ae65e0d62775a01ebd6a292994080c91fa92f8",
	"0xb51694051d0294eccda91b62b05c7637b5bf348b",
	"0xb9ace70ce234180f009aee04fc84fd755856fe86",
	"0xf73421c341218cb40148a9bdfc60fa7b989576c8",
	"0x8735117d6110ae36fd15ac093046ac9a31b5a9e2",
	"0x6771450accb00177f0392094d3b41e648a96f1e0",
	"0xe669331ac656ef11ac75391278ba7fb83ae62394",
	"0x254f441fcc7fa80b494c6e65bf8ec0a4e894f282",
	"0x778f7434956b899303708fa3c5fad85bf9d93e06",
	"0x8fd1ac1c6530acc0a8ca18311925264c9ec9121d"
];

const points_consumed = [
	600,
	20,
	30,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	30,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	10,
	20,
	10,
	10,
	10,
	10,
	10,
	20,
	20
];

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy ref points tracker] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy ref points tracker] coverage network - skipping the migration script");
		return;
	}

	// deploy RefPointsTracker smart contract
	await deployer.deploy(Tracker);
	const tracker = await Tracker.deployed();
	const trackerAddress = tracker.address;

	// for test network add test ref points
	if(network !== "mainnet") {
		addresses_issued.push("0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6"); // John
		addresses_issued.push("0xEE169DCC689D0C358F68Ce95DEf41646039aC190"); // Roman
		addresses_issued.push("0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69"); // Basil
		points_issued.push(117);
		points_issued.push(215);
		points_issued.push(311);
		addresses_consumed.push("0x501E13C2aE8D9232B88F63E87DFA1dF28103aCb6"); // John
		addresses_consumed.push("0xEE169DCC689D0C358F68Ce95DEf41646039aC190"); // Roman
		addresses_consumed.push("0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69"); // Basil
		points_consumed.push(43);
		points_consumed.push(59);
		points_consumed.push(87);
	}

	// init ref points tracker with initial ref points balances
	await tracker.bulkIssue(addresses_issued, points_issued);
	await tracker.bulkConsume(addresses_consumed, points_consumed);

	console.log("______________________________________________________");
	console.log("tracker:        " + trackerAddress);
	console.log("holders:        " + addresses_issued.length);
	console.log("issued total:   " + points_issued.reduce((a, b) => a + b, 0));
	console.log("consumed total: " + points_consumed.reduce((a, b) => a + b, 0));

};

