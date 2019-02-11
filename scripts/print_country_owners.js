const Token = artifacts.require("./CountryERC721");

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
	const tk = Token.at(tokenAddress);

	// array to accumualte
	const countries = [];

	// print CSV header
	console.log("country_id,country_name,owner");

	// print country owners cycle
	for(let i = 0; i < await tk.getNumberOfCountries(); i++) {
		const tokenId = i + 1;
		countries.push(await tk.ownerOf(tokenId));
		console.log("%d,%s,%s", tokenId, COUNTRY_NAMES[i], countries[i]);
	}

	// write raw data into the file
	fs.writeFileSync("./data/countries.csv", "country_id,country_name,owner\n" + countries.map((a, i) => (i + 1) + "," + COUNTRY_NAMES[i] + "," + a).join("\n"));

	// remove duplicates from countries array: https://wsvincent.com/javascript-remove-duplicates-array/
	const owners = [...new Set(countries)];

	// write raw data into the file
	fs.writeFileSync("./data/country_owners.csv", owners.join("\n"));

	// log successful finish of the operation
	console.log("Operation successful. %d countries. %d owners", countries.length, owners.length);

};
