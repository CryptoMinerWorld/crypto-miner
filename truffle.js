// npm install truffle-hdwallet-provider@0.0.3
const HDWalletProvider = require("truffle-hdwallet-provider");

// https://ethereum.stackexchange.com/questions/44349/truffle-infura-on-mainnet-nonce-too-low-error
const NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");

// babel imports is required to allow ECMAScript 6 imports in tests
require('babel-register');
require('babel-polyfill');

// private keys storage
const keys = require("./keys.js");

module.exports = {
	// See <http://truffleframework.com/docs/advanced/configuration>
	// to customize your Truffle configuration!
	networks: {
		// installation instructions: https://truffleframework.com/docs/truffle/getting-started/installation
		// run with "truffle console", "truffle deploy", read more: https://truffleframework.com/docs/truffle/quickstart
		mainnet: {
			provider: function () {
				const wallet = new HDWalletProvider(
					keys.mnemonic1, // create 12 words: https://metamask.io/
					"https://mainnet.infura.io/v3/" + keys.infura_key // create a key: https://infura.io/
				);
				const nonceTracker = new NonceTrackerSubprovider();
				wallet.engine._providers.unshift(nonceTracker);
				nonceTracker.setEngine(wallet.engine);
				return wallet;
			},
			network_id: "1", // Match mainnet only
			gas: 4500000,
			gasPrice: 7000000000 // 7 GWei
		},

		// installation instructions: https://truffleframework.com/docs/truffle/getting-started/installation
		// run with "truffle console", "truffle deploy", read more: https://truffleframework.com/docs/truffle/quickstart
		development: {
			provider: function () {
				const wallet = new HDWalletProvider(
					keys.mnemonic4, // create 12 words: https://metamask.io/
					"https://rinkeby.infura.io/v3/" + keys.infura_key // create a key: https://infura.io/
				);
				const nonceTracker = new NonceTrackerSubprovider();
				wallet.engine._providers.unshift(nonceTracker);
				nonceTracker.setEngine(wallet.engine);
				return wallet;
			},
			network_id: "*", // Match any network (determined by provider)
			gas: 4500000,
			gasPrice: 21000000000 // 21 GWei
		},

		// installation instructions: https://truffleframework.com/docs/truffle/getting-started/installation
		// run with "truffle console", "truffle deploy", read more: https://truffleframework.com/docs/truffle/quickstart
		ropsten: {
			provider: function () {
				const wallet = new HDWalletProvider(
					keys.mnemonic3, // create 12 words: https://metamask.io/
					"https://ropsten.infura.io/v3/" + keys.infura_key // create a key: https://infura.io/
				);
				const nonceTracker = new NonceTrackerSubprovider();
				wallet.engine._providers.unshift(nonceTracker);
				nonceTracker.setEngine(wallet.engine);
				return wallet;
			},
			network_id: "*", // Match any network (determined by provider)
			gas: 4500000,
			gasPrice: 21000000000 // 21 GWei
		},

		// run with ./coverage.sh, read more: https://www.npmjs.com/package/solidity-coverage
		coverage: {
			host: "localhost",
			network_id: "*",
			port: 8555,
			gas: 0xfffffffffff,
			gasPrice: 0x01
		},

		// installation instructions: https://www.npmjs.com/package/ganache-cli
		// run with ./test.sh, read more: https://truffleframework.com/docs/ganache/quickstart
		test: {
			host: "localhost",
			network_id: "*",
			port: 8666,
			gas: 0xffffffff,
			gasPrice: 1
		}
	},
	mocha: {
		// https://mochajs.org/api/mocha#enableTimeouts
		enableTimeouts: false
	},
	solc: {
		optimizer: {
			enabled: true,
			runs: 200 // default is 200, however for function execution the effect is noticeable up to 20000
		}
	},
	compilers: {
		solc: {
			version: "0.4.23"  // ex:  "0.4.20". (Default: Truffle's installed solc)
		}
	}
};
