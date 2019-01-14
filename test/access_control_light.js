// Role ROLE_ROLE_MANAGER allows modifying operator roles
const ROLE_ROLE_MANAGER = 0x10000000;

// Role ROLE_FEATURE_MANAGER allows modifying global features
const ROLE_FEATURE_MANAGER = 0x20000000;

// Bitmask representing all the possible permissions (super admin role)
const ALL_PERM = web3.toBigNumber("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

// Bitmask representing no permissions enabled
const NO_PERM = web3.toBigNumber(0);

// Bitmask representing some arbitrary permission
const SOME_PERM = web3.toBigNumber(1);

// AccessControl smart contract stands for ACL – Access Control List
const ACL = artifacts.require("./AccessControlLight.sol");

contract('ACL (Light)', (accounts) => {
	it("initial state: no features are enabled, only creator has full permissions", async() => {
		const ac = await ACL.new();
		assert(ALL_PERM.eq(await ac.userRoles(accounts[0])), "creator doesn't have full permissions");
		assert(NO_PERM.eq(await ac.userRoles(accounts[1])), "arbitrary account has some permissions");
		assert(NO_PERM.eq(await ac.features()), "some features are enabled initially");
	});

	it("updating features: add, remove, require feature manager", async() => {
		const ac = await ACL.new();

		// operator to perform request on behalf of
		const operator = accounts[1];

		// define functions to update features on behalf of operator
		const addFeature1 = async() => await ac.updateFeatures(SOME_PERM, {from: operator});
		const removeFeature1 = async() => await ac.updateFeatures(NO_PERM, {from: operator});

		// operator must have a permission to update features
		await assertThrowsAsync(addFeature1);
		await assertThrowsAsync(removeFeature1);

		// give operator permission to update features
		await ac.updateRole(operator, ROLE_FEATURE_MANAGER | SOME_PERM);

		// now operator can update this feature
		await addFeature1();

		// verify feature was added correctly
		assert(SOME_PERM.eq(await ac.features()), "no feature present after adding it");
		// alternative way to check the same
		assert(await ac.isFeatureEnabled(SOME_PERM), "no feature present after adding it (alt)");

		// remove that feature
		await removeFeature1();

		// verify feature was removed correctly
		assert(NO_PERM.eq(await ac.features()), "feature still present after removing it");
		// alternative way to check the same
		assert(!await ac.isFeatureEnabled(SOME_PERM), "feature still present after removing it (alt)");
	});

	it("updating features: complex scenario", async() => {
		const ac = await ACL.new();

		// operator to perform request on behalf of
		const operator = accounts[1];

		// define some exotic sets of permissions
		const permissions1 = 478236348;
		const permissions2 = 391958666;

		// grant some exotic permission set to an operator
		await ac.updateRole(operator, ROLE_FEATURE_MANAGER | permissions1);

		// operator updates contract features with some other set of permissions
		await ac.updateFeatures(permissions2, {from: operator});

		// calculate expected set of features on the contract
		const expected = permissions1 & permissions2;

		// verify the contract features set
		assert.equal(expected, await ac.features(), "invalid set of features after update");
		// alternative way to check the same
		assert(await ac.isFeatureEnabled(expected), "invalid set of features after update (alt)");
	});

	it("updating an operator: add, remove role, require role manager", async() => {
		const ac = await ACL.new();

		// operator to perform request on behalf of
		const operator = accounts[1];

		// an account to update role for
		const account = accounts[2];

		// define functions to update roles on behalf of account 1
		const addRole1 = async() => await ac.updateRole(account, SOME_PERM, {from: operator});
		const removeRole1 = async() => await ac.updateRole(account, NO_PERM, {from: operator});

		// operator must have a permission to update roles
		await assertThrowsAsync(addRole1);
		await assertThrowsAsync(removeRole1);

		// give operator permission to update some roles
		await ac.updateRole(operator, ROLE_ROLE_MANAGER | SOME_PERM);

		// now operator can update this role
		await addRole1();

		// verify role was added correctly
		assert(SOME_PERM.eq(await ac.userRoles(account)), "no permission present after adding it");
		// alternative way to check the same
		assert(await ac.isOperatorInRole(account, SOME_PERM), "no permission present after adding it (alt)");

		// remove that role
		await removeRole1();

		// verify role was removed correctly
		assert(NO_PERM.eq(await ac.userRoles(account)), "permission still present after removing it");
		// alternative way to check the same
		assert(!await ac.isOperatorInRole(account, SOME_PERM), "permission still present after removing it (alt)");
	});

	it("updating an operator: complex scenario", async() => {
		const ac = await ACL.new();

		// operator to perform request on behalf of
		const operator = accounts[1];

		// an account to update role for
		const account = accounts[2];

		// define some exotic sets of permissions
		const permissions1 = 218123981;
		const permissions2 = 192840290;

		// grant some exotic permission set to an operator
		await ac.updateRole(operator, ROLE_ROLE_MANAGER | permissions1);

		// operator updates another account permissions with some other set
		await ac.updateRole(account, permissions2, {from: operator});

		// calculate expected set of permissions for updated account
		const expected = permissions1 & permissions2;

		// verify the account permissions set (role)
		assert.equal(expected, await ac.userRoles(account), "invalid set of permissions (role) after update");
		// alternative way to check the same
		assert(await ac.isOperatorInRole(account, expected), "invalid set of permissions (role) after update (alt)");
	});

	it("updating an operator: destroying an operator", async() => {
		const ac = await ACL.new();

		// operator to perform request on behalf of
		// account 0 is already an operator, the only one
		const operator = accounts[0];

		// remove any permission - destroy an operator
		await ac.updateRole(operator, 0);

		// verify the result
		assert.equal(0, await ac.userRoles(operator), "operator still exists");
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
