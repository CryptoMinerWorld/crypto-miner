const METADATA_OPERATOR = 0x00000001;
const MINT_OPERATOR = 0x00000001;
const ROLE_TOKEN_CREATOR = 0x00040000;

const Token = artifacts.require("./GemERC721.sol");
const Metadata = artifacts.require("./MetadataStorage");
const MintHelper = artifacts.require("./MintHelper");

// some default token ID to work with
const token0x401 = 0x401;

contract('MintHelper', accounts => {
	it("metadata: reserved space", async () => {
		// create a token instance
		const tk = await Token.new();

		// create a storage
		const m = await Metadata.new(tk.address);

		// check default data
		assert.equal("bar", await m.read(0, "foo"), "wrong default value for key 'foo'");

		// try to read illegal data
		await assertThrowsAsync(async () => await m.read(0, "bar"));
		await assertThrowsAsync(async () => await m.read(1, "foo"));

		// write some illegal data
		await assertThrowsAsync(async () => await m.write(0, "foo", "bar"));
		await assertThrowsAsync(async () => await m.write(1, "foo", "bar"));

		// delete some illegal data
		await assertThrowsAsync(async () => await m.del(0, "foo"));
		await assertThrowsAsync(async () => await m.del(1, "foo"));

		// create this token (1)
		await tk.mint(accounts[0], 1, 0, 0, 0, 1, 1, 1, 1);

		// now write some legal data
		await m.write(1, "foo", "bar");

		// check written data
		assert.equal("bar", await m.read(1, "foo"), "wrong written value for key 'foo'");
	});
	it("metadata: read, write, rewrite, delete", async () => {
		// create a token instance and default token
		const tk = await Token.new();
		await tk.mint(accounts[0], token0x401, 0, 0, 0, 1, 1, 1, 1);

		// create a storage
		const m = await Metadata.new(tk.address);

		// ensure its empty
		assert.equal("", await m.read(token0x401, "foo"), "wrong initial value for unset key-value pair");

		// write some data
		await m.write(token0x401, "foo", "bar");

		// check data is written correctly
		assert.equal("bar", await m.read(token0x401, "foo"), "wrong value for key 'foo'");

		// rewrite the data
		await m.write(token0x401, "foo", "baz");

		// check data is rewritten correctly
		assert.equal("baz", await m.read(token0x401, "foo"), "wrong value for key 'foo' after rewriting");

		// delete the data
		await m.del(token0x401, "foo");

		// check the data is removed
		assert.equal("", await m.read(token0x401, "foo"), "wrong data value for deleted key-value pair");
	});
	it("metadata: permissions check", async () => {
		// create a token instance
		const tk = await Token.new();
		// create a metadata storage
		const m = await Metadata.new(tk.address);
		await assertThrowsAsync(async () => await Metadata.new(0));
		await assertThrowsAsync(async () => await Metadata.new(accounts[0]));
		// create mint helper
		const h = await MintHelper.new(tk.address);
		await assertThrowsAsync(async () => await MintHelper.new(0));
		await assertThrowsAsync(async () => await MintHelper.new(accounts[0]));

		// bind metadata functions
		const w0 = async () => await m.write(0xF001, "color", "red", {from: accounts[0]});
		const w1 = async () => await m.write(0xF001, "color", "red", {from: accounts[1]});
		const d0 = async () => await m.del(0xF001, "color", {from: accounts[0]});
		const d1 = async () => await m.del(0xF001, "color", {from: accounts[1]});

		// initially all the function above will fail - no gem exists
		await assertThrowsAsync(w0);
		await assertThrowsAsync(w1);
		await assertThrowsAsync(d0);
		await assertThrowsAsync(d1);

		// grant mint permission
		await tk.addOperator(h.address, ROLE_TOKEN_CREATOR);
		// mint a gem with the helper
		await h.mint(1, 1, 1, 1);

		// w0 and d0 should work now while w1 and d1 still doesn't have a permission
		await w0();
		await d0();
		await assertThrowsAsync(w1);
		await assertThrowsAsync(d1);

		// grant the permission
		await m.addOperator(accounts[1], METADATA_OPERATOR);

		// now all 4 function should work
		await w0();
		await w1();
		await d0();
		await d1();
	});

	it("mint helper: creating some rare tokens with metadata", async () => {
		// create a token instance
		const tk = await Token.new();
		// create a metadata storage
		const m = await Metadata.new(tk.address);
		// create mint helper
		const h = await MintHelper.new(tk.address);

		// grant mint permission
		await tk.addOperator(h.address, ROLE_TOKEN_CREATOR);

		// mint few tokens
		await h.mint(1, 1, 1, 1, {from: accounts[0]});
		await h.mint(2, 2, 2, 2, {from: accounts[0]});
		await h.mint(3, 3, 3, 3, {from: accounts[0]});

		// check the gems created properly
		assert.equal(accounts[0], await tk.ownerOf(0xF001), "token 0xF001 doesn't belong to proper owner");
		assert.equal(accounts[0], await tk.ownerOf(0xF002), "token 0xF002 doesn't belong to proper owner");
		assert.equal(accounts[0], await tk.ownerOf(0xF003), "token 0xF003 doesn't belong to proper owner");

		// check next and previos gems doesn't exist
		assert(!await tk.exists(0xF000), "token 0xF000 should not exist");
		assert(!await tk.exists(0xF004), "token 0xF004 should not exist");

		// check rare token integrity
		assert.equal(0, await tk.getCoordinates(0xF001), "token 0xF001 has wrong coordinates");
		assert.equal(0x010101000001, await tk.getProperties(0xF001), "token 0xF001 has wrong properties");
		assert.equal(0, await tk.getCoordinates(0xF002), "token 0xF002 has wrong coordinates");
		assert.equal(0x020202000002, await tk.getProperties(0xF002), "token 0xF002 has wrong properties");
		assert.equal(0, await tk.getCoordinates(0xF003), "token 0xF003 has wrong coordinates");
		assert.equal(0x030303000003, await tk.getProperties(0xF003), "token 0xF003 has wrong properties");

		// bind some metadata
		await m.write(0xF001, "background-color", "red");
		await m.write(0xF002, "background", "url('https://google.com/logos/doodles/2018/ukraine-independence-day-2018-6620620929368064-law.gif') no-repeat");
		await m.write(0xF003, "background-color", "#F2AB44");

		// check it
		assert.equal("red", await m.read(0xF001, "background-color"), "wrong background-color for token 0xF001");

		// ensure it is impossible to bind metadata for non-existent token
		await assertThrowsAsync(async () => await m.write(0xF000, "background-color", "red"));

		// ensure it is impossible to mint tokens with wrong properties
		await h.mint(1, 1, 1, 1); // just check that OK params are really OK
		await assertThrowsAsync(async () => await h.mint(0, 1, 1, 1));
		await assertThrowsAsync(async () => await h.mint(13, 1, 1, 1));
		await assertThrowsAsync(async () => await h.mint(1, 0, 1, 1));
		await assertThrowsAsync(async () => await h.mint(1, 6, 1, 1));
		await assertThrowsAsync(async () => await h.mint(1, 1, 0, 1));
		await assertThrowsAsync(async () => await h.mint(1, 1, 7, 1));
		await assertThrowsAsync(async () => await h.mint(1, 1, 1, 1000000));
	});
	it("mint helper: permissions check", async () => {
		// create a token instance
		const tk = await Token.new();
		// create mint helper
		const h = await MintHelper.new(tk.address);

		// mint a token functions
		const fn0 = async () => await h.mint(1, 1, 1, 1, {from: accounts[0]});
		const fn1 = async () => await h.mint(1, 1, 1, 1, {from: accounts[1]});

		// 1 try to mint without contract grant permission - should fail
		await assertThrowsAsync(fn0);
		await assertThrowsAsync(fn1);

		// grant mint permission
		await tk.addOperator(h.address, ROLE_TOKEN_CREATOR);

		// now fn0 should succeed while fn1 still fails - account[1] doesn't have permission on the helper
		await fn0();
		await assertThrowsAsync(fn1);

		// grant the permission to account[1] on the helper
		await h.addOperator(accounts[1], MINT_OPERATOR);

		// both fn0 and fn1 should succeed now
		await fn0();
		await fn1();
	});
});

async function assertThrowsAsync(fn) {
	let f = () => {};
	try {
		await fn();
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

