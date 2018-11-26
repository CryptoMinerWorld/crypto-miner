const Token = artifacts.require("./CountryERC721");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[print minted countries] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[print minted countries] coverage network - skipping the migration script");
		return;
	}

	// deployed token smart contract addresses
	let tokenAddress = ""; // MainNet token address
	if(network !== "mainnet") {
		tokenAddress = "0x797AAB879c58b7fd977782d0fAcc8022385C6483"; // Rinkeby token address
	}

	// print the existing token map
	await printTokenMap(tokenAddress);
};

/**
 /**
 * Function prints existing tokens (marked with asterisk *)
 * in a user-friendly ASCII way
 * @param tokenAddress deployed token instance address
 * @returns {Promise<string>} a bitmap where asterisk * stands for existent (minted) token
 *      and dot . stands for non-existent (not minted) token
 */
async function printTokenMap(tokenAddress) {
	// bind token instance
	const tk = Token.at(tokenAddress);

	// query for minted token bitmap
	const bitmap = await tk.tokenMap();

	// construct corresponding character map
	let map = "";
	const two = web3.toBigNumber(2);
	for(let i = 0; i < 192; i++) {
		// bit number `i` is either zero or one
		const bit = bitmap.dividedToIntegerBy(two.pow(i)).modulo(2).toNumber();
		map += bit? "*": ".";
	}

	// print the bitmap
	console.log(map);

	// return the bitmap
	return map;
}
