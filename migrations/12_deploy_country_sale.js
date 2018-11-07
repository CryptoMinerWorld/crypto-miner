const ROLE_TOKEN_CREATOR = 0x00040000;

const Country = artifacts.require("./CountryERC721");
const Sale = artifacts.require("./CountrySale");

//  prepare country initialization data
const COUNTRY_PRICE_DATA = [
	web3.toBigNumber(15729000000000000000), // Russia, fits into max uint64: 18446744073709551615
	web3.toBigNumber(11863548387096800000), // Canada
	web3.toBigNumber(11753333333333300000), // China
	web3.toBigNumber(11694666666666700000), // United States of America
	web3.toBigNumber(11005614035087700000), // Brazil
	web3.toBigNumber(11332800000000000000), // Australia
	web3.toBigNumber(5381333333333330000), // India
	web3.toBigNumber(4655000000000000000), // Argentina
	web3.toBigNumber(4562272727272730000), // Kazakhstan
	web3.toBigNumber(4080465116279070000), // Algeria
	web3.toBigNumber(4018139534883720000), // Democratic Republic of the Congo
	web3.toBigNumber(3786976744186050000), // Kingdom of Denmark
	web3.toBigNumber(3682790697674420000), // Saudi Arabia
	web3.toBigNumber(3365116279069770000), // Mexico
	web3.toBigNumber(3340476190476190000), // Indonesia
	web3.toBigNumber(3264761904761910000), // Sudan
	web3.toBigNumber(3161463414634150000), // Libya
	web3.toBigNumber(3035000000000000000), // Iran
	web3.toBigNumber(2955897435897440000), // Mongolia
	web3.toBigNumber(2630000000000000000), // Peru
	web3.toBigNumber(2627222222222220000), // Chad
	web3.toBigNumber(2592777777777780000), // Niger
	web3.toBigNumber(2551111111111110000), // Angola
	web3.toBigNumber(2537222222222220000), // Mali
	web3.toBigNumber(2496111111111110000), // South Africa
	web3.toBigNumber(2450000000000000000), // Colombia
	web3.toBigNumber(2372571428571430000), // Ethiopia
	web3.toBigNumber(2312000000000000000), // Bolivia
	web3.toBigNumber(2169142857142860000), // Mauritania
	web3.toBigNumber(2108000000000000000), // Egypt
	web3.toBigNumber(2047647058823530000), // Tanzania
	web3.toBigNumber(2001764705882350000), // Nigeria
	web3.toBigNumber(1975882352941180000), // Venezuela
	web3.toBigNumber(1842424242424240000), // Namibia
	web3.toBigNumber(1794545454545450000), // Pakistan
	web3.toBigNumber(1789696969696970000), // Mozambique
	web3.toBigNumber(1742424242424240000), // Turkey
	web3.toBigNumber(1689696969696970000), // Chile
	web3.toBigNumber(1680000000000000000), // Zambia
	web3.toBigNumber(1561875000000000000), // Myanmar (Burma)
	web3.toBigNumber(1555000000000000000), // France
	web3.toBigNumber(1490625000000000000), // Afghanistan
	web3.toBigNumber(1468125000000000000), // Somalia
	web3.toBigNumber(1434375000000000000), // Central African Republic
	web3.toBigNumber(1426875000000000000), // South Sudan
	web3.toBigNumber(1389375000000000000), // Ukraine
	web3.toBigNumber(1381875000000000000), // Botswana
	web3.toBigNumber(1351250000000000000), // Madagascar
	web3.toBigNumber(1336250000000000000), // Kenya
	web3.toBigNumber(1254838709677420000), // Yemen
	web3.toBigNumber(1221290322580650000), // Thailand
	web3.toBigNumber(1199354838709680000), // Spain
	web3.toBigNumber(1160000000000000000), // Turkmenistan
	web3.toBigNumber(1129677419354840000), // Cameroon
	web3.toBigNumber(1100000000000000000), // Papua New Guinea
	web3.toBigNumber(1069032258064520000), // Sweden
	web3.toBigNumber(1063225806451610000), // Uzbekistan
	web3.toBigNumber(1061290322580650000), // Morocco
	web3.toBigNumber(1038709677419360000), // Iraq
	web3.toBigNumber(998666666666667000), // Paraguay
	web3.toBigNumber(959333333333333000), // Zimbabwe
	web3.toBigNumber(928000000000000000), // Japan
	web3.toBigNumber(876666666666667000), // Germany
	web3.toBigNumber(840000000000000000), // Republic of the Congo
	web3.toBigNumber(827333333333333000), // Finland
	web3.toBigNumber(810000000000000000), // Malaysia
	web3.toBigNumber(809333333333334000), // Vietnam
	web3.toBigNumber(796000000000000000), // Norway
	web3.toBigNumber(792000000000000000), // Ivory Coast
	web3.toBigNumber(768000000000000000), // Poland
	web3.toBigNumber(760000000000000000), // Oman
	web3.toBigNumber(740000000000000000), // Italy
	web3.toBigNumber(736666666666667000), // Philippines
	web3.toBigNumber(696000000000000000), // Ecuador
	web3.toBigNumber(673333333333333000), // Burkina Faso
	web3.toBigNumber(661333333333333000), // New Zealand
	web3.toBigNumber(657333333333333000), // Gabon
	web3.toBigNumber(604000000000000000), // Guinea
	web3.toBigNumber(598000000000000000), // United Kingdom
	web3.toBigNumber(593333333333333000), // Uganda
	web3.toBigNumber(586000000000000000), // Ghana
	web3.toBigNumber(585333333333333000), // Romania
	web3.toBigNumber(581333333333333000), // Laos
	web3.toBigNumber(528000000000000000), // Guyana
	web3.toBigNumber(510000000000000000), // Belarus
	web3.toBigNumber(487333333333333000), // Kyrgyzstan
	web3.toBigNumber(482000000000000000), // Senegal
	web3.toBigNumber(454666666666667000), // Syria
	web3.toBigNumber(444666666666667000), // Cambodia
	web3.toBigNumber(432666666666667000), // Uruguay
	web3.toBigNumber(402000000000000000), // Tunisia
	web3.toBigNumber(400666666666667000), // Suriname
	web3.toBigNumber(362666666666667000), // Bangladesh
	web3.toBigNumber(361333333333333000), // Nepal
	web3.toBigNumber(351333333333333000), // Tajikistan
	web3.toBigNumber(324000000000000000), // Greece
	web3.toBigNumber(318000000000000000), // Nicaragua
	web3.toBigNumber(298000000000000000), // Eritrea
	web3.toBigNumber(296000000000000000), // North Korea
	web3.toBigNumber(290666666666667000), // Malawi
	web3.toBigNumber(276666666666667000), // Benin
	web3.toBigNumber(275333333333333000), // Honduras
	web3.toBigNumber(273333333333333000), // Liberia
	web3.toBigNumber(272666666666667000), // Bulgaria
	web3.toBigNumber(270000000000000000), // Cuba
	web3.toBigNumber(267333333333333000), // Guatemala
	web3.toBigNumber(252666666666667000), // Iceland
	web3.toBigNumber(242000000000000000), // South Korea
	web3.toBigNumber(228666666666667000), // Hungary
	web3.toBigNumber(226666666666667000), // Jordan
	web3.toBigNumber(224000000000000000), // Portugal (Total)
	web3.toBigNumber(216666666666667000), // Serbia
	web3.toBigNumber(212666666666667000), // Azerbaijan
	web3.toBigNumber(206000000000000000), // Austria
	web3.toBigNumber(203333333333333000), // United Arab Emirates
	web3.toBigNumber(193333333333333000), // Czech Republic
	web3.toBigNumber(192000000000000000), // Panama
	web3.toBigNumber(178666666666667000), // Sierra Leone
	web3.toBigNumber(175333333333333000), // Ireland
	web3.toBigNumber(171333333333333000), // Georgia
	web3.toBigNumber(161333333333333000), // Sri Lanka
	web3.toBigNumber(160000000000000000), // Lithuania
	web3.toBigNumber(158666666666667000), // Latvia
	web3.toBigNumber(139333333333333000), // Togo
	web3.toBigNumber(138666666666667000), // Croatia
	web3.toBigNumber(125333333333333000), // Bosnia and Herzegovina
	web3.toBigNumber(125333333333333000), // Costa Rica
	web3.toBigNumber(120000000000000000), // Slovakia
	web3.toBigNumber(119333333333333000), // Dominican Republic
	web3.toBigNumber(115333333333333000), // Bhutan
	web3.toBigNumber(111333333333333000), // Estonia
	web3.toBigNumber(104666666666667000), // Netherlands (Total)
	web3.toBigNumber(101333333333333000), // Switzerland
	web3.toBigNumber(88666666666666700), // Guinea-Bissau
	web3.toBigNumber(88666666666666700), // Republic of China (Taiwan, Quemoy, Matsu)
	web3.toBigNumber(83333333333333300), // Moldova
	web3.toBigNumber(80000000000000000), // Belgium
	web3.toBigNumber(74666666666666700), // Lesotho
	web3.toBigNumber(73333333333333300), // Armenia
	web3.toBigNumber(70666666666666700), // Albania
	web3.toBigNumber(70000000000000000), // Solomon Islands
	web3.toBigNumber(68666666666666700), // Equatorial Guinea
	web3.toBigNumber(68666666666666700), // Burundi
	web3.toBigNumber(68000000000000000), // Haiti
	web3.toBigNumber(66000000000000000), // Israel (Including West Bank and Gaza)
	web3.toBigNumber(64666666666666700), // Rwanda
	web3.toBigNumber(62000000000000000), // Macedonia
	web3.toBigNumber(56666666666666700), // Belize
	web3.toBigNumber(54000000000000000), // Djibouti
	web3.toBigNumber(51333333333333300), // El Salvador
	web3.toBigNumber(50000000000000000), // Slovenia
	web3.toBigNumber(44666666666666700), // Fiji
	web3.toBigNumber(44000000000000000), // Kuwait
	web3.toBigNumber(42666666666666700), // Swaziland
	web3.toBigNumber(36666666666666700), // East Timor
	web3.toBigNumber(34000000000000000), // Bahamas
	web3.toBigNumber(34000000000000000), // Montenegro
	web3.toBigNumber(30000000000000000), // Vanuatu
	web3.toBigNumber(28000000000000000), // Qatar
	web3.toBigNumber(28000000000000000), // The Gambia
	web3.toBigNumber(26666666666666700), // Jamaica
	web3.toBigNumber(25333333333333300), // Lebanon
	web3.toBigNumber(22666666666666700), // Cyprus
	web3.toBigNumber(14000000000000000), // Brunei
	web3.toBigNumber(12666666666666700), // Trinidad and Tobago
	web3.toBigNumber(10000000000000000), // Cape Verde
	web3.toBigNumber(7333333333333340), // Samoa
	web3.toBigNumber(6666666666666670), // Luxembourg
	web3.toBigNumber(5333333333333330), // Comoros
	web3.toBigNumber(3333333333333330), // Mauritius
	web3.toBigNumber(3333333333333330), // São Tomé and Príncipe
	web3.toBigNumber(3333333333333330), // Dominica
	web3.toBigNumber(3333333333333330), // Tonga
	web3.toBigNumber(3333333333333330), // Kiribati
	web3.toBigNumber(3333333333333330), // Micronesia
	web3.toBigNumber(3333333333333330), // Singapore
	web3.toBigNumber(3333333333333330), // Bahrain
	web3.toBigNumber(3333333333333330), // Saint Lucia
	web3.toBigNumber(3333333333333330), // Seychelles
	web3.toBigNumber(3333333333333330), // Andorra
	web3.toBigNumber(3333333333333330), // Palau
	web3.toBigNumber(3333333333333330), // Antigua and Barbuda
	web3.toBigNumber(3333333333333330), // Barbados
	web3.toBigNumber(3333333333333330), // Saint Vincent and the Grenadines
	web3.toBigNumber(3333333333333330), // Grenada
	web3.toBigNumber(3333333333333330), // Malta
	web3.toBigNumber(3333333333333330), // Maldives
	web3.toBigNumber(3333333333333330), // Saint Kitts and Nevis
	web3.toBigNumber(3333333333333330), // Marshall Islands
	web3.toBigNumber(3333333333333330), // Liechtenstein
];

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy country sale] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy country sale] coverage network - skipping the migration script");
		return;
	}

	// where the funds go to
	let beneficiary = "0xe0123204873fd29a29aef3f99faf1b1c45fe3b1e"; // MainNet MultiSig

	// for test network we redefine beneficiary MultiSig addresses
	if(network !== "mainnet") {
		// beneficiary = "0xb4e8e4f7e6024b37ed2584e8c86b2917dae9a2da"; // Rinkeby MultiSig
		beneficiary = "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69";
	}

	// deployed country token smart contract addresses
	let countryAddress = ""; // MainNet country token address
	if(network !== "mainnet") {
		countryAddress = "0xa31b0ae3164f7fe619fb208d97e1a2bb8a075b69"; // Rinkeby country token address
	}

	// country instance
	const country = Country.at(countryAddress);

	// deploy CountrySale smart contract
	await deployer.deploy(Sale, countryAddress, beneficiary, COUNTRY_PRICE_DATA);
	const sale = await Sale.deployed();
	const saleAddress = sale.address;

	// give permissions to sale smart contract to mint tokens
	await country.addOperator(saleAddress, ROLE_TOKEN_CREATOR);

	console.log("______________________________________________________");
	console.log("country:    " + countryAddress);
	console.log("supply:     " + await country.totalSupply());
	console.log("sale:       " + saleAddress);

};
