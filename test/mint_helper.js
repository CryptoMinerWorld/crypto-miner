// token adn helper
const Token = artifacts.require("./GemERC721.sol");
const MintHelper = artifacts.require("./MintHelper");

// import ERC721Core dependencies
import {ROLE_TOKEN_CREATOR} from "./erc721_core";

// additional features and roles to be used
const ROLE_MINT_OPERATOR = 0x00000001;

// mint helper tests
contract('MintHelper', accounts => {
	it("mint helper: creating some manual token", async () => {
		// create a token instance
		const tk = await Token.new();
		// create mint helper
		const h = await MintHelper.new(tk.address);

		// player account
		const player = accounts[1];

		// grant mint permission
		await tk.updateRole(h.address, ROLE_TOKEN_CREATOR);

		// define a function to mint
		const fn = async(color, level, gradeType, gradeValue) => await h.mintWith(player, color, level, gradeType, gradeValue);

		// mint few tokens
		await fn(1, 1, 1, 1);
		await fn(2, 2, 2, 2);
		await fn(3, 3, 3, 3);

		// check the gems created properly
		assert.equal(player, await tk.ownerOf(0xF201), "token 0xF201 doesn't belong to proper owner");
		assert.equal(player, await tk.ownerOf(0xF202), "token 0xF202 doesn't belong to proper owner");
		assert.equal(player, await tk.ownerOf(0xF203), "token 0xF203 doesn't belong to proper owner");

		// check next and previous gems doesn't exist
		assert(!await tk.exists(0xF200), "token 0xF200 should not exist");
		assert(!await tk.exists(0xF204), "token 0xF204 should not exist");

		// check rare token integrity
		assert.equal(0x010101000001, await tk.getProperties(0xF201), "token 0xF201 has wrong properties");
		assert.equal(0x020202000002, await tk.getProperties(0xF202), "token 0xF202 has wrong properties");
		assert.equal(0x030303000003, await tk.getProperties(0xF203), "token 0xF203 has wrong properties");

		// ensure it is impossible to mint tokens with wrong properties
		await fn(1, 1, 1, 1); // just check that OK params are really OK
		await assertThrows(fn, 0, 1, 1, 1);
		await assertThrows(fn, 13, 1, 1, 1);
		await assertThrows(fn, 1, 0, 1, 1);
		await assertThrows(fn, 1, 6, 1, 1);
		await assertThrows(fn, 1, 1, 0, 1);
		await assertThrows(fn, 1, 1, 7, 1);
		await assertThrows(fn, 1, 1, 1, 1000000);
	});
	it("mint helper: permissions check", async () => {
		// create a token instance
		const tk = await Token.new();
		// create mint helper
		const h = await MintHelper.new(tk.address);

		// player account
		const player = accounts[5];

		// mint a token functions
		const fn0 = async () => await h.mintWith(player, 1, 1, 1, 1, {from: accounts[0]});
		const fn1 = async () => await h.mintWith(player, 1, 1, 1, 1, {from: accounts[1]});

		// 1 try to mint without contract grant permission - should fail
		await assertThrows(fn0);
		await assertThrows(fn1);

		// grant mint permission
		await tk.updateRole(h.address, ROLE_TOKEN_CREATOR);

		// now fn0 should succeed while fn1 still fails - account[1] doesn't have permission on the helper
		await fn0();
		await assertThrows(fn1);

		// grant the permission to account[1] on the helper
		await h.updateRole(accounts[1], ROLE_MINT_OPERATOR);

		// both fn0 and fn1 should succeed now
		await fn0();
		await fn1();
	});
});


// import auxiliary function to ensure function `fn` throws
import {assertThrows} from "../scripts/shared_functions";
