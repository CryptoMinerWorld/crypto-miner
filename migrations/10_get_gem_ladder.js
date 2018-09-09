const Gem = artifacts.require("./GemERC721");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[get gem ladder] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[get gem ladder] coverage network - skipping the migration script");
		return;
	}

	// deployed token smart contract addresses
	let tokenAddress = "0xeae9d154da7a1cd05076db1b83233f3213a95e4f"; // MainNet token address
	if(network !== "mainnet") {
		tokenAddress = "0x82ff6bbd7b64f707e704034907d582c7b6e09d97"; // Rinkeby token address
	}

	// bind to deployed smart contract
	const tk = Gem.at(tokenAddress);

	// check how many gems exist in the system
	const n = await tk.totalSupply();

	// print CSV header
	console.log(`i, id, color, level, grade type, grade value, owner`);

	// iterate over all the existing gems
	for(let i = 0; i < n; i++) {
		// get the i-th gem ID
		const id = await tk.tokenByIndex(i);

		// read the Gem properties defined by its ID
		const properties = await tk.getProperties(id); // color, level, grade type, grade value

		// for each gem we obtain:
		const color = properties.dividedToIntegerBy(0x10000000000);
		const level = properties.dividedToIntegerBy(0x100000000).modulo(0x100);
		const gradeType = properties.dividedToIntegerBy(0x1000000).modulo(0x100);
		const gradeValue = properties.modulo(0x1000000);

		// get the token owner
		const owner = await tk.ownerOf(id);

		// log the data
		console.log(`${i + 1}, ${id}, ${color}, ${level}, ${gradeType}, ${gradeValue}, ${owner}`);
	}
};
