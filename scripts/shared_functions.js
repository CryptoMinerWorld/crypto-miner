// using file system to create raw csv data file for tiers structure
const fs = require('fs');

// auxiliary function to ensure function `fn` throws
export async function assertThrows(fn, ...args) {
	let f = () => {};
	try {
		await fn(...args);
	}
	catch(e) {
		f = () => {
			throw e;
		};
	}
	finally {
		assert.throws(f);
	}
}

// auxiliary function to write data into CSV file
// appends data if CSV file already exists
export function write_csv(path, header, data) {
	if(fs.existsSync(path)) {
		header = "";
	}
	fs.appendFileSync(path, `${header}\n${data}`, {encoding: "utf8"});
}

// auxiliary function to read data from CSV file
// if CSV begins with the header specified - deletes the header from data returned
export function read_csv(path, header) {
	if(!fs.existsSync(path)) {
		return "";
	}
	const data = fs.readFileSync(path, {encoding: "utf8"});
	if(data.indexOf(`${header}\n`) === 0) {
		return data.substring(header.length + 1)
	}
	return data;
}

// zero address (old int 0)
export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

// short name for web3.utils.toBN
export const toBN = web3.utils.toBN;

// short name for web3.utils.toWei
export const toWei = web3.utils.toWei;

// short name for web3.utils.toWei as BN
export function toWeiBN(number, unit) {
	return toBN(toWei(web3.utils.isBN(number)? number: "" + number, unit));
}

// short name for web3.eth.getBalance as BN
export async function getBalanceBN(acc) {
	return toBN(await web3.eth.getBalance(acc));
}

// short name for tx.receipt.gasUsed as BN
export function gasUsedBN(tx) {
	return toBN(tx.receipt.gasUsed);
}

// auxiliary function to create a zer-filled array of BigNumbers
export function toBNs(n) {
	const r = new Array(n);
	for(let i = 0; i < n; i++) {
		r[i] = toBN(0);
	}
	return r;
}

// a function to print a BN in binary mode
export function toPrettyBinary(n, padTo = 0) {
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
