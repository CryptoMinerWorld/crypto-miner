// List of smart contract to deploy or use (ABI)
const SilverERC20 = artifacts.require("./SilverERC20");
const GoldERC20 = artifacts.require("./GoldERC20");
const GemERC721 = artifacts.require("./GemERC721");
const GemBurner = artifacts.require("./GemBurner");

// features and roles required
const FEATURE_SILVER_TRADE_ENABLED = 0x00000001;
const FEATURE_GOLD_TRADE_ENABLED = 0x00000002;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
const ROLE_TOKEN_CREATOR = 0x00000001;

// Gem Burner deployment script
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[Gem Burner] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[Gem Burner] coverage network - skipping the migration script");
		return;
	}

	// a collection of all known addresses (smart contracts and external)
	const conf = ((network) => {
		switch(network) {
			// Mainnet Configuration
			case "mainnet": return {
				SilverERC20:        "0x4D55e9d055817497De7B790D38328265f8E305D9",
				GoldERC20:          "0xf61aDA5FE3ea9F919fe5Bd1FF9e809B1F4315285",
				GemERC721:          "0x34Fa7ddde9D0E1B98CD281EE1E8BA1DB37C64399",
				GemBurner:          "0x22ac7463Cc38EFc1BecE9A0df433952dc2A63298",
			};
			// Ropsten Configuration
			case "ropsten": return {
				SilverERC20:        '0x0491E7Ff9afaa50B4D394C12c49BF4C8b06D1c5d',
				GoldERC20:          '0x5facE2F796919cac8f446B82a7aA9CA2723BF776',
				GemERC721:          '0x0F3c237D0Bd742B5Af3a5606525daA3fE3b19a0d',
				GemBurner:          "0xA61c2b8C95FC582A1D94a70A55D489Ca9C9dC1f3",
			};
			// Kovan Configuration
			case "kovan": return {
				SilverERC20:        '0x4822b1172217875272d918e93076339193462E06',
				GoldERC20:          '0xeeEE3B45405C28712b76D0C64E4f0d824198AF30',
				GemERC721:          '0xb638410212e8D22630c224BE0B038b4c8c78ea8A',
				GemBurner:          "0x094e071242E001619a04dd8134774eA1Affb4A1f",
			};
			default: throw "unknown network " + network;
		}
	})(network);

	const instances = {};

	// deploy all missing instances first, healing the missing parts of the config
	console.log("mandatory phase: config healing (deploy missing instances)");

	// keep track of deployed instances count
	let deployedInstances = 0;

	// SilverERC20 binding/deployment
	if(conf.SilverERC20) {
		console.log("binding SilverERC20 to " + conf.SilverERC20);
		instances.SilverERC20 = await SilverERC20.at(conf.SilverERC20);
	}
	else {
		console.log("deploying SilverERC20");
		await deployer.deploy(SilverERC20);
		deployedInstances++;
	}

	// GoldERC20 binding/deployment
	if(conf.GoldERC20) {
		console.log("binding GoldERC20 to " + conf.GoldERC20);
		instances.GoldERC20 = await GoldERC20.at(conf.GoldERC20);
	}
	else {
		console.log("deploying GoldERC20");
		await deployer.deploy(GoldERC20);
		deployedInstances++;
	}

	// GemERC721 binding/deployment
	if(conf.GemERC721) {
		console.log("binding GemERC721 to " + conf.GemERC721);
		instances.GemERC721 = await GemERC721.at(conf.GemERC721);
	}
	else {
		console.log("deploying GemERC721");
		await deployer.deploy(GemERC721);
		deployedInstances++;
	}

	// GemBurner binding/deployment
	if(conf.GemBurner) {
		console.log("binding GemBurner to " + conf.GemBurner);
		instances.GemBurner = await GemERC721.at(conf.GemBurner);
	}
	else {
		console.log("deploying GemBurner");
		await await deployer.deploy(GemBurner, conf.GemERC721, conf.SilverERC20, conf.GoldERC20);
		deployedInstances++;
	}

	// link newly deployed instances
	if(!conf.SilverERC20) {
		instances.SilverERC20 = await SilverERC20.deployed();
		conf.SilverERC20 = instances.SilverERC20.address;
	}
	if(!conf.GoldERC20) {
		instances.GoldERC20 = await GoldERC20.deployed();
		conf.GoldERC20 = instances.GoldERC20.address;
	}
	if(!conf.GemERC721) {
		instances.GemERC721 = await GemERC721.deployed();
		conf.GemERC721 = instances.GemERC721.address;
	}
	if(!conf.GemBurner) {
		instances.GemBurner = await GemBurner.deployed();
		conf.GemBurner = instances.GemBurner.address;
	}

	// output healed config if any new instances were deployed
	if(deployedInstances > 0) {
		console.log("healed config: %o", conf);
	}


	if(network !== "mainnet") {
		console.log("optional phase: enable permissions");

		// we'll be tracking nonce, yeah!
		let nonce = await web3.eth.getTransactionCount(accounts[0]);
		// a place to store pending transactions (promises)
		const txs = [];

		// allow GemBurner to mint SilverERC20
		if((await instances.SilverERC20.userRoles(conf.GemBurner)).isZero()) {
			console.log("granting GemBurner %o permission to mint SilverERC20 %o", conf.GemBurner, conf.SilverERC20);
			txs.push(instances.SilverERC20.updateRole(conf.GemBurner, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
		}
		// allow GemBurner to mint GoldERC20
		if((await instances.GoldERC20.userRoles(conf.GemBurner)).isZero()) {
			console.log("granting GemBurner %o permission to mint GoldERC20 %o", conf.GemBurner, conf.GoldERC20);
			txs.push(instances.GoldERC20.updateRole(conf.GemBurner, ROLE_TOKEN_CREATOR, {nonce: nonce++}));
		}
		// enable GemBurner (trading for silver/gold)
		if((await instances.GemBurner.features()).isZero()) {
			console.log("enabling GemBurner %o", conf.GemBurner);
			txs.push(instances.GemBurner.updateFeatures(FEATURE_SILVER_TRADE_ENABLED | FEATURE_GOLD_TRADE_ENABLED, {nonce: nonce++}));
		}
		console.log("GemBurner configuration scheduled");

		// wait for all transactions to complete and output gas usage
		await waitForAll(txs);

		console.log("optional phase [enable permissions] complete");
	}

};

// waits for all transactions in the array and outputs gas usage stats
async function waitForAll(txs) {
	// wait for all pending transactions and gather results
	if(txs.length > 0) {
		// track cumulative gas usage
		let cumulativeGasUsed = 0;

		console.log("\twaiting for %o transactions to complete", txs.length);

		for(const tx of (await Promise.all(txs))) {
			// measure gas used
			const gasUsed = (tx.receipt? tx.receipt: await web3.eth.getTransactionReceipt(tx.transactionHash)).gasUsed;

			// update cumulative gas used
			cumulativeGasUsed += gasUsed;

			// log the result
			console.log("\ttransaction complete, %o gas used", gasUsed);
		}

		// log cumulative gas used
		console.log("\tcumulative gas used: %o (%o ETH)", cumulativeGasUsed, Math.ceil(cumulativeGasUsed / 1000000) / 1000);
	}
}

