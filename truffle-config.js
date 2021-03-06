// npm install truffle-hdwallet-provider@0.0.3
const HDWalletProvider = require("truffle-hdwallet-provider");

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
				return new HDWalletProvider(
					keys.mnemonic1, // create 12 words: https://metamask.io/
					"https://mainnet.infura.io/v3/" + keys.infura_key // create a key: https://infura.io/
				);
			},
			network_id: "1", // Mainnet
			gas: 7500000,
			gasPrice: 2010000000, // 2.01 GWei
			skipDryRun: true, // if you don't want to test run the migration locally before the actual migration (default is false)
			timeoutBlocks: 5000, // if a transaction is not mined, keep waiting for this number of blocks (default is 50)
		},

		// installation instructions: https://truffleframework.com/docs/truffle/getting-started/installation
		// run with "truffle console", "truffle deploy", read more: https://truffleframework.com/docs/truffle/quickstart
		ropsten: {
			provider: function () {
				return new HDWalletProvider(
					keys.mnemonic3, // create 12 words: https://metamask.io/
					"https://ropsten.infura.io/v3/" + keys.infura_key // create a key: https://infura.io/
				);
			},
			network_id: "3", // Ropsten
			gas: 7500000,
			gasPrice: 21000000000, // 21 GWei
			skipDryRun: true, // if you don't want to test run the migration locally before the actual migration (default is false)
			timeoutBlocks: 5000, // if a transaction is not mined, keep waiting for this number of blocks (default is 50)
		},

		// installation instructions: https://truffleframework.com/docs/truffle/getting-started/installation
		// run with "truffle console", "truffle deploy", read more: https://truffleframework.com/docs/truffle/quickstart
		rinkeby: {
			provider: function () {
				return new HDWalletProvider(
					keys.mnemonic4, // create 12 words: https://metamask.io/
					"https://rinkeby.infura.io/v3/" + keys.infura_key // create a key: https://infura.io/
				);
			},
			network_id: "4", // Rinkeby
			gas: 7000000,
			gasPrice: 21000000000, // 21 GWei
			skipDryRun: true, // if you don't want to test run the migration locally before the actual migration (default is false)
			timeoutBlocks: 5000, // if a transaction is not mined, keep waiting for this number of blocks (default is 50)
		},

		// installation instructions: https://truffleframework.com/docs/truffle/getting-started/installation
		// run with "truffle console", "truffle deploy", read more: https://truffleframework.com/docs/truffle/quickstart
		kovan: {
			provider: function () {
				return new HDWalletProvider(
					keys.mnemonic42, // create 12 words: https://metamask.io/
					"https://kovan.infura.io/v3/" + keys.infura_key // create a key: https://infura.io/
				);
			},
			network_id: "42", // Kovan
			gas: 7500000,
			gasPrice: 1000000000, // 1 GWei
			skipDryRun: true, // if you don't want to test run the migration locally before the actual migration (default is false)
			timeoutBlocks: 5000, // if a transaction is not mined, keep waiting for this number of blocks (default is 50)
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
			version: "0.5.8"  // ex:  "0.4.20". (Default: Truffle's installed solc)
		}
	}
};
