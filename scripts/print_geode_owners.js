// Presale2 API, internally presale2 instance is linked to presale1
const Sale2 = artifacts.require("./Presale2");

// using file system to create raw csv data file
const fs = require('fs');

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[print minted countries] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[print minted countries] coverage network - skipping the migration script");
		return;
	}

	// MainNet Geode presale2 address (Antarctica)
	const presale2Address = "0xE0A21044eEeB9efC340809E35DC0E9d82Dc87DD1";

	// create presale2 instance which is linked to presale1 instance
	const presale2 = Sale2.at(presale2Address);

	// determine amount of geodes in Presale 1
	const nextGeode = (await presale2.nextGeode()).toNumber();

	// accumulate geode owners in this array
	const geodes = [];

	// print CSV header
	console.log("geode_id,address");

	// iterate over and fetch owners
	for(let i = 0; i < nextGeode - 1; i++) {
		geodes.push(await presale2.geodeOwners(i + 1));
		console.log("%s, %s", i + 1, geodes[i]);
	}

	// write raw data into the file
	fs.writeFileSync("./data/geodes.csv", "geode_id,address\n" + geodes.map((a, i) => (i + 1) + "," + a).join("\n"));

	// remove duplicates from geodes array: https://wsvincent.com/javascript-remove-duplicates-array/
	const owners = [...new Set(geodes)];

	// write statistical raw data into the file
	fs.writeFileSync("./data/geode_owners.csv", owners.join("\n"));

	// log successful finish of the operation
	console.log("Operation successful. %d geodes. %d owners", geodes.length, owners.length);
};
