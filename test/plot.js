// Based on PlotERC721 smart contract
const Token = artifacts.require("./PlotERC721.sol");

// import ERC721Core dependencies
import {
	ERC721Receiver,
	InterfaceId_ERC165,
	InterfaceId_ERC721,
	InterfaceId_ERC721Exists,
	InterfaceId_ERC721Enumerable,
	InterfaceId_ERC721Metadata,
	FEATURE_TRANSFERS,
	FEATURE_TRANSFERS_ON_BEHALF,
	ROLE_TOKEN_CREATOR,
	ROLE_STATE_PROVIDER,
	ROLE_TRANSFER_LOCK_PROVIDER
} from "./erc721_core";

// PlotERC721 specific Features and Roles:
// Allows modifying token's offset
import {ROLE_OFFSET_PROVIDER} from "./erc721_core";

// default depth of the land plot
const DEPTH = 100;

// some token to work with
const token0 = 1; // first land plot in Antarctica
const token1 = 65537; // first land plot in Russia
const layers0 = [
	2,
	0,
	35 + (Math.floor(Math.random() * 11) - 5),
	DEPTH,
	DEPTH,
	DEPTH,
	DEPTH,
	0
];
const layers1 = [
	5,
	0,
	35 + (Math.floor(Math.random() * 11) - 5),
	65 + (Math.floor(Math.random() * 11) - 5),
	85 + (Math.floor(Math.random() * 9) - 4),
	95 + (Math.floor(Math.random() * 7) - 3),
	DEPTH,
	0
];
const tiers0 = tiers(layers0);
const tiers1 = tiers(layers1);

// timestamp right before the test begins
const now = new Date().getTime() / 1000 | 0;

// tests for Plot ERC721 token
contract('PlotERC721', (accounts) => {

	it("initial state: initial zero values, supported interfaces", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// some account to work with
		const account1 = accounts[1];

		// verify supported interfaces
		assert(await tk.supportsInterface(InterfaceId_ERC165), "InterfaceId_ERC165 not found");
		//assert(await tk.supportsInterface(InterfaceId_ERC721), "InterfaceId_ERC721 not found");
		assert(await tk.supportsInterface(InterfaceId_ERC721Exists), "InterfaceId_ERC721Exists not found");
		assert(await tk.supportsInterface(InterfaceId_ERC721Enumerable), "InterfaceId_ERC721Enumerable not found");
		assert(await tk.supportsInterface(InterfaceId_ERC721Metadata), "InterfaceId_ERC721Metadata not found");

		// verify zero values
		assert.equal(0, (await tk.getPackedCollection(account1)).length, "non-empty initial packed collection for account1");
		assert.equal(0, (await tk.getCollection(account1)).length, "non-empty initial token collection for account1");
		assert.equal(0, await tk.totalSupply(), "non-zero initial token total supply");
		assert.equal(0, await tk.balanceOf(account1), "non-zero initial balance for account1");
		assert.equal(0, await tk.minted(1), "non-zero initial counter for minted tokens");
		assert(!await tk.exists(token1), "token 1 already exists initially");

		// create one token
		await tk.mint(account1, 1, tiers1);

		// verify same values to be equal one
		assert.equal(1, (await tk.getAllTokens()).length, "empty all tokens collection");
		assert.equal(1, (await tk.getPackedCollection(account1)).length, "empty packed collection for account1");
		assert.equal(1, (await tk.getCollection(account1)).length, "empty token collection for account1");
		assert.equal(1, await tk.totalSupply(), "zero token total supply");
		assert.equal(1, await tk.balanceOf(account1), "zero balance for account1");
		assert.equal(1, await tk.minted(1), "zero counter for minted tokens");
		assert(await tk.exists(token1), "token doesn't exist after minting");

		// balance of zero address fails
		await assertThrows(tk.balanceOf, 0);
	});

	it("initial state: throwable functions", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// some account to work with
		const account1 = accounts[1];

		// define function that throw initially
		const getPacked = async() => await tk.getPacked(token1);
		const getTiers = async() => await tk.getTiers(token1);
		const getNumberOfTiers = async() => await tk.getNumberOfTiers(token1);
		const getTierDepth = async() => await tk.getTierDepth(token1, 4);
		const getDepth = async() => await tk.getDepth(token1);
		const getOffsetModified = async() => await tk.getOffsetModified(token1);
		const getOffset = async() => await tk.getOffset(token1);
		const isFullyMined = async() => await tk.isFullyMined(token1);
		const getStateModified = async() => await tk.getStateModified(token1);
		const getState = async() => await tk.getState(token1);
		const isTransferable = async() => await tk.isTransferable(token1);
		const getCreationTime = async() => await tk.getCreationTime(token1);
		const getOwnershipModified = async() => await tk.getOwnershipModified(token1);
		const tokenByIndex = async() => await tk.tokenByIndex(0);
		const tokenOfOwnerByIndex = async() => await tk.tokenOfOwnerByIndex(account1, 0);
		const ownerOf = async() => await tk.ownerOf(token1);
		const getApproved = async() => await tk.getApproved(token1);
		const tokenURI = async() => await tk.tokenURI(token1);

		// check all these functions throw
		await assertThrows(getPacked);
		await assertThrows(getTiers);
		await assertThrows(getNumberOfTiers);
		await assertThrows(getTierDepth);
		await assertThrows(getDepth);
		await assertThrows(getOffsetModified);
		await assertThrows(getOffset);
		await assertThrows(isFullyMined);
		await assertThrows(getStateModified);
		await assertThrows(getState);
		await assertThrows(isTransferable);
		await assertThrows(getCreationTime);
		await assertThrows(getOwnershipModified);
		await assertThrows(tokenByIndex);
		await assertThrows(tokenOfOwnerByIndex);
		await assertThrows(ownerOf);
		await assertThrows(getApproved);
		await assertThrows(tokenURI);

		// create one token
		await tk.mint(account1, 1, tiers1);

		// now the functions which throw should not throw anymore
		await getPacked();
		await getTiers();
		await getNumberOfTiers();
		await getTierDepth();
		await getDepth();
		await getOffsetModified();
		await getOffset();
		await isFullyMined();
		await getStateModified();
		await getState();
		await isTransferable();
		await getCreationTime();
		await getOwnershipModified();
		await tokenByIndex();
		await tokenOfOwnerByIndex();
		await ownerOf();
		await getApproved();
		await tokenURI();
	});

	it("integrity: verify minted token data integrity", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// some account to work with
		const account1 = accounts[1];

		// create two tokens
		await tk.mint(account1, 0, tiers0);
		await tk.mint(account1, 1, tiers1);

		// verify simple (non-packed) getters
		assert(tiers0.eq(await tk.getTiers(token0)), "token0 has wrong tiers struct");
		assert(tiers1.eq(await tk.getTiers(token1)), "token1 has wrong tiers struct");
		assert.equal(2, await tk.getNumberOfTiers(token0), "token0 has wrong number of tiers");
		assert.equal(DEPTH, await tk.getDepth(token0), "token0 has wrong depth");
		assert.equal(DEPTH, await tk.getDepth(token1), "token1 has wrong depth");
		assert.equal(0, await tk.getTierDepth(token0, 0), "token0 has wrong tier0 depth");
		assert.equal(0, await tk.getTierDepth(token1, 0), "token1 has wrong tier0 depth");
		assert.equal(1, await tk.getTierIndex(token0, 0), "token0 has wrong tier index 1");
		assert.equal(0, await tk.getOffsetModified(token0), "token0 has non-zero offsetModified");
		assert.equal(0, await tk.getOffset(token0), "token0 has wrong offset");
		assert(!await tk.isFullyMined(token0), "token0 is fully mined");
		assert.equal(0, await tk.getStateModified(token0), "token0 has non-zero stateModified");
		assert.equal(0, await tk.getState(token0), "token0 has wrong state");
		assert(await tk.isTransferable(token0), "token0 is not transferable");
		assert(await tk.getCreationTime(token0) > now, "wrong token0 creation date");
		assert.equal(0, await tk.getOwnershipModified(token0), "token0 has non-zero ownershipModified");
		assert.equal(token0, await tk.tokenByIndex(0), "wrong token ID at index 0");
		assert.equal(token0, await tk.tokenOfOwnerByIndex(account1, 0), "wrong token ID at index 0 owned by account1");
		assert.equal(account1, await tk.ownerOf(token0), "wrong owner of token0");
		assert.equal(0, await tk.getApproved(token0), "token0 should not be approved yet");
		assert.equal("http://cryptominerworld.com/plot/" + token1, await tk.tokenURI(token1), "wrong token1 URI");

		// validate tiers structure
		for(let i = 1; i <= 5; i++) {
			// measure tier depths
			assert.equal(layers0[i + 1], await tk.getTierDepth(token0, i), `token0 has wrong tier${i} depth`);
			assert.equal(layers1[i + 1], await tk.getTierDepth(token1, i), `token1 has wrong tier${i} depth`);

			// validate calculated tier index
			assert.equal(Math.min(i, 2), await tk.getTierIndex(token0, layers0[i]), "token0 has wrong tier index " + i);
			assert.equal(Math.min(i, 5), await tk.getTierIndex(token1, layers1[i]), "token1 has wrong tier index " + i);
		}

		// validate getTierDepth/getTierIndex compatibility
		// for each possible offset `i`
		for(let i = 0; i < DEPTH + 1; i++) {
			// determine what tier it is
			const index0 = (await tk.getTierIndex(token0, i)).toNumber();
			const index1 = (await tk.getTierIndex(token1, i)).toNumber();

			// determine what depth it has
			const depth0 = (await tk.getTierDepth(token0, index0)).toNumber();
			const depth1 = (await tk.getTierDepth(token1, index1)).toNumber();

			// ensure tier index for the determined depth match
			assert.equal(Math.min(index0 + 1, 2), await tk.getTierIndex(token0, depth0), "tier index/depth mismatch for token0, offset " + i);
			assert.equal(Math.min(index1 + 1, 5), await tk.getTierIndex(token1, depth1), "tier index/depth mismatch for token1, offset " + i);
		}

		// complex and packed getters
		assertArraysEqual([toBN(token0), toBN(token1)], await tk.getAllTokens(), "wrong all tokens collection");
		assertArraysEqual([toBN(token0), toBN(token1)], await tk.getCollection(account1), "wrong token collection for account1");

		// calculate token0 and token1 packed structures
		const packed0 = tiers0.shln(8).shln(24).or(toBN(token0));
		const packed1 = tiers1.shln(8).shln(24).or(toBN(token1));
		// calculate token1 extended packed structure
		const fullPacked1 = [
			tiers1.shln(32).shln(128).shln(32),
			(await tk.getCreationTime(token1)).shln(32).or(toBN(1)).shln(32).shln(160).or(toBN(account1))
		];

		// check calculated getters
		assertArraysEqual([packed0, packed1], await tk.getPackedCollection(account1), "account1 has wrong packed collection");
		assertArraysEqual(fullPacked1, await tk.getPacked(token1), "token1 has wrong packed data");
	});

	it("unsafe transfer: transferring a token", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];

		// define transfer token functions
		const transfer1 = async() => await tk.transfer(account2, token1, {from: account1});
		const transfer2 = async() => await tk.transfer(account3, token1, {from: account2});

		// initially transfer fails (no token minted)
		await assertThrows(transfer1);
		await assertThrows(transfer2);

		// create one token
		await tk.mint(account1, 1, tiers1);

		// wrong inputs check
		await assertThrows(tk.transfer, 0, token1, {from: account1});
		await assertThrows(tk.transfer, account1, token1, {from: account1});

		// transferring someone's else token throws
		await assertThrows(transfer2);
		// once token is minted it can be transferred by its owner
		await transfer1();
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// disable transfers
		await tk.updateFeatures(0);
		// ensure transfer will fail now
		await assertThrows(transfer2);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// transfer token to account3
		await transfer2();
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");
	});

	it("unsafe transfer: transferring own token using transferFrom", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];

		// define transfer token functions
		const transfer1 = async() => await tk.transferFrom(account1, account2, token1, {from: account1});
		const transfer2 = async() => await tk.transferFrom(account2, account3, token1, {from: account2});

		// initially transfer fails (no token minted)
		await assertThrows(transfer1);
		await assertThrows(transfer2);

		// create one token
		await tk.mint(account1, 1, tiers1);

		// transferring someone's else token throws
		await assertThrows(transfer2);
		// once token is minted it can be transferred by its owner
		await transfer1();
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// disable transfers, leaving transfers on behalf enabled
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		// ensure transfer will fail now
		await assertThrows(transfer2);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// transfer token to account3
		await transfer2();
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");
	});

	it("safe transfer: transferring a token", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();
		// another instance will be used to verify ERC721 Receiver requirement
		const blackHole = await Token.new();
		// ERC721 valid receiver
		const erc721Rc = (await ERC721Receiver.new()).address;

		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];

		// define transfer token functions
		const transfer1 = async() => await tk.safeTransferFrom(account1, account2, token1, {from: account1});
		const transfer2 = async() => await tk.safeTransferFrom(account2, account3, token1, {from: account2});
		const transfer3 = async() => await tk.safeTransferFrom(account3, erc721Rc, token1, {from: account3});
		const unsafeTransfer1 = async() => await tk.safeTransferFrom(account1, blackHole, token1, {from: account1});
		const unsafeTransfer2 = async() => await tk.safeTransferFrom(account2, blackHole, token1, {from: account2});

		// initially transfer fails (no token minted)
		await assertThrows(transfer1);
		await assertThrows(transfer2);

		// create one token
		await tk.mint(account1, 1, tiers1);

		// transferring someone's else token throws
		await assertThrows(transfer2);
		// unsafe transfer will always fail
		await assertThrows(unsafeTransfer1);
		// token can be transferred safely by its owner
		await transfer1();
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// disable transfers, leaving transfers on behalf enabled
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		// ensure transfer will fail now
		await assertThrows(transfer2);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// unsafe transfer will always fail
		await assertThrows(unsafeTransfer2);
		// transfer token to account3
		await transfer2();
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");

		// now transfer token to the smart contract supporting ERC721
		await transfer3();
		// verify token ownership
		assert.equal(erc721Rc, await tk.ownerOf(token1), "wrong token1 owner after transfer3");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer3");
	});

	it("approvals: grant and revoke token approval", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const operator = accounts[4]; // approved operator

		// approve functions
		const approve1 = async() => await tk.approve(operator, token1, {from: account1});
		const approve2 = async() => await tk.approve(operator, token1, {from: account2});
		const revoke1 = async() => await tk.revokeApproval(token1, {from: account1});
		const revoke2 = async() => await tk.revokeApproval(token1, {from: account2});

		// impossible to approve non-existent token
		await assertThrows(approve1);

		// create a token
		await tk.mint(account1, 1, tiers1);

		// wrong inputs check
		await assertThrows(tk.approve, 0, token1, {from: account1});
		await assertThrows(tk.approve, account1, token1, {from: account1});

		// impossible to approve token which belongs to someone else
		await assertThrows(approve2);
		// impossible to revoke a non-existent approval
		await assertThrows(revoke1);
		// approve own token
		await approve1();
		// verify approval state
		assert.equal(operator, await tk.getApproved(token1), "token1 is not approved");

		// impossible to revoke approval on the token which belongs to someone else
		await assertThrows(revoke2);
		// revoke an approval
		await revoke1();
		// verify approval state
		assert.equal(0, await tk.getApproved(token1), "token1 is still approved");

		// approve own token again
		await approve1();
		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// transfer it to account2
		await tk.transfer(account2, token1, {from: account1});
		// ensure an approval is erased
		assert.equal(0, await tk.getApproved(token1), "token1 is approval is not erased");

		// impossible to approve token which belongs to someone else
		await assertThrows(approve1);
		// impossible to revoke a non-existent approval
		await assertThrows(revoke2);
		// approve the token
		await approve2();
		// verify approval state
		assert.equal(operator, await tk.getApproved(token1), "token1 is not approved (2)");

		// impossible to revoke approval on the token which belongs to someone else
		await assertThrows(revoke1);
		// revoke an approval
		await revoke2();
		// verify approval state
		assert.equal(0, await tk.getApproved(token1), "token1 is still approved (2)");
	});

	it("approvals: add and remove operator", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// some accounts to work with
		const account1 = accounts[1];
		const operator = accounts[4]; // approved operator

		// wrong inputs check
		await assertThrows(tk.setApprovalForAll, 0, true, {from: account1});
		await assertThrows(tk.setApprovalForAll, account1, true, {from: account1});

		// approve an operator for account 1
		await tk.setApprovalForAll(operator, true, {from: account1});
		// verify operator state
		assert(await tk.isApprovedForAll(account1, operator), "operator is not approved to act on behalf of account1");

		// revoke an approval
		await tk.setApprovalForAll(operator, false, {from: account1});
		// verify approval state
		assert(!await tk.isApprovedForAll(account1, operator), "operator is still approved to act on behalf of account1");
	});

	it("approvals: operator in action", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// enable transfers on behalf
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];
		const operator = accounts[4]; // approved operator
		const intruder = accounts[5]; // someone who pretends to be an operator

		// create a token
		await tk.mint(account1, 1, tiers1);

		// approve an operator for account 1
		await tk.setApprovalForAll(operator, true, {from: account1});

		// define some functions to perform transfer on behalf
		const transfer1 = async(account) => await tk.transferFrom(account1, account2, token1, {from: account});
		const transfer2 = async(account) => await tk.transferFrom(account2, account3, token1, {from: account});

		// intruder cannot perform transfer on behalf
		await assertThrows(transfer1, intruder);
		// nor intruder neither operator cannot transfer token
		// which doesn't belong to an owner specified
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// operator can make a transfer
		await transfer1(operator);
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// account 2 didn't get any approval to an operator
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);

		// approve an operator for account 2
		await tk.setApprovalForAll(operator, true, {from: account2});

		// intruder cannot perform the transfer
		await assertThrows(transfer1, intruder);
		// and operator can
		await transfer2(operator);
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");
	});

	it("transfer on behalf: transferring a token", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// enable transfers on behalf
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];
		const operator = accounts[4]; // approved operator
		const intruder = accounts[5]; // someone who pretends to be an operator

		// create a token
		await tk.mint(account1, 1, tiers1);

		// define approval functions
		const approve1 = async(account) => await tk.approve(account, token1, {from: account1});
		const approve2 = async(account) => await tk.approve(account, token1, {from: account2});

		// approve transfer on behalf
		await approve1(operator);

		// define some functions to perform transfer on behalf
		const transfer1 = async(account) => await tk.transferFrom(account1, account2, token1, {from: account});
		const transfer2 = async(account) => await tk.transferFrom(account2, account3, token1, {from: account});

		// intruder cannot perform transfer on behalf
		await assertThrows(transfer1, intruder);
		// nor intruder neither operator cannot transfer token
		// which doesn't belong to an owner specified
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// operator can make a transfer
		await transfer1(operator);
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// approval is erased after the transfer, transfer on behalf is impossible
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);

		// first token owner cannot approve transfers anymore
		await assertThrows(approve1, intruder);
		// but token owner can
		await approve2(operator);
		// disable transfers on behalf, leaving transfers enabled
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// ensure transfer will fail now
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		// intruder cannot perform the transfer
		await assertThrows(transfer1, intruder);
		// and operator can
		await transfer2(operator);
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");
	});

	it("safe transfer on behalf: transferring a token", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();
		// another instance will be used to verify ERC721 Receiver requirement
		const blackHole = await Token.new();
		// ERC721 valid receiver
		const erc721Rc = (await ERC721Receiver.new()).address;

		// enable transfers on behalf
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];
		const account3 = accounts[3];
		const operator = accounts[4]; // approved operator
		const intruder = accounts[5]; // someone who pretends to be an operator

		// create a token
		await tk.mint(account1, 1, tiers1);

		// define approval function
		const approve = async(owner, operator) => await tk.approve(operator, token1, {from: owner});

		// approve transfer on behalf
		await approve(account1, operator);

		// define some functions to perform transfer on behalf
		const transfer1 = async(account) => await tk.safeTransferFrom(account1, account2, token1, {from: account});
		const transfer2 = async(account) => await tk.safeTransferFrom(account2, account3, token1, {from: account});
		const transfer3 = async(account) => await tk.safeTransferFrom(account3, erc721Rc, token1, {from: account});
		const unsafeTransfer1 = async(account) => await tk.safeTransferFrom(account1, blackHole, token1, {from: account});
		const unsafeTransfer2 = async(account) => await tk.safeTransferFrom(account2, blackHole, token1, {from: account});

		// unsafe transfer will always fail
		await assertThrows(unsafeTransfer1, operator);
		// intruder cannot perform transfer on behalf
		await assertThrows(transfer1, intruder);
		// nor intruder neither operator cannot transfer token
		// which doesn't belong to an owner specified
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// operator can make a transfer
		await transfer1(operator);
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");

		// operator is erased after the transfer, transfer on behalf is impossible
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);

		// first token owner cannot approve transfers anymore
		await assertThrows(approve, account1, intruder);
		// but token owner can
		await approve(account2, operator);
		// disable transfers on behalf, leaving transfers enabled
		await tk.updateFeatures(FEATURE_TRANSFERS);
		// ensure transfer will fail now
		await assertThrows(transfer2, intruder);
		await assertThrows(transfer2, operator);
		// enable transfers back
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);
		// unsafe transfer will always fail
		await assertThrows(unsafeTransfer2, operator);
		// intruder cannot perform the transfer
		await assertThrows(transfer1, intruder);
		// and operator can
		await transfer2(operator);
		// verify token ownership
		assert.equal(account3, await tk.ownerOf(token1), "wrong token1 owner after transfer2");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer2");

		// approve operator again
		await approve(account3, operator);
		// and transfer token to the smart contract supporting ERC721
		await transfer3(operator);
		// verify token ownership
		assert.equal(erc721Rc, await tk.ownerOf(token1), "wrong token1 owner after transfer3");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer3");
	});

	it("security: minting a token requires ROLE_TOKEN_CREATOR role", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// define a function to check
		const fn = async() => await tk.mint(account1, 1, tiers1, {from: account1});

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_TOKEN_CREATOR);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("security: mining token to requires ROLE_OFFSET_PROVIDER role", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// mint some token
		await tk.mint(account1, 1, tiers1);

		// define a function to check
		const fn = async() => await tk.mineTo(token1, 1, {from: account1});

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_OFFSET_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("security: mining token by style requires ROLE_OFFSET_PROVIDER role", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// mint some token
		await tk.mint(account1, 1, tiers1);

		// define a function to check
		const fn = async() => await tk.mineBy(token1, 1, {from: account1});

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_OFFSET_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("security: changing token state requires ROLE_STATE_PROVIDER role", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// mint some token
		await tk.mint(account1, 1, tiers1);

		// define a function to check
		const fn = async() => await tk.setState(token1, 1, {from: account1});

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_STATE_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();
	});
	it("security: modifying transfer lock requires ROLE_TRANSFER_LOCK_PROVIDER role", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// non-admin account to act on behalf of
		const account1 = accounts[1];

		// transfer lock value to set
		const lock = Math.floor(Math.random() * 4294967296);

		// define a function to check
		const fn = async() => await tk.setTransferLock(lock, {from: account1});

		// ensure function fails if account has no role required
		await assertThrows(fn);

		// give a permission required to the account
		await tk.updateRole(account1, ROLE_TRANSFER_LOCK_PROVIDER);

		// verify that given the permissions required function doesn't fail
		await fn();

		// verify transfer lock was set correctly
		assert.equal(lock, await tk.transferLock(), "incorrect value for transfer lock");
	});

	it("minting: mint() constraints", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// some valid address
		const account1 = accounts[1];

		// wrong input parameters fail
		await assertThrows(tk.mint, tk.address, 1, tiers1);
		await assertThrows(tk.mint, 0, 1, tiers1);
		for(let i = 0; i < 5; i++) {
			await assertThrows(tk.mint, account1, 1, tiers([i, 0, 35, 65, 85, 95, DEPTH, 0]));
		}
		//await assertThrows(tk.mint, account1, 1, tiers([5, 1, 35, 65, 85, 95, DEPTH, 0]));
		//await assertThrows(tk.mint, account1, 1, tiers([5, 0, 35, 65, 85, 95, DEPTH, 1]));
		//await assertThrows(tk.mint, account1, 1, tiers([5, 0, 35, 35, 85, 95, DEPTH, 0]));
		//await assertThrows(tk.mint, account1, 1, tiers([2, 1, 35, DEPTH, DEPTH, DEPTH, DEPTH, 0]));
		//await assertThrows(tk.mint, account1, 1, tiers([2, 0, 35, DEPTH, DEPTH, DEPTH, DEPTH, 1]));
		await assertThrows(tk.mint, account1, 1, tiers([2, 0, 35, DEPTH, DEPTH, DEPTH, DEPTH - 1, 0]));
		await assertThrows(tk.mint, account1, 1, tiers([2, 0, 35, DEPTH, DEPTH, DEPTH - 1, DEPTH, 0]));
		await assertThrows(tk.mint, account1, 1, tiers([2, 0, 35, DEPTH, DEPTH - 1, DEPTH, DEPTH, 0]));
		await assertThrows(tk.mint, account1, 1, tiers([2, 0, 35, DEPTH - 1, DEPTH, DEPTH, DEPTH, 0]));

		// valid inputs
		await tk.mint(account1, 0, tiers0);
		await tk.mint(account1, 1, tiers1);

		// minting in same country is still possible
		await tk.mint(account1, 0, tiers0);
		await tk.mint(account1, 1, tiers1);
		await tk.mint(account1, 1, tiers0);
		await tk.mint(account1, 0, tiers1);
	});

	it("transfer locking: impossible to transfer locked token", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// enable transfers
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// some accounts to work with
		const account1 = accounts[1];
		const account2 = accounts[2];

		// define transfer token functions
		const transfer1 = async() => await tk.transfer(account2, token1, {from: account1});

		// create one token
		await tk.mint(account1, 1, tiers1);

		// set token state to 2
		await tk.setState(token1, 2);

		// set token transfer lock to 2 as well
		await tk.setTransferLock(2);

		// ensure token cannot be transferred
		assert(!await tk.isTransferable(token1), "token1 is still transferable");

		// locked token (state & transferLock != 0) cannot be transferred
		await assertThrows(transfer1);

		// set token transfer lock to 4
		await tk.setTransferLock(4);

		// ensure token can be transferred
		assert(await tk.isTransferable(token1), "token1 is not transferable");
		// once token is unlocked (state & transferLock == 0) it can be transferred
		await transfer1();
		// verify token ownership
		assert.equal(account2, await tk.ownerOf(token1), "wrong token1 owner after transfer1");
		// verify token ownership transfer date
		assert(await tk.getOwnershipModified(token1) > now, "wrong token1 ownershipModified after transfer1");
	});

	it("mining: mine to token and check", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// a function to mine token to some offset
		const mineTo = async() => await tk.mineTo(token1, 1);

		// impossible to mine non-existent token
		await assertThrows(mineTo);

		// create one token
		await tk.mint(accounts[1], 1, tiers1);

		// first time mining to succeeds
		await mineTo();

		// next time mining to fails (offset 1 already reached)
		await assertThrows(mineTo);

		// decreasing token offset is also impossible
		await assertThrows(tk.mineTo, token1, 0);

		// verify new offset
		assert.equal(1, await tk.getOffset(token1), "wrong token1 offset");

		// verify offset modification date
		assert(await tk.getOffsetModified(token1) > now, "wrong token1 offset modification date");
	});
	it("mining: mine by token and check", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// a function to mine token by some depth
		const mineBy = async() => await tk.mineBy(token1, 55);

		// impossible to mine non-existent token
		await assertThrows(mineBy);

		// create one token
		await tk.mint(accounts[1], 1, tiers1);

		// first time mining by succeeds
		await mineBy();

		// next time mining by fails (token is already mined to depth 55 and cannot go to 110)
		await assertThrows(mineBy);

		// mining by zero is also impossible
		await assertThrows(tk.mineBy, token1, 0);

		// verify new offset
		assert.equal(55, await tk.getOffset(token1), "wrong token1 offset");

		// verify offset modification date
		assert(await tk.getOffsetModified(token1) > now, "wrong token1 offset modification date");
	});
	it("mining: all the way to the bottom", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// create two tokens
		await tk.mint(accounts[1], 0, tiers0);
		await tk.mint(accounts[1], 1, tiers1);

		// perform several random mines to reach the very bottom of both tokens
		for(let offset = 0, delta; offset < DEPTH; offset += delta) {
			delta = Math.min(Math.ceil(Math.random() * DEPTH), DEPTH - offset);
			await tk.mineBy(token0, delta);
			await tk.mineTo(token1, offset + delta);
		}

		// ensure mining is not possible anymore
		await assertThrows(tk.mineBy, token0, 1);
		await assertThrows(tk.mineTo, token1, DEPTH);
		await assertThrows(tk.mineTo, token1, DEPTH + 1);

		// verify both tokens are fully mined
		assert(await tk.isFullyMined(token0), "token0 is not fully mined");
		assert(await tk.isFullyMined(token1), "token1 is not fully mined");
		assert.equal(DEPTH, await tk.getOffset(token0), "token0 offset is different from DEPTH");
		assert.equal(DEPTH, await tk.getOffset(token1), "token1 offset is different from DEPTH");
	});

	it("modifying state: modify token state and check", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// some random state value
		const state = Math.floor(Math.random() * 4294967296);

		// a function to set new token state
		const setState = async() => await tk.setState(token1, state);

		// impossible to set state for non-existent token
		await assertThrows(setState);

		// create one token
		await tk.mint(accounts[1], 1, tiers1);

		// first time setting a state succeeds
		await setState();

		// next time setting a state succeeds again - state modification date only
		await setState();

		// verify new state
		assert.equal(state, await tk.getState(token1), "wrong token1 state");

		// verify state modification date
		assert(await tk.getStateModified(token1) > now, "wrong token1 state modification date");
	});

	it("transfer lock: change transfer lock and check", async() => {
		// analogue to smart contract deployment
		const tk = await Token.new();

		// some random transfer lock value
		const lock = Math.floor(Math.random() * 4294967296);

		// a function to set transfer lock
		const setLock = async() => await tk.setTransferLock(lock);

		// first time setting a lock succeeds
		const gasUsed1 = (await setLock()).receipt.gasUsed;

		// next time setting a lock succeeds again,
		// but doesn't modify storage, so the gas consumption is low
		const gasUsed2 = (await setLock()).receipt.gasUsed;

		// verify gas consumption is at least 5,000 lower
		assert(gasUsed1 - gasUsed2 >= 5000, "wrong gas consumption difference");

		// verify new transfer lock
		assert.equal(lock, await tk.transferLock(), "wrong transfer lock");
	});

});

// function to build tiers packed structure from tiers array
function tiers(layers) {
	// verify layers has exactly 8 elements
	assert.equal(8, layers.length, "expected 8 layers elements, got " + layers.length);

	// pack it
	let result = toBN(0);
	for(let i = 0; i < layers.length; i++) {
		result = result.shln(8).or(toBN(layers[i]));
	}

	return result;
}

// import auxiliary functions
import {assertThrows, assertArraysEqual, toBN} from "../scripts/shared_functions";
