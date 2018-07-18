// npm install truffle-hdwallet-provider@0.0.3
const HDWalletProvider = require("truffle-hdwallet-provider");

// https://ethereum.stackexchange.com/questions/44349/truffle-infura-on-mainnet-nonce-too-low-error
const NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");

module.exports = {
	networks: {
		mainnet: {
			provider: function () {
				const wallet = new HDWalletProvider(
					"***12 words***",
					"https://rinkeby.infura.io/***key***"
				);
				const nonceTracker = new NonceTrackerSubprovider();
				wallet.engine._providers.unshift(nonceTracker);
				nonceTracker.setEngine(wallet.engine);
				return wallet
			},
			network_id: "1", // Match mainnet only
			gas: 4500000,
			gasPrice: 11000000000 // 11 GWei
		},
		development: {
			provider: function () {
				const wallet = new HDWalletProvider(
					"***12 words***",
					"https://rinkeby.infura.io/***key***"
				);
				const nonceTracker = new NonceTrackerSubprovider();
				wallet.engine._providers.unshift(nonceTracker);
				nonceTracker.setEngine(wallet.engine);
				return wallet
			},
			network_id: "*", // Match any network (determined by provider)
			gas: 4500000,
			gasPrice: 21000000000 // 21 GWei
		},
		coverage: {
			host: "localhost",
			network_id: "*",
			port: 8555,
			gas: 0xfffffffffff,
			gasPrice: 0x01
		},
		test: {
			host: "localhost",
			network_id: "*",
			port: 8666,
			gas: 0xffffffff,
			gasPrice: 1
		}
	},
	mocha: {
		enableTimeouts: false
	},
	solc: {
		optimizer: {
			enabled: true,
			runs: 200 // default is 200, however for function execution the effect is noticeable up to 20000
		}
	}
};
