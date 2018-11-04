const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;
const FEATURE_ALLOW_TAX_UPDATE = 0x00000004;
const ROLE_TOKEN_CREATOR = 0x00040000;

const Token = artifacts.require("./CountryERC721.sol");

// prepare country initialization data
const COUNTRY_DATA = [
	62978, // Russia
	36777, // Canada
	35260, // China
	35084, // USA
	31366, // Brazil
	28332, // Australia
	12108, // India
	10241, // Argentina
	10037, // Kazakhstan
	8773,  // Algeria
	8639,  // Democratic Republic of the Congo
	8142,  // Kingdom of Denmark
	7918,  // Saudi Arabia
	7235,  // Mexico
	7015,  // Indonesia
	6856,  // Sudan
	6481,  // Libya
	6070,  // Iran
	5764,  // Mongolia
	4734,  // Peru
	4729,  // Chad
	4667,  // Niger
	4592,  // Angola
	4567,  // Mali
	4493,  // South Africa
	4410,  // Colombia
	4152,  // Ethiopia
	4046,  // Bolivia
	3796,  // Mauritania
	3689,  // Egypt
	3481,  // Tanzania
	3403,  // Nigeria
	3359,  // Venezuela
	3040,  // Namibia
	2961,  // Pakistan
	2953,  // Mozambique
	2875,  // Turkey
	2788,  // Chile
	2772,  // Zambia
	2499,  // Myanmar (Burma)
	2488,  // France
	2385,  // Afghanistan
	2349,  // Somalia
	2295,  // Central African Republic
	2283,  // South Sudan
	2223,  // Ukraine
	2211,  // Botswana
	2162,  // Madagascar
	2138,  // Kenya
	1945,  // Yemen
	1893,  // Thailand
	1859,  // Spain
	1798,  // Turkmenistan
	1751,  // Cameroon
	1705,  // Papua New Guinea
	1657,  // Sweden
	1648,  // Uzbekistan
	1645,  // Morocco
	1610,  // Iraq
	1498,  // Paraguay
	1439,  // Zimbabwe
	1392,  // Japan
	1315,  // Germany
	1260,  // Republic of the Congo
	1241,  // Finland
	1215,  // Malaysia
	1214,  // Vietnam
	1194,  // Norway
	1188,  // Ivory Coast
	1152,  // Poland
	1140,  // Oman
	1110,  // Italy
	1105,  // Philippines
	1044,  // Ecuador
	1010,  // Burkina Faso
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
	99,  // Israel (Including West Bank and Gaza)
	97,  // Rwanda
	93,  // Macedonia
	85,  // Belize
	81,  // Djibouti
	77,  // El Salvador
	75,  // Slovenia
	67,  // Fiji
	66,  // Kuwait
	64,  // Swaziland
	55,  // East Timor
	51,  // Bahamas
	51,  // Montenegro
	45,  // Vanuatu
	42,  // Qatar
	42,  // The Gambia
	40,  // Jamaica
	38,  // Lebanon
	34,  // Cyprus
	21,  // Brunei
	19,  // Trinidad and Tobago
	15,  // Cape Verde
	11,  // Samoa
	10,  // Luxembourg
	8,   // Comoros
	7,   // Mauritius
	4,   // São Tomé and Príncipe
	3,   // Dominica
	3,   // Tonga
	3,   // Kiribati
	3,   // Micronesia
	3,   // Singapore
	2,   // Bahrain
	2,   // Saint Lucia
	2,   // Seychelles
	2,   // Andorra
	2,   // Palau
	2,   // Antigua and Barbuda
	2,   // Barbados
	1,   // Saint Vincent and the Grenadines
	1,   // Grenada
	1,   // Malta
	1,   // Maldives
	1,   // Saint Kitts and Nevis
	1,   // Marshall Islands
	1,   // Liechtenstein
];

// calculate total number of plots
const TOTAL_PLOTS = COUNTRY_DATA.reduce((a, b) => a + b, 0);

// default token ID to work with
const token1 = 1;
const token2 = 2;
const token3 = 3;

// auxiliary constant "2"
const two = web3.toBigNumber(2);

contract('CountryERC721', (accounts) => {
	it("initial state: no tokens exist initially", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// check that number of countries is correct
		assert.equal(COUNTRY_DATA.length, await tk.getNumberOfCountries(), "wrong number of countries");

		// check that total number of plots is correct
		assert.equal(TOTAL_PLOTS, await tk.getTotalNumberOfPlots(), "wrong total number of plots");

		// check that initial number of plots for some country owner is zero
		assert.equal(0, await tk.getNumberOfPlotsByCountryOwner(accounts[0]), "wrong initial number of plots for account 0");

		// check that initial total supply and balance are both zeros
		assert.equal(0, await tk.totalSupply(), "wrong initial totalSupply value");
		assert.equal(0, await tk.balanceOf(accounts[0]), "wrong initial balanceOf() value");

		// balanceOf(0) throws:
		await assertThrowsAsync(async () => await tk.balanceOf(0));

		// check the token map
		assert.equal(0, await tk.tokenMap(), "wrong initial token map");

		// ensure it is not possible to get token at index 0
		await assertThrowsAsync(async () => await tk.tokenByIndex(0));
		await assertThrowsAsync(async () => await tk.tokenOfOwnerByIndex(accounts[0], 0));
	});

	it("mint: creating a token", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// minting with invalid parameters
		await assertThrowsAsync(async() => await tk.mint(0, token1));
		await assertThrowsAsync(async() => await tk.mint(tk.address, token1));

		// mint token 1 with correct params
		await tk.mint(accounts[0], token1);

		// check its impossible to mint with incorrect params
		await assertThrowsAsync(async () => await tk.mint(accounts[0], 0));
		await assertThrowsAsync(async () => await tk.mint(accounts[0], 191));
		await assertThrowsAsync(async () => await tk.mint(accounts[1], token2, {from: accounts[1]}));

		// ensure total supply is 1
		assert.equal(1, await tk.totalSupply(), "wrong totalSupply value after minting a token");

		// mint token 2
		await tk.mint(accounts[1], token2);

		// validate the data
		assert.equal(token1, await tk.tokenByIndex(0), "wrong token ID at index 0");
		assert.equal(token1, await tk.tokenOfOwnerByIndex(accounts[0], 0), "wrong token ID at index 0 for account 0");
		assert.equal(2, await tk.totalSupply(), "wrong totalSupply value after minting two tokens");
		assert.equal(1, await tk.balanceOf(accounts[0]), "account 0 has wrong balance after minting a token");
		assert.equal(1, await tk.balanceOf(accounts[1]), "account 1 has wrong balance after minting a token");
		assert.equal(0, await tk.balanceOf(accounts[2]), "account 2 has wrong initial balance");
		assert(await tk.exists(token1), "token 1 doesn't exist");
		assert(await tk.exists(2), "token 2 doesn't exist");
		assert(!await tk.exists(3), "token 3 exists while it should not");
	});
	it("mint: integrity of newly created token", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// define functions to read token properties
		const getPacked = async() => await tk.getPacked(token1);
		const getNumberOfPlots = async() => await tk.getNumberOfPlots(token1);
		const getTax = async() => await tk.getTax(token1);
		const getTaxPercent = async() => await tk.getTaxPercent(token1);
		const calculateTaxValueFor = async() => await tk.calculateTaxValueFor(token1, 100);

		// initially all functions throw
		await assertThrowsAsync(getPacked);
		await assertThrowsAsync(getNumberOfPlots);
		await assertThrowsAsync(getTax);
		await assertThrowsAsync(getTaxPercent);
		await assertThrowsAsync(calculateTaxValueFor);

		await tk.mint(accounts[0], token1);

		// check data integrity
		assert(two.pow(16).times(COUNTRY_DATA[0]).plus(0x010A).eq(await getPacked()), "token 1 has wrong packed attributes");
		assert.equal(COUNTRY_DATA[0], await getNumberOfPlots(), "token 1 has wrong number of plots");
		assert.deepEqual([web3.toBigNumber(1), web3.toBigNumber(10)], await getTax(), "token 1 has wrong tax");
		assert.equal(10, await getTaxPercent(), "token 1 has wrong tax percent");
		assert.equal(10, await calculateTaxValueFor(), "token 1 calculated tax value is wrong");

		const tokenCollection = await tk.getCollection(accounts[0]);
		assert.equal(1, tokenCollection.length, "wrong token collection size for account 0");
		assert.equal(token1, tokenCollection[0], "wrong element 0 in the token collection for account 0");

		assert.equal("http://cryptominerworld.com/country/1", await tk.tokenURI(1), "wrong token 1 tokenURI");

		// check the token map
		assert.equal(1, await tk.tokenMap(), "wrong token map after minting token 1");
	});
	it("mint: token map", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// define token IDs to mint:
		const tokens = [187, 115, 39];

		// expected will hold the expected token bitmap value
		let expected = web3.toBigNumber(0);

		// mint several tokens and calculate the expected bitmap
		for(const token of tokens) {
			await tk.mint(accounts[0], token);
			expected = expected.plus(two.pow(token - 1));
		}

		// read the token bit map
		const bitmap = await tk.tokenMap();

		// check the token bitmap is as expected
		assert(bitmap.eq(expected), "unexpected bitmap");
	});

	it("taxes: check the tax rate is set correctly initially", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// mint token 1 with correct params
		await tk.mint(accounts[0], token1);

		// ensure correct tax rate on the token 1
		assert.equal(1, (await tk.getTax(token1))[0], "wrong tax rate nominator set on token 1");
		assert.equal(10, (await tk.getTax(token1))[1], "wrong tax rate denominator set on token 1");
		assert.equal(10, await tk.getTaxPercent(token1), "wrong tax rate set on token 1");
		assert.equal(0, await tk.calculateTaxValueFor(token1, 9), "wrong calculated tax value on token 1 for value 9");
		assert.equal(1, await tk.calculateTaxValueFor(token1, 10), "wrong calculated tax value on token 1 for value 10");
	});
	it("taxes: update tax rate, maximum rate", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// mint token 1
		await tk.mint(accounts[0], token1);

		// define tax update functions
		const updateTaxRate = async () => await tk.updateTaxRate(token1, 1, 15);
		const updateMaxTaxChangeFreq = async () => await tk.updateMaxTaxChangeFreq(0);

		await assertThrowsAsync(updateTaxRate);
		await tk.updateFeatures(FEATURE_ALLOW_TAX_UPDATE);
		await updateTaxRate();
		await assertThrowsAsync(updateTaxRate);
		await updateMaxTaxChangeFreq();
		await updateTaxRate();

		// validate tax change
		assert.equal(3, await tk.calculateTaxValueFor(token1, 45), "wrong tax value after update (45)");
		assert.equal(2, await tk.calculateTaxValueFor(token1, 44), "wrong tax value after update (44)");
	});

	it("integrity: create few tokens, check the integrity", async () => {
		const tk = await Token.new(COUNTRY_DATA);

		// define token IDs to mint to account0:
		const tokens0 = [187, 115, 39, 13, 7];

		// define token IDs to mint to account1:
		const tokens1 = [99, 55, 44];

		// mint the tokens to account 0
		for(const token of tokens0) {
			await tk.mint(accounts[0], token);
		}
		// mint the tokens to account 1
		for(const token of tokens1) {
			await tk.mint(accounts[1], token);
		}

		assert.deepEqual(tokens0, (await tk.getCollection(accounts[0])).map(Number), "wrong token ID collection for account 0");
		assert.deepEqual(tokens1, (await tk.getCollection(accounts[1])).map(Number), "wrong token ID collection for account 1");
		//assert.deepEqual(tokens0.concat(tokens1), (await tk.allTokens()).map(Number), "wrong all tokens collection");

		// construct expected packed struct for tokens0
		const expectedPacked0 = [];
		for(const token of tokens0) {
			expectedPacked0.push(two.pow(32).times(token).plus(two.pow(16).times(COUNTRY_DATA[token - 1])).plus(256).plus(10));
		}

		assert.deepEqual(expectedPacked0, await tk.getPackedCollection(accounts[0]), "wrong token packed collection for account 0");
	});


	it("transfer: transferring a token", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		const fn = async () => await tk.transfer(accounts[1], token1);
		await assertThrowsAsync(fn);
		await tk.updateFeatures(0);
		await tk.mint(accounts[0], token1);
		assert.equal(1, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance before token transfer");
		assert.equal(0, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		await assertThrowsAsync(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await assertThrowsAsync(async () => await tk.transfer(0x0, token1));
		await assertThrowsAsync(async () => await tk.transfer(accounts[0], token1));
		await fn();
		assert.equal(0, await tk.balanceOf(accounts[0]), accounts[0] + " wrong balance after token transfer");
		assert.equal(1, await tk.balanceOf(accounts[1]), accounts[1] + " wrong balance before token transfer");
		assert.equal(accounts[1], await tk.ownerOf(token1), "wrong token token1 owner after token transfer");
	});

	it("transferFrom: transferring on behalf", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[1], token1);
		await tk.mint(accounts[0], token2);
		const fn1 = async () => await tk.transferFrom(accounts[1], accounts[2], token1);
		await assertThrowsAsync(async () => await tk.approve(accounts[0], token1));
		await assertThrowsAsync(async () => await tk.approve(accounts[0], token2));
		await assertThrowsAsync(fn1);
		await tk.approve(accounts[0], token1, {from: accounts[1]});
		await tk.revokeApproval(token1, {from: accounts[1]});
		await assertThrowsAsync(async () => await tk.revokeApproval(token1, {from: accounts[1]}));
		await tk.approve(accounts[0], token1, {from: accounts[1]});
		await fn1();
		await tk.updateFeatures(ROLE_TOKEN_CREATOR);
		const fn = async () => await tk.transferFrom(accounts[0], accounts[1], token2);
		await assertThrowsAsync(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		await assertThrowsAsync(fn);
		await tk.updateFeatures(FEATURE_TRANSFERS);
		await fn();
		assert.equal(accounts[1], await tk.ownerOf(token2), "wrong token token2 owner after transfer on behalf");
		assert.equal(accounts[2], await tk.ownerOf(token1), "wrong token token1 owner after transfer on behalf");
	});

	it("safeTransferFrom: safe transfer token to address", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS);
		await tk.mint(accounts[0], token1);
		await tk.safeTransferFrom(accounts[0], accounts[1], token1, "");
		assert.equal(accounts[1], await tk.ownerOf(token1), "token token1 has wrong owner after safely transferring it");
	});
	it("safeTransferFrom: impossible to safe transfer to a smart contract", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		const another = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS);
		await tk.mint(accounts[0], token1);
		await assertThrowsAsync(async () => await tk.safeTransferFrom(accounts[0], another.address, token1, ""));
		await assertThrowsAsync(async () => await tk.safeTransferFrom(accounts[0], tk.address, token1, ""));
		assert.equal(accounts[0], await tk.ownerOf(token1), "card token1 has wrong owner after bad attempt to transfer it");
		await tk.safeTransferFrom(accounts[0], accounts[1], token1, "");
		assert.equal(accounts[1], await tk.ownerOf(token1), "token token1 has wrong owner after safely transferring it");
	});

	it("approve: approve and transfer on behalf", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], token1);
		await tk.mint(accounts[0], token2);
		await tk.mint(accounts[0], token3);
		await assertThrowsAsync(async () => await tk.approve(0x0, 0x0));
		await assertThrowsAsync(async () => await tk.approve(accounts[0], token1));
		await tk.approve(accounts[1], token1);
		await tk.approve(accounts[1], token2);
		assert.equal(accounts[1], await tk.getApproved(token1), "wrong approved operator for token token1");
		await tk.transferFrom(accounts[0], accounts[1], token1, {from: accounts[1]});
		await tk.transferFrom(accounts[0], accounts[1], token2, {from: accounts[1]});
		assert.equal(0, await tk.getApproved(token1), "wrong approved operator for token token1 after transfer");
	});
	it("approve: approve all and transfer on behalf", async () => {
		const tk = await Token.new(COUNTRY_DATA);
		await tk.updateFeatures(ROLE_TOKEN_CREATOR | FEATURE_TRANSFERS_ON_BEHALF);
		await tk.mint(accounts[0], token1);
		await tk.mint(accounts[0], token2);
		await tk.mint(accounts[0], token3);
		await assertThrowsAsync(async () => await tk.setApprovalForAll(0x0, true));
		await assertThrowsAsync(async () => await tk.setApprovalForAll(accounts[0], true));
		await tk.setApprovalForAll(accounts[1], true);
		await tk.transferFrom(accounts[0], accounts[1], token1, {from: accounts[1]});
		await tk.transferFrom(accounts[0], accounts[1], token2, {from: accounts[1]});
		assert(await tk.isApprovedForAll(accounts[0], accounts[1]), "should be approved operator");
		await tk.setApprovalForAll(accounts[1], false);
		assert(!await tk.isApprovedForAll(accounts[0], accounts[1]), "should not be approved operator");
	});

});



// auxiliary function to ensure function `fn` throws
async function assertThrowsAsync(fn, ...args) {
	let f = () => {};
	try {
		await fn(args);
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
