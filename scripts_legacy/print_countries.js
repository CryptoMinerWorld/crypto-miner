// Country Extension extends Country ERC721 smart contract
const CountryExt = artifacts.require("./CountryExt");

const COUNTRY_NAMES = [
	"Russia",
	"Canada",
	"China",
	"United States of America",
	"Brazil",
	"Australia",
	"India",
	"Argentina",
	"Kazakhstan",
	"Algeria",
	"Democratic Republic of the Congo",
	"Greenland",
	"Saudi Arabia",
	"Mexico",
	"Indonesia",
	"Sudan",
	"Libya",
	"Iran",
	"Mongolia",
	"Peru",
	"Chad",
	"Niger",
	"Angola",
	"Mali",
	"South Africa",
	"Colombia",
	"Ethiopia",
	"Bolivia",
	"Mauritania",
	"Egypt",
	"Tanzania",
	"Nigeria",
	"Venezuela",
	"Namibia",
	"Pakistan",
	"Mozambique",
	"Turkey",
	"Chile",
	"Zambia",
	"Myanmar (Burma)",
	"France",
	"Afghanistan",
	"Somalia",
	"Central African Republic",
	"South Sudan",
	"Ukraine",
	"Botswana",
	"Madagascar",
	"Kenya",
	"Yemen",
	"Thailand",
	"Spain",
	"Turkmenistan",
	"Cameroon",
	"Papua New Guinea",
	"Sweden",
	"Uzbekistan",
	"Morocco",
	"Iraq",
	"Paraguay",
	"Zimbabwe",
	"Japan",
	"Germany",
	"Republic of the Congo",
	"Finland",
	"Malaysia",
	"Vietnam",
	"Norway",
	"Ivory Coast",
	"Poland",
	"Oman",
	"Italy",
	"Philippines",
	"Ecuador",
	"Burkina Faso",
	"New Zealand",
	"Gabon",
	"Guinea",
	"United Kingdom",
	"Uganda",
	"Ghana",
	"Romania",
	"Laos",
	"Guyana",
	"Belarus",
	"Kyrgyzstan",
	"Senegal",
	"Syria",
	"Cambodia",
	"Uruguay",
	"Tunisia",
	"Suriname",
	"Bangladesh",
	"Nepal",
	"Tajikistan",
	"Greece",
	"Nicaragua",
	"Eritrea",
	"North Korea",
	"Malawi",
	"Benin",
	"Honduras",
	"Liberia",
	"Bulgaria",
	"Cuba",
	"Guatemala",
	"Iceland",
	"South Korea",
	"Hungary",
	"Jordan",
	"Portugal",
	"Serbia",
	"Azerbaijan",
	"Austria",
	"United Arab Emirates",
	"Czech Republic",
	"Panama",
	"Sierra Leone",
	"Ireland",
	"Georgia",
	"Sri Lanka",
	"Lithuania",
	"Latvia",
	"Togo",
	"Croatia",
	"Bosnia and Herzegovina",
	"Costa Rica",
	"Slovakia",
	"Dominican Republic",
	"Bhutan",
	"Estonia",
	"Denmark",
	"Netherlands",
	"Switzerland",
	"Guinea-Bissau",
	"Republic of China (Taiwan, Quemoy, Matsu)",
	"Moldova",
	"Belgium",
	"Lesotho",
	"Armenia",
	"Albania",
	"Solomon Islands",
	"Equatorial Guinea",
	"Burundi",
	"Haiti",
	"Israel (Including West Bank and Gaza)",
	"Rwanda",
	"Macedonia",
	"Belize",
	"Djibouti",
	"El Salvador",
	"Slovenia",
	"Fiji",
	"Kuwait",
	"Swaziland",
	"East Timor",
	"Bahamas",
	"Montenegro",
	"Vanuatu",
	"Qatar",
	"Gambia",
	"Jamaica",
	"Lebanon",
	"Cyprus",
	"Brunei",
	"Trinidad and Tobago",
	"Cape Verde",
	"Samoa",
	"Luxembourg",
	"Comoros",
	"Mauritius",
	"São Tomé and Príncipe",
	"Dominica",
	"Tonga",
	"Kiribati",
	"Micronesia",
	"Singapore",
	"Bahrain",
	"Saint Lucia",
	"Seychelles",
	"Andorra",
	"Palau",
	"Antigua and Barbuda",
	"Barbados",
	"Saint Vincent and the Grenadines",
	"Grenada",
	"Malta",
	"Maldives",
	"Saint Kitts and Nevis",
	"Liechtenstein"
];

// using file system to create raw csv data file
const fs = require('fs');

/**
 * Extend String prototype by adding toAddress function
 * @return {String} a valid address string of 0x01234567890ABCDEF01234567890ABCDEF012345
 */
web3.BigNumber.prototype.toAddress = function() {
	let s = this.toString(16);
	while(s.length < 40) {
		s = `0${s}`;
	}
	return `0x${s}`;
};

// script reads and prints country data
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[print minted countries] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[print minted countries] coverage network - skipping the migration script");
		return;
	}

	// deployed country extension addresses
	let extensionAddress = "0xE437EA3dE16503f3d32D0Eb93c872d6C142A1944"; // MainNet extension address

	// bind token instance
	const extension = CountryExt.at(extensionAddress);

	// array to accumulate country data
	const countries = [];

	// print CSV header
	console.log("country_id,country_name,plots,tax,owner");

	// print country owners cycle
	const r = await extension.getAllCountriesPacked();
	const two = web3.toBigNumber(2);
	for(let i = 0; i < r.length; i++) {
		const countryId = i + 1;
		const countryName = COUNTRY_NAMES[i];
		const plots = r[i].dividedToIntegerBy(two.pow(176));
		const taxN = r[i].dividedToIntegerBy(two.pow(168)).modulo(256);
		const taxD = r[i].dividedToIntegerBy(two.pow(160)).modulo(256);
		const ownerAddress = r[i].modulo(two.pow(160));
		const owner = ownerAddress.gt(0)? ownerAddress.toAddress(): "";
		console.log("%d,%s,%d,%d/%d,%s", countryId, countryName, plots, taxN, taxD, owner);
		countries.push({
			id: countryId,
			name: countryName,
			plots: plots,
			taxN: taxN,
			taxD: taxD,
			owner: owner
		});
	}

	// prepare csv data for output
	const csvData = countries.map((a, i) => `${a.id},${a.name},${a.plots},${a.taxN}/${a.taxD},0x${a.owner}`).join("\n");

	// write raw data into the file
	fs.writeFileSync("./data/countries.csv", `country_id,country_name,plots,tax,owner\n${csvData}`);

	// remove duplicates from countries array: https://wsvincent.com/javascript-remove-duplicates-array/
	const owners = [...new Set(countries.map((a, i) => a.owner))];

	// write raw data into the file
	fs.writeFileSync("./data/country_owners.csv", owners.filter(a => a).join("\n"));

	// log successful finish of the operation
	console.log("Operation successful. %d countries. %d owners", countries.length, owners.length);

};
