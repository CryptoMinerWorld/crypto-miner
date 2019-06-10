// Country ERC721 ABI
const Token = artifacts.require("./CountryERC721");

// Script prints all existing (and owned) countries as a bitmap
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
	let tokenAddress = "0xE49F05Fd6DEc46660221a1C1255FfE335bc7fa7a"; // MainNet token address

	// bind token instance
	const tk = await Token.at(tokenAddress);

	// query for minted token bitmap
	const bitmap = await tk.tokenMap();

	// print the bitmap
	console.log(`[${toPrettyBinary(bitmap, 190)}]`);
};

/**
 * Function prints existing tokens (marked with asterisk *)
 * in a user-friendly ASCII way
 */
function toPrettyBinary(n, padTo = 0) {
	let result = "";

	n = n.clone();
	while(!n.isZero()) {
		const zeroBits = n.zeroBits();
		result += ".".repeat(zeroBits);
		n.ishrn(zeroBits);
		if(!zeroBits) {
			result += "*";
			n.ishrn(1);
		}
	}

	if(padTo && result.length < padTo) {
		result += ".".repeat(padTo - result.length);
	}

	return result;
}
