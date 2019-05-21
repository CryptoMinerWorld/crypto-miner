// COUNTRY DATA (PLOTS), COUNTRY PRICE DATA (PRICES)

// number of plots for each country
export const COUNTRY_DATA = [
	62920, // Russia
	36777, // Canada
	35261, // China
	35084, // United States of America
	31367, // Brazil
	28333, // Australia
	12108, // India
	10241, // Argentina
	10037, // Kazakhstan
	8773, // Algeria
	8639, // Democratic Republic of the Congo
	7978, // Greenland
	7918, // Saudi Arabia
	7236, // Mexico
	7015, // Indonesia
	6857, // Sudan
	6481, // Libya
	6070, // Iran
	5764, // Mongolia
	4734, // Peru
	4729, // Chad
	4667, // Niger
	4592, // Angola
	4567, // Mali
	4493, // South Africa
	4411, // Colombia
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
	336, // Portugal
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
	159, // Denmark
	157, // Netherlands
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
	42, // Gambia
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
	5, // Liechtenstein
];

// calculate total number of plots
export const TOTAL_PLOTS = COUNTRY_DATA.reduce((a, b) => a + b, 0);

// price of each country in Wei
export const COUNTRY_PRICES = [
	web3.utils.toBN(15730000000000000000), // Russia, fits into max uint64: 18446744073709551615
	web3.utils.toBN(11863548387096800000), // Canada
	web3.utils.toBN(11753666666666700000), // China
	web3.utils.toBN(11694666666666700000), // United States of America
	web3.utils.toBN(11406181818181800000), // Brazil
	web3.utils.toBN(10897307692307700000), // Australia
	web3.utils.toBN(5381333333333330000), // India
	web3.utils.toBN(4655000000000000000), // Argentina
	web3.utils.toBN(4562272727272730000), // Kazakhstan
	web3.utils.toBN(4080465116279070000), // Algeria
	web3.utils.toBN(4018139534883720000), // Democratic Republic of the Congo
	web3.utils.toBN(3710697674418610000), // Greenland
	web3.utils.toBN(3682790697674420000), // Saudi Arabia
	web3.utils.toBN(3365581395348840000), // Mexico
	web3.utils.toBN(3340476190476190000), // Indonesia
	web3.utils.toBN(3265238095238100000), // Sudan
	web3.utils.toBN(3161463414634150000), // Libya
	web3.utils.toBN(3035000000000000000), // Iran
	web3.utils.toBN(2955897435897440000), // Mongolia
	web3.utils.toBN(2630000000000000000), // Peru
	web3.utils.toBN(2627222222222220000), // Chad
	web3.utils.toBN(2592777777777780000), // Niger
	web3.utils.toBN(2551111111111110000), // Angola
	web3.utils.toBN(2537222222222220000), // Mali
	web3.utils.toBN(2496111111111110000), // South Africa
	web3.utils.toBN(2450555555555560000), // Colombia
	web3.utils.toBN(2372571428571430000), // Ethiopia
	web3.utils.toBN(2312000000000000000), // Bolivia
	web3.utils.toBN(2169142857142860000), // Mauritania
	web3.utils.toBN(2108000000000000000), // Egypt
	web3.utils.toBN(2047647058823530000), // Tanzania
	web3.utils.toBN(2001764705882350000), // Nigeria
	web3.utils.toBN(1975882352941180000), // Venezuela
	web3.utils.toBN(1842424242424240000), // Namibia
	web3.utils.toBN(1794545454545450000), // Pakistan
	web3.utils.toBN(1789696969696970000), // Mozambique
	web3.utils.toBN(1742424242424240000), // Turkey
	web3.utils.toBN(1689696969696970000), // Chile
	web3.utils.toBN(1680000000000000000), // Zambia
	web3.utils.toBN(1561875000000000000), // Myanmar (Burma)
	web3.utils.toBN(1555000000000000000), // France
	web3.utils.toBN(1490625000000000000), // Afghanistan
	web3.utils.toBN(1468125000000000000), // Somalia
	web3.utils.toBN(1434375000000000000), // Central African Republic
	web3.utils.toBN(1426875000000000000), // South Sudan
	web3.utils.toBN(1389375000000000000), // Ukraine
	web3.utils.toBN(1381875000000000000), // Botswana
	web3.utils.toBN(1351250000000000000), // Madagascar
	web3.utils.toBN(1336250000000000000), // Kenya
	web3.utils.toBN(1254838709677420000), // Yemen
	web3.utils.toBN(1221290322580650000), // Thailand
	web3.utils.toBN(1199354838709680000), // Spain
	web3.utils.toBN(1160000000000000000), // Turkmenistan
	web3.utils.toBN(1129677419354840000), // Cameroon
	web3.utils.toBN(1100000000000000000), // Papua New Guinea
	web3.utils.toBN(1069032258064520000), // Sweden
	web3.utils.toBN(1063225806451610000), // Uzbekistan
	web3.utils.toBN(1061290322580650000), // Morocco
	web3.utils.toBN(1038709677419360000), // Iraq
	web3.utils.toBN(998666666666667000), // Paraguay
	web3.utils.toBN(959333333333333000), // Zimbabwe
	web3.utils.toBN(928000000000000000), // Japan
	web3.utils.toBN(876666666666667000), // Germany
	web3.utils.toBN(840000000000000000), // Republic of the Congo
	web3.utils.toBN(827333333333333000), // Finland
	web3.utils.toBN(810000000000000000), // Malaysia
	web3.utils.toBN(809333333333334000), // Vietnam
	web3.utils.toBN(796000000000000000), // Norway
	web3.utils.toBN(792000000000000000), // Ivory Coast
	web3.utils.toBN(768000000000000000), // Poland
	web3.utils.toBN(760000000000000000), // Oman
	web3.utils.toBN(740000000000000000), // Italy
	web3.utils.toBN(736666666666667000), // Philippines
	web3.utils.toBN(696000000000000000), // Ecuador
	web3.utils.toBN(673333333333333000), // Burkina Faso
	web3.utils.toBN(661333333333333000), // New Zealand
	web3.utils.toBN(657333333333333000), // Gabon
	web3.utils.toBN(604000000000000000), // Guinea
	web3.utils.toBN(598000000000000000), // United Kingdom
	web3.utils.toBN(593333333333333000), // Uganda
	web3.utils.toBN(586000000000000000), // Ghana
	web3.utils.toBN(585333333333333000), // Romania
	web3.utils.toBN(581333333333333000), // Laos
	web3.utils.toBN(528000000000000000), // Guyana
	web3.utils.toBN(510000000000000000), // Belarus
	web3.utils.toBN(487333333333333000), // Kyrgyzstan
	web3.utils.toBN(482000000000000000), // Senegal
	web3.utils.toBN(454666666666667000), // Syria
	web3.utils.toBN(444666666666667000), // Cambodia
	web3.utils.toBN(432666666666667000), // Uruguay
	web3.utils.toBN(402000000000000000), // Tunisia
	web3.utils.toBN(400666666666667000), // Suriname
	web3.utils.toBN(362666666666667000), // Bangladesh
	web3.utils.toBN(361333333333333000), // Nepal
	web3.utils.toBN(351333333333333000), // Tajikistan
	web3.utils.toBN(324000000000000000), // Greece
	web3.utils.toBN(318000000000000000), // Nicaragua
	web3.utils.toBN(298000000000000000), // Eritrea
	web3.utils.toBN(296000000000000000), // North Korea
	web3.utils.toBN(290666666666667000), // Malawi
	web3.utils.toBN(276666666666667000), // Benin
	web3.utils.toBN(275333333333333000), // Honduras
	web3.utils.toBN(273333333333333000), // Liberia
	web3.utils.toBN(272666666666667000), // Bulgaria
	web3.utils.toBN(270000000000000000), // Cuba
	web3.utils.toBN(267333333333333000), // Guatemala
	web3.utils.toBN(252666666666667000), // Iceland
	web3.utils.toBN(242000000000000000), // South Korea
	web3.utils.toBN(228666666666667000), // Hungary
	web3.utils.toBN(226666666666667000), // Jordan
	web3.utils.toBN(224000000000000000), // Portugal
	web3.utils.toBN(216666666666667000), // Serbia
	web3.utils.toBN(212666666666667000), // Azerbaijan
	web3.utils.toBN(206000000000000000), // Austria
	web3.utils.toBN(203333333333333000), // United Arab Emirates
	web3.utils.toBN(193333333333333000), // Czech Republic
	web3.utils.toBN(192000000000000000), // Panama
	web3.utils.toBN(178666666666667000), // Sierra Leone
	web3.utils.toBN(175333333333333000), // Ireland
	web3.utils.toBN(171333333333333000), // Georgia
	web3.utils.toBN(161333333333333000), // Sri Lanka
	web3.utils.toBN(160000000000000000), // Lithuania
	web3.utils.toBN(158666666666667000), // Latvia
	web3.utils.toBN(139333333333333000), // Togo
	web3.utils.toBN(138666666666667000), // Croatia
	web3.utils.toBN(125333333333333000), // Bosnia and Herzegovina
	web3.utils.toBN(125333333333333000), // Costa Rica
	web3.utils.toBN(120000000000000000), // Slovakia
	web3.utils.toBN(119333333333333000), // Dominican Republic
	web3.utils.toBN(115333333333333000), // Bhutan
	web3.utils.toBN(111333333333333000), // Estonia
	web3.utils.toBN(106000000000000000), // Denmark
	web3.utils.toBN(104666666666667000), // Netherlands
	web3.utils.toBN(101333333333333000), // Switzerland
	web3.utils.toBN(88666666666666700), // Guinea-Bissau
	web3.utils.toBN(88666666666666700), // Republic of China (Taiwan, Quemoy, Matsu)
	web3.utils.toBN(83333333333333300), // Moldova
	web3.utils.toBN(80000000000000000), // Belgium
	web3.utils.toBN(74666666666666700), // Lesotho
	web3.utils.toBN(73333333333333300), // Armenia
	web3.utils.toBN(70666666666666700), // Albania
	web3.utils.toBN(70000000000000000), // Solomon Islands
	web3.utils.toBN(68666666666666700), // Equatorial Guinea
	web3.utils.toBN(68666666666666700), // Burundi
	web3.utils.toBN(68000000000000000), // Haiti
	web3.utils.toBN(66000000000000000), // Israel (Including West Bank and Gaza)
	web3.utils.toBN(64666666666666700), // Rwanda
	web3.utils.toBN(62000000000000000), // Macedonia
	web3.utils.toBN(56666666666666700), // Belize
	web3.utils.toBN(54000000000000000), // Djibouti
	web3.utils.toBN(51333333333333300), // El Salvador
	web3.utils.toBN(50000000000000000), // Slovenia
	web3.utils.toBN(44666666666666700), // Fiji
	web3.utils.toBN(44000000000000000), // Kuwait
	web3.utils.toBN(42666666666666700), // Swaziland
	web3.utils.toBN(36666666666666700), // East Timor
	web3.utils.toBN(34000000000000000), // Bahamas
	web3.utils.toBN(34000000000000000), // Montenegro
	web3.utils.toBN(30000000000000000), // Vanuatu
	web3.utils.toBN(28000000000000000), // Qatar
	web3.utils.toBN(28000000000000000), // Gambia
	web3.utils.toBN(26666666666666700), // Jamaica
	web3.utils.toBN(25333333333333300), // Lebanon
	web3.utils.toBN(22666666666666700), // Cyprus
	web3.utils.toBN(14000000000000000), // Brunei
	web3.utils.toBN(12666666666666700), // Trinidad and Tobago
	web3.utils.toBN(10000000000000000), // Cape Verde
	web3.utils.toBN(7333333333333340), // Samoa
	web3.utils.toBN(6666666666666670), // Luxembourg
	web3.utils.toBN(5333333333333330), // Comoros
/*
	web3.utils.toBN(3333333333333330), // Mauritius
	web3.utils.toBN(3333333333333330), // São Tomé and Príncipe
	web3.utils.toBN(3333333333333330), // Dominica
	web3.utils.toBN(3333333333333330), // Tonga
	web3.utils.toBN(3333333333333330), // Kiribati
	web3.utils.toBN(3333333333333330), // Micronesia
	web3.utils.toBN(3333333333333330), // Singapore
	web3.utils.toBN(3333333333333330), // Bahrain
	web3.utils.toBN(3333333333333330), // Saint Lucia
	web3.utils.toBN(3333333333333330), // Seychelles
	web3.utils.toBN(3333333333333330), // Andorra
	web3.utils.toBN(3333333333333330), // Palau
	web3.utils.toBN(3333333333333330), // Antigua and Barbuda
	web3.utils.toBN(3333333333333330), // Barbados
	web3.utils.toBN(3333333333333330), // Saint Vincent and the Grenadines
	web3.utils.toBN(3333333333333330), // Grenada
	web3.utils.toBN(3333333333333330), // Malta
	web3.utils.toBN(3333333333333330), // Maldives
	web3.utils.toBN(3333333333333330), // Saint Kitts and Nevis
	web3.utils.toBN(3333333333333330), // Liechtenstein
*/
];

// calculate total cumulative price of all countries
export const TOTAL_PRICE = COUNTRY_PRICES.reduce((a, b) => a.add(b), web3.utils.toBN(0));

// country names data
export const COUNTRY_NAMES = [
	'Russia',
	'Canada',
	'China',
	'United States of America',
	'Brazil',
	'Australia',
	'India',
	'Argentina',
	'Kazakhstan',
	'Algeria',
	'Democratic Republic of the Congo',
	'Greenland',
	'Saudi Arabia',
	'Mexico',
	'Indonesia',
	'Sudan',
	'Libya',
	'Iran',
	'Mongolia',
	'Peru',
	'Chad',
	'Niger',
	'Angola',
	'Mali',
	'South Africa',
	'Colombia',
	'Ethiopia',
	'Bolivia',
	'Mauritania',
	'Egypt',
	'Tanzania',
	'Nigeria',
	'Venezuela',
	'Namibia',
	'Pakistan',
	'Mozambique',
	'Turkey',
	'Chile',
	'Zambia',
	'Myanmar (Burma)',
	'France',
	'Afghanistan',
	'Somalia',
	'Central African Republic',
	'South Sudan',
	'Ukraine',
	'Botswana',
	'Madagascar',
	'Kenya',
	'Yemen',
	'Thailand',
	'Spain',
	'Turkmenistan',
	'Cameroon',
	'Papua New Guinea',
	'Sweden',
	'Uzbekistan',
	'Morocco',
	'Iraq',
	'Paraguay',
	'Zimbabwe',
	'Japan',
	'Germany',
	'Republic of the Congo',
	'Finland',
	'Malaysia',
	'Vietnam',
	'Norway',
	'Ivory Coast',
	'Poland',
	'Oman',
	'Italy',
	'Philippines',
	'Ecuador',
	'Burkina Faso',
	'New Zealand',
	'Gabon',
	'Guinea',
	'United Kingdom',
	'Uganda',
	'Ghana',
	'Romania',
	'Laos',
	'Guyana',
	'Belarus',
	'Kyrgyzstan',
	'Senegal',
	'Syria',
	'Cambodia',
	'Uruguay',
	'Tunisia',
	'Suriname',
	'Bangladesh',
	'Nepal',
	'Tajikistan',
	'Greece',
	'Nicaragua',
	'Eritrea',
	'North Korea',
	'Malawi',
	'Benin',
	'Honduras',
	'Liberia',
	'Bulgaria',
	'Cuba',
	'Guatemala',
	'Iceland',
	'South Korea',
	'Hungary',
	'Jordan',
	'Portugal',
	'Serbia',
	'Azerbaijan',
	'Austria',
	'United Arab Emirates',
	'Czech Republic',
	'Panama',
	'Sierra Leone',
	'Ireland',
	'Georgia',
	'Sri Lanka',
	'Lithuania',
	'Latvia',
	'Togo',
	'Croatia',
	'Bosnia and Herzegovina',
	'Costa Rica',
	'Slovakia',
	'Dominican Republic',
	'Bhutan',
	'Estonia',
	'Denmark',
	'Netherlands',
	'Switzerland',
	'Guinea-Bissau',
	'Republic of China (Taiwan, Quemoy, Matsu)',
	'Moldova',
	'Belgium',
	'Lesotho',
	'Armenia',
	'Albania',
	'Solomon Islands',
	'Equatorial Guinea',
	'Burundi',
	'Haiti',
	'Israel (Including West Bank and Gaza)',
	'Rwanda',
	'Macedonia',
	'Belize',
	'Djibouti',
	'El Salvador',
	'Slovenia',
	'Fiji',
	'Kuwait',
	'Swaziland',
	'East Timor',
	'Bahamas',
	'Montenegro',
	'Vanuatu',
	'Qatar',
	'Gambia',
	'Jamaica',
	'Lebanon',
	'Cyprus',
	'Brunei',
	'Trinidad and Tobago',
	'Cape Verde',
	'Samoa',
	'Luxembourg',
	'Comoros',
	'Mauritius',
	'São Tomé and Príncipe',
	'Dominica',
	'Tonga',
	'Kiribati',
	'Micronesia',
	'Singapore',
	'Bahrain',
	'Saint Lucia',
	'Seychelles',
	'Andorra',
	'Palau',
	'Antigua and Barbuda',
	'Barbados',
	'Saint Vincent and the Grenadines',
	'Grenada',
	'Malta',
	'Maldives',
	'Saint Kitts and Nevis',
	'Liechtenstein',
];
