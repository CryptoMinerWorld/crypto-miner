// World Plot Sale dependencies
const Tracker = artifacts.require("./RefPointsTracker.sol");
const Country = artifacts.require("./CountryERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");

// World Plot Sale itself
const Sale = artifacts.require("./PlotSale.sol");

// features and roles to be used
const FEATURE_SALE_ENABLED = 0x00000001;
const ROLE_TOKEN_CREATOR = 0x00000001;
const ROLE_REF_POINTS_ISSUER = 0x00000001;
const ROLE_SELLER = 0x00000004;

// one token price
const SALE_PRICE = 20000000000000000;

// prepare country initialization data
// TODO: load from country_data.js
const COUNTRY_DATA = [
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
// TODO: load from country_data.js
const TOTAL_PLOTS = COUNTRY_DATA.reduce((a, b) => a + b, 0);

contract('PlotSale', (accounts) => {
	it("deployment: verify deployment routine", async() => {
		// define plot sale dependencies
		const r = await Tracker.new();
		const c = await Country.new(COUNTRY_DATA);
		const t = await Plot.new();
		const w = accounts[10];
		const m = accounts[11];
		const b = accounts[12];
		const u = new Date().getTime() / 1000 | 0;

		// verify wrong constructor parameters fail
		await assertThrowsAsync(Sale.new, 0, c.address, t.address, w, m, b, u);
		await assertThrowsAsync(Sale.new, r.address, 0, t.address, w, m, b, u);
		await assertThrowsAsync(Sale.new, r.address, c.address, 0, w, m, b, u);
		await assertThrowsAsync(Sale.new, r.address, c.address, t.address, 0, m, b, u);
		await assertThrowsAsync(Sale.new, r.address, c.address, t.address, w, 0, b, u);
		await assertThrowsAsync(Sale.new, r.address, c.address, t.address, w, m, 0, u);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);

		// verify the setup
		assert.equal(r.address, await s.refPointsTracker(), "wrong ref points tracker address");
		assert.equal(c.address, await s.countryInstance(), "wrong country instance address");
		assert.equal(t.address, await s.plotInstance(), "wrong plot instance address");
		assert.equal(w, await s.worldChest(), "wrong world chest address");
		assert.equal(m, await s.monthlyChest(), "wrong monthly chest address");
		assert.equal(b, await s.beneficiary(), "wrong beneficiary address");
		assert.equal(u, await s.saleStartUTC(), "wrong saleStartUTC value");
		assert.equal(SALE_PRICE, await s.SALE_PRICE(), "wrong SALE_PRICE value");
	});

	it("buy: ETH flow", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_SELLER);

		// save initial balances of the participants
		const p0 = await web3.eth.getBalance(p);
		const w0 = await web3.eth.getBalance(w);
		const m0 = await web3.eth.getBalance(m);
		const b0 = await web3.eth.getBalance(b);

		// buy one plot in Russia
		const gasUsed = (await s.buy(1, 1, 0, {from: p, value: SALE_PRICE})).receipt.gasUsed;

		// save new balances of the participants
		const p1 = await web3.eth.getBalance(p);
		const w1 = await web3.eth.getBalance(w);
		const m1 = await web3.eth.getBalance(m);
		const b1 = await web3.eth.getBalance(b);

		// verify player got n tokens
		assert.equal(1, await t.balanceOf(p), "wrong player token balance");
		// verify player balance decreased properly
		assert.equal(SALE_PRICE, p0.minus(p1).minus(gasUsed), "wrong player balance");
		// verify world chest balance increased properly
		assert.equal(SALE_PRICE / 5, w1.minus(w0), "wrong world chest balance");
		// verify monthly chest balance increased properly
		assert.equal(SALE_PRICE / 20, m1.minus(m0), "wrong monthly chest balance");
		// verify beneficiary account balance increased properly
		assert.equal(SALE_PRICE / 4 * 3, b1.minus(b0), "wrong beneficiary balance");
	});
	it("buy: ETH flow (owned country)", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const o = accounts[12]; // country owner account
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define a player account to buy tokens from
		const p = accounts[1]; // player

		// give Russia to some account
		await c.mint(o, 1);

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_SELLER);

		// save initial balances of the participants
		const w0 = await web3.eth.getBalance(w);
		const m0 = await web3.eth.getBalance(m);
		const o0 = await s.balanceOf(o);
		const b0 = await web3.eth.getBalance(b);
		const p0 = await web3.eth.getBalance(p);

		// buy one plot in Russia
		const gasUsed = (await s.buy(1, 1, 0, {from: p, value: SALE_PRICE})).receipt.gasUsed;

		// save new balances of the participants
		const w1 = await web3.eth.getBalance(w);
		const m1 = await web3.eth.getBalance(m);
		const o1 = await s.balanceOf(o);
		const b1 = await web3.eth.getBalance(b);
		const p1 = await web3.eth.getBalance(p);

		// verify player got n tokens
		assert.equal(1, await t.balanceOf(p), "wrong player token balance");
		// verify player balance decreased properly
		assert.equal(SALE_PRICE, p0.minus(p1).minus(gasUsed), "wrong player balance");
		// verify world chest balance increased properly
		assert.equal(SALE_PRICE / 5, w1.minus(w0), "wrong world chest balance");
		// verify monthly chest balance increased properly
		assert.equal(SALE_PRICE / 20, m1.minus(m0), "wrong monthly chest balance");
		// verify country owner balance increased properly
		assert.equal(SALE_PRICE / 10, o1.minus(o0), "wrong country owner balance (PlotSale.balanceOf)");
		// verify beneficiary account balance increased properly
		assert.equal(SALE_PRICE / 20 * 13, b1.minus(b0), "wrong beneficiary balance");


		// save real balance of the country owner
		const _o0 = await web3.eth.getBalance(o);
		// let country owner withdraw their balance from sale
		const _gasUsed = (await s.withdraw(o, {from: o})).receipt.gasUsed;
		// save new real balance of the country owner
		const _o1 = await web3.eth.getBalance(o);

		// verify country owner real balance increased properly
		assert.equal(SALE_PRICE / 10, _o1.minus(_o0).plus(_gasUsed), "wrong country owner balance");
	});
	it("buy: referral points flow", async() => {
		// define plot sale dependencies
		const r = await Tracker.new(); // ref tracker
		const c = await Country.new(COUNTRY_DATA); // country ERC721
		const t = await Plot.new(); // plot ERC721
		const w = accounts[10]; // world chest
		const m = accounts[11]; // monthly chest
		const b = accounts[13]; // beneficiary
		const u = -60 + new Date().getTime() / 1000 | 0; // offset, sale start time
		// define several accounts
		const p1 = accounts[1]; // player 1
		const p2 = accounts[2]; // player 2
		const p3 = accounts[3]; // player 3
		const p4 = accounts[4]; // player 4
		const p5 = accounts[5]; // player 5

		// instantiate plot sale smart contract
		const s = await Sale.new(r.address, c.address, t.address, w, m, b, u);
		// enable buying plots feature
		await s.updateFeatures(FEATURE_SALE_ENABLED);
		// grant sale a permission to mint tokens on PlotERC721
		await t.updateRole(s.address, ROLE_TOKEN_CREATOR);
		// grant sale a permission to add known addresses into ref tracker
		await r.updateRole(s.address, ROLE_REF_POINTS_ISSUER | ROLE_SELLER);

		// define convenient reusable buying function
		const buy = async (n, a, b) => {
			await s.buy(1, n, b, {from: a, value: n * SALE_PRICE + Math.floor(Math.random() * SALE_PRICE)});
		};

		// player 1 buys a plot and becomes a referrer
		await buy(1, p1, 0);
		// player 2 buys 4 plots referring to player 1 - it's not enough to get points
		await buy(4, p2, p1);
		// player 3 buys 5 plots referring to player 2 – both get referral points
		await buy(5, p3, p2);
		// player 4 buys few plots - not enough to get referral points
		await buy(1, p4, p1);
		// player 5 buys 9 plots referring to player 4 - both get referral points
		await buy(9, p5, p4);

		// verify referral points balances
		assert.equal(0, await r.balanceOf(p1), "wrong player 1 ref points balance");
		assert.equal(2, await r.balanceOf(p2), "wrong player 2 ref points balance");
		assert.equal(1, await r.balanceOf(p3), "wrong player 3 ref points balance");
		assert.equal(2, await r.balanceOf(p4), "wrong player 4 ref points balance");
		assert.equal(1, await r.balanceOf(p5), "wrong player 5 ref points balance");
	});

});

// auxiliary function to ensure function `fn` throws
async function assertThrowsAsync(fn, ...args) {
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
