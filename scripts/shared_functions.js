// using file system to create raw csv data file for tiers structure
const fs = require('fs');

// auxiliary function to ensure function `fn` throws
export const assertThrows = async function assertThrows(fn, ...args) {
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
};

// auxiliary function to write data into CSV file
// appends data if CSV file already exists
export const write_csv = function(path, header, data) {
	if(fs.existsSync(path)) {
		header = "";
	}
	fs.appendFileSync(path, `${header}\n${data}`);
};
