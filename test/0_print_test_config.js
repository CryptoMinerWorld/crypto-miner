contract("TestRPC Config", (accounts) => {
	it("account balances", async() => {
		console.log("\t%d accounts:", accounts.length);
		assert.strictEqual(35, accounts.length, "incorrect number of testing accounts");
		for(let i = 0; i < accounts.length; i++) {
			const balance = web3.utils.fromWei(await web3.eth.getBalance(accounts[i]), "ether");
			console.log("\t[%d] %s: %d ETH", i, accounts[i], balance);
			assert.strictEqual('1000', balance, "incorrect balance for test account " + i);
		}
	});
});
