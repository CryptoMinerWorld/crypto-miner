const Country = artifacts.require("./CountryERC721");

// prepare country initialization data
const COUNTRY_DATA = [
	62916, // Russia
	36777, // Canada
	35260, // China
	35084, // United States of America
	31366, // Brazil
	28332, // Australia
	12108, // India
	10241, // Argentina
	10037, // Kazakhstan
	8773, // Algeria
	8639, // Democratic Republic of the Congo
	8142, // Kingdom of Denmark
	7918, // Saudi Arabia
	7235, // Mexico
	7015, // Indonesia
	6856, // Sudan
	6481, // Libya
	6070, // Iran
	5764, // Mongolia
	4734, // Peru
	4729, // Chad
	4667, // Niger
	4592, // Angola
	4567, // Mali
	4493, // South Africa
	4410, // Colombia
	4152, // Ethiopia
	4046, // Bolivia
	3796, // Mauritania
	3689, // Egypt
	3481, // Tanzania
	3403, // Nigeria
	3359, // Venezuela
	3040, // Namibia
	2961, // Pakistan
	2953, // Mozambique
	2875, // Turkey
	2788, // Chile
	2772, // Zambia
	2499, // Myanmar (Burma)
	2488, // France
	2385, // Afghanistan
	2349, // Somalia
	2295, // Central African Republic
	2283, // South Sudan
	2223, // Ukraine
	2211, // Botswana
	2162, // Madagascar
	2138, // Kenya
	1945, // Yemen
	1893, // Thailand
	1859, // Spain
	1798, // Turkmenistan
	1751, // Cameroon
	1705, // Papua New Guinea
	1657, // Sweden
	1648, // Uzbekistan
	1645, // Morocco
	1610, // Iraq
	1498, // Paraguay
	1439, // Zimbabwe
	1392, // Japan
	1315, // Germany
	1260, // Republic of the Congo
	1241, // Finland
	1215, // Malaysia
	1214, // Vietnam
	1194, // Norway
	1188, // Ivory Coast
	1152, // Poland
	1140, // Oman
	1110, // Italy
	1105, // Philippines
	1044, // Ecuador
	1010, // Burkina Faso
	992, // New Zealand
	986, // Gabon
	906, // Guinea
	897, // United Kingdom
	890, // Uganda
	879, // Ghana
	878, // Romania
	872, // Laos
	792, // Guyana
	765, // Belarus
	731, // Kyrgyzstan
	723, // Senegal
	682, // Syria
	667, // Cambodia
	649, // Uruguay
	603, // Tunisia
	601, // Suriname
	544, // Bangladesh
	542, // Nepal
	527, // Tajikistan
	486, // Greece
	477, // Nicaragua
	447, // Eritrea
	444, // North Korea
	436, // Malawi
	415, // Benin
	413, // Honduras
	410, // Liberia
	409, // Bulgaria
	405, // Cuba
	401, // Guatemala
	379, // Iceland
	363, // South Korea
	343, // Hungary
	340, // Jordan
	336, // Portugal (Total)
	325, // Serbia
	319, // Azerbaijan
	309, // Austria
	305, // United Arab Emirates
	290, // Czech Republic
	288, // Panama
	268, // Sierra Leone
	263, // Ireland
	257, // Georgia
	242, // Sri Lanka
	240, // Lithuania
	238, // Latvia
	209, // Togo
	208, // Croatia
	188, // Bosnia and Herzegovina
	188, // Costa Rica
	180, // Slovakia
	179, // Dominican Republic
	173, // Bhutan
	167, // Estonia
	157, // Netherlands (Total)
	152, // Switzerland
	133, // Guinea-Bissau
	133, // Republic of China (Taiwan, Quemoy, Matsu)
	125, // Moldova
	120, // Belgium
	112, // Lesotho
	110, // Armenia
	106, // Albania
	105, // Solomon Islands
	103, // Equatorial Guinea
	103, // Burundi
	102, // Haiti
	99, // Israel (Including West Bank and Gaza)
	97, // Rwanda
	93, // Macedonia
	85, // Belize
	81, // Djibouti
	77, // El Salvador
	75, // Slovenia
	67, // Fiji
	66, // Kuwait
	64, // Swaziland
	55, // East Timor
	51, // Bahamas
	51, // Montenegro
	45, // Vanuatu
	42, // Qatar
	42, // The Gambia
	40, // Jamaica
	38, // Lebanon
	34, // Cyprus
	21, // Brunei
	19, // Trinidad and Tobago
	15, // Cape Verde
	11, // Samoa
	10, // Luxembourg
	8, // Comoros
	5, // Mauritius
	5, // São Tomé and Príncipe
	5, // Dominica
	5, // Tonga
	5, // Kiribati
	5, // Micronesia
	5, // Singapore
	5, // Bahrain
	5, // Saint Lucia
	5, // Seychelles
	5, // Andorra
	5, // Palau
	5, // Antigua and Barbuda
	5, // Barbados
	5, // Saint Vincent and the Grenadines
	5, // Grenada
	5, // Malta
	5, // Maldives
	5, // Saint Kitts and Nevis
	5, // Marshall Islands
	5, // Liechtenstein
];

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy country] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy country] coverage network - skipping the migration script");
		return;
	}

	// deploy CountryERC721 smart contract
	await deployer.deploy(Country, COUNTRY_DATA);
	const country = await Country.deployed();
	const countryAddress = country.address;

	console.log("______________________________________________________");
	console.log("country:    " + countryAddress);
	console.log("supply:     " + await country.totalSupply());

};
