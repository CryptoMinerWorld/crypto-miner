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

// short name for web3.utils.toBN
export const toBN = web3.utils.toBN;

// auxiliary function to create a zer-filled array of BigNumbers
export function toBNs(n) {
	const r = new Array(n);
	for(let i = 0; i < n; i++) {
		r[i] = toBN(0);
	}
	return r;
}
