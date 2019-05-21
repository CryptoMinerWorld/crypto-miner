const FEATURE_ADD = 0x00000001;
const FEATURE_TRANSFERS = 0x00000001;
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

// gem smart contract
const GemERC721 = artifacts.require("./GemERC721");
// country smart contract
const CountryERC721 = artifacts.require("./CountryERC721.sol");
// and an auction to list the gems on
const Auction = artifacts.require("./DutchAuction");
// auction helper will help listing the gems
const Helper = artifacts.require("./DutchAuctionHelper");

// import country data
import {COUNTRY_DATA} from "../data_legacy/country_data";

contract('Dutch Auction Helper', accounts => {
	it("helper: verifying gem collection on auction", async() => {
		const token = await GemERC721.new();
		const auction = await Auction.new();
		const helper = await Helper.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(token.address, true);
		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		await token.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// mint 100 tokens
		for(let i = 0; i < 100; i++) {
			await token.mint(
				accounts[i % 2 + 1], // owner
				i + 1, // unique token ID
				1, // plot ID
				0, // depth
				1, // gem number
				1, // color ID
				1, // level ID
				1, // grade type
				1  // grade value
			);
		}

		// account1 has 50 tokens
		const packedOriginal = await token.getPackedCollection(accounts[1]);

		// auxiliary constant "2"
		const two = web3.toBigNumber(2);

		// construct auction parameters
		const t0 = 60 + new Date().getTime() / 1000 | 0;
		const t1 = t0 + 60;
		const p0 = web3.toWei(1, "ether"); // price starts at 1 ether
		const p1 = web3.toWei(1, "finney"); // and drops to 1 finney

		// put them all to an auction
		for(let i = 0; i < packedOriginal.length; i++) {
			const tokenId = packedOriginal[i].dividedToIntegerBy(two.pow(48));
			const data = abiPack(tokenId, t0, t1, p0, p1);

			// account 1 transfers token to an auction automatically activating it
			await token.safeTransferFrom(accounts[1], auction.address, tokenId, data, {from: accounts[1]});
		}

		// all account1 100 tokens are on the auction, use helper to obtain them
		const packedAuction = await helper.getGemCollectionByOwner(auction.address, token.address, accounts[1]);

		// pack auction data, prices are in Gwei
		const auctionData = pack(t0, t1, p0 / 1000000000, p1 / 1000000000, p0 / 1000000000);

		// append additional auction specific data to original collection
		for(let i = 0; i < packedOriginal.length; i++) {
			packedOriginal[i] = packedOriginal[i].times(two.pow(184)).plus(auctionData);
		}

		// sort both arrays to compare
		packedOriginal.sort();
		packedAuction.sort();

		// compare both arrays
		assert.deepEqual(packedAuction, packedOriginal, "original and auction arrays differ");
	});

	it("helper: verifying country collection on auction", async() => {
		const token = await CountryERC721.new(COUNTRY_DATA);
		const auction = await Auction.new();
		const helper = await Helper.new();

		// to list a token in the auction it must be whitelisted
		await auction.whitelist(token.address, true);
		// to list a token in the auction FEATURE_ADD is required
		await auction.updateFeatures(FEATURE_ADD);
		// to list a token in the auction using safeTransferFrom both transfers features may be required
		await token.updateFeatures(FEATURE_TRANSFERS | FEATURE_TRANSFERS_ON_BEHALF);

		// mint all the tokens (190)
		for(let i = 0; i < COUNTRY_DATA.length; i++) {
			await token.mint(
				accounts[i % 2 + 1], // owner
				i + 1 // token ID
			);
		}

		// account1 has 95 tokens
		const packedOriginal = await token.getPackedCollection(accounts[1]);

		// auxiliary constant "2"
		const two = web3.toBigNumber(2);

		// construct auction parameters
		const t0 = 60 + new Date().getTime() / 1000 | 0;
		const t1 = t0 + 60;
		const p0 = web3.toWei(1, "ether"); // price starts at 1 ether
		const p1 = web3.toWei(1, "finney"); // and drops to 1 finney

		// put them all to an auction
		for(let i = 0; i < packedOriginal.length; i++) {
			const tokenId = packedOriginal[i].dividedToIntegerBy(two.pow(32));
			const data = abiPack(tokenId, t0, t1, p0, p1);

			// account 1 transfers token to an auction automatically activating it
			await token.safeTransferFrom(accounts[1], auction.address, tokenId, data, {from: accounts[1]});
		}

		// all account1 100 tokens are on the auction, use helper to obtain them
		const packedAuction = await helper.getCountryCollectionByOwner(auction.address, token.address, accounts[1]);

		// pack auction data, prices are in Gwei
		const auctionData = pack(t0, t1, p0 / 1000000000, p1 / 1000000000, p0 / 1000000000);

		// append additional auction specific data to original collection
		for(let i = 0; i < packedOriginal.length; i++) {
			packedOriginal[i] = packedOriginal[i].times(two.pow(184)).plus(auctionData);
		}

		// sort both arrays to compare
		packedOriginal.sort();
		packedAuction.sort();

		// compare both arrays
		assert.deepEqual(packedAuction, packedOriginal, "original and auction arrays differ");
	});
});

// packs tokenId, t0, t1, p0 and p1 into abi-compliant structure
function abiPack(tokenId, t0, t1, p0, p1) {
	const two = web3.toBigNumber(2);
	return toBytes(two.pow(224).times(tokenId)
		.plus(two.pow(192).times(t0))
		.plus(two.pow(160).times(t1))
		.plus(two.pow(80).times(p0))
		.plus(p1));
}

// packs t0, t1, p0, p1 and p into abi-compliant structure
function pack(t0, t1, p0, p1, p) {
	const two = web3.toBigNumber(2);
	return two.pow(152).times(t0)
		.plus(two.pow(120).times(t1))
		.plus(two.pow(80).times(p0))
		.plus(two.pow(40).times(p1))
		.plus(p);
}

// converts BigNumber representing Solidity uint256 into String representing Solidity bytes
function toBytes(uint256) {
	let s = uint256.toString(16);
	const len = s.length;
	// 256 bits must occupy exactly 64 hex digits
	if(len > 64) {
		s = s.substr(0, 64);
	}
	for(let i = 0; i < 64 - len; i++) {
		s = "0" + s;
	}
	return "0x" + s;
}

