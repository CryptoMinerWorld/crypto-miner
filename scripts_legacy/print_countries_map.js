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

	// print the existing token map
	await printTokenMap(tokenAddress);
};

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

/*
	// goto new line
	map += "\n";

	// print country names
	for(let i = 0; i < COUNTRY_NAMES.reduce((a, b) => {return a.length > b.length? a: b}).length; i++) {
		for(let j = 0; j < COUNTRY_NAMES.length; j++) {
			map += COUNTRY_NAMES[j].length < i? ".": COUNTRY_NAMES[j].charAt(i);
		}
		map += "\n";
	}
*/

	// print the bitmap
	console.log(map);

	// return the bitmap
	return map;
}
