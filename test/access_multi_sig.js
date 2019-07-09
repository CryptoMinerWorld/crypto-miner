// AccessMultiSig smart contract to work with
const ACL = artifacts.require("./AccessMultiSig.sol");

// Feature FEATURE_MSIG_ENABLED disables `updateFeatures` and `updateRole`
const FEATURE_MSIG_ENABLED = toBN("0x8000000000000000000000000000000000000000000000000000000000000000");
// Role ROLE_ACCESS_MANAGER allows modifying operator roles and modifying global features
const ROLE_ACCESS_MANAGER = toBN("0x8000000000000000000000000000000000000000000000000000000000000000");

// zero and one as a BNs
const ZERO = toBN(0);
const ONE = toBN(1);

// Bitmask representing all the possible permissions (super admin role)
const ALL_PERM = toBN("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
// Bitmask representing no permissions enabled
const NO_PERM = ZERO.clone();
// Bitmask representing some arbitrary permission
const SOME_PERM = ONE.clone();

// tests for Access Control smart contract
contract('Access Control MultiSig', (accounts) => {
	it("initial state: no features are enabled, only creator has full permissions", async() => {
		// create ACL not from a default account
		const ac = await ACL.new({from: accounts[1]});

		// verify initial state
		assert(NO_PERM.eq(await ac.userRoles(accounts[0])), "arbitrary account has a role");
		assert(ALL_PERM.eq(await ac.userRoles(accounts[1])), "creator doesn't have full permissions");
		assert(NO_PERM.eq(await ac.features()), "some features are enabled initially");
	});

	it("updating features: updating same twice is fine", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// define update feature function
		const fn = async() => await ac.updateFeatures(SOME_PERM);

		// update same feature twice
		await fn();
		await fn();

		// verify feature is enabled
		assert(await ac.isFeatureEnabled(SOME_PERM), "feature is not enabled");
	});
	it("updating features: two ways to check enabled features are compliant", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// define some random bits to be enabled
		const maskArr = new Array(64 + Math.floor(Math.random() * 32));
		// fill in the mask
		for(let i = 0; i < maskArr.length; i++) {
			maskArr[i] = Math.floor(Math.random() * 256);
		}
		// remove duplicates
		const maskSet = [...new Set(maskArr)];
		// construct the mask now
		const mask = ZERO.clone();
		for(let i = 0; i < maskSet.length; i++) {
			mask.bincn(maskSet[i]);
		}
		const prettyBinary = toPrettyBinary(mask, 256);
		console.log("\t[%o]", prettyBinary.substr(0, 128));
		console.log("\t[%o]", prettyBinary.substr(128));

		// apply mask and verify the mask directly and indirectly
		await ac.updateFeatures(mask);
		assert(mask.eq(await ac.features()), "features mask mismatch");
		assert(await ac.isFeatureEnabled(mask), "features set are not enabled");
		for(let i = 0; i < 256; i++) {
			assert.equal(mask.testn(i), await ac.isFeatureEnabled(ONE.shln(i)), "feature mismatch: " + i);
		}
	});
	it("updating features: add, remove, require feature manager", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// operator to perform request on behalf of
		const operator = accounts[1];

		// define functions to update features by operator
		const addFeature = async() => await ac.updateFeatures(SOME_PERM, {from: operator});
		const removeFeature = async() => await ac.updateFeatures(NO_PERM, {from: operator});

		// operator must have a permission to update features
		await assertThrows(addFeature);
		await assertThrows(removeFeature);

		// give operator permission to update features
		await ac.updateRole(operator, ROLE_ACCESS_MANAGER.or(SOME_PERM));

		// now operator can update this feature
		await addFeature();

		// verify feature was added correctly
		assert(await ac.isFeatureEnabled(SOME_PERM), "no feature present after adding it");

		// remove that feature
		await removeFeature();

		// verify feature was removed correctly
		assert(!await ac.isFeatureEnabled(SOME_PERM), "feature still present after removing it");
	});
	it("updating features: complex scenario", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// operator to perform request on behalf of
		const operator = accounts[1];

		// define some exotic sets of permissions
		const permissions1 = toBN(478236348);
		const permissions2 = toBN(391958666);

		// grant some exotic permission set to an operator
		await ac.updateRole(operator, ROLE_ACCESS_MANAGER.or(permissions1));

		// operator updates contract features with some other set of permissions
		await ac.updateFeatures(permissions2, {from: operator});

		// calculate expected set of features on the contract
		const expected = permissions1.and(permissions2);

		// verify the contract features set
		assert(expected.eq(await ac.features()), "invalid set of features after update");
		// alternative way to check the same
		assert(await ac.isFeatureEnabled(expected), "invalid set of features after update (alt)");
	});

	it("updating role: updating same twice is fine", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// user to set role for
		const user = accounts[1];
		// define update role function
		const fn = async() => await ac.updateRole(user, SOME_PERM);

		// update same feature twice
		await fn();
		await fn();

		// verify role is enabled
		assert(await ac.isUserInRole(user, SOME_PERM), "role is not enabled");
	});
	it("updating role: two ways to check enabled role are compliant", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// user to set role for
		const user = accounts[1];

		// define some random bits to be enabled
		const roleArr = new Array(64 + Math.floor(Math.random() * 32));
		// fill in the role
		for(let i = 0; i < roleArr.length; i++) {
			roleArr[i] = Math.floor(Math.random() * 256);
		}
		// remove duplicates
		const maskSet = [...new Set(roleArr)];
		// construct the role now
		const role = ZERO.clone();
		for(let i = 0; i < maskSet.length; i++) {
			role.bincn(maskSet[i]);
		}
		const prettyBinary = toPrettyBinary(role, 256);
		console.log("\t[%o]", prettyBinary.substr(0, 128));
		console.log("\t[%o]", prettyBinary.substr(128));

		// apply role and verify the role directly and indirectly
		await ac.updateRole(user, role);
		assert(role.eq(await ac.userRoles(user)), "role mismatch");
		assert(await ac.isUserInRole(user, role), "user not in role");
		for(let i = 0; i < 256; i++) {
			assert.equal(role.testn(i), await ac.isUserInRole(user, ONE.shln(i)), "permission mismatch: " + i);
		}
	});
	it("updating role: add, remove role, require role manager", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// operator to perform request on behalf of
		const operator = accounts[1];

		// an account to update role for
		const user = accounts[2];

		// define functions to update roles by operator on account
		const addRole = async() => await ac.updateRole(user, SOME_PERM, {from: operator});
		const removeRole = async() => await ac.updateRole(user, NO_PERM, {from: operator});

		// operator must have a permission to update roles
		await assertThrows(addRole);
		await assertThrows(removeRole);

		// give operator permission to update some roles
		await ac.updateRole(operator, ROLE_ACCESS_MANAGER.or(SOME_PERM));

		// now operator can update this role
		await addRole();

		// verify role was added correctly
		assert(await ac.isUserInRole(user, SOME_PERM), "no permission present after adding it");

		// remove that role
		await removeRole();

		// verify role was removed correctly
		assert(!await ac.isUserInRole(user, SOME_PERM), "permission still present after removing it");
	});
	it("updating role: complex scenario", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// operator to perform request on behalf of
		const operator = accounts[1];

		// an account to update role for
		const user = accounts[2];

		// define some exotic sets of permissions
		const permissions1 = toBN(218123981);
		const permissions2 = toBN(192840290);

		// grant some exotic permission set to an operator
		await ac.updateRole(operator, ROLE_ACCESS_MANAGER.or(permissions1));

		// operator updates another account permissions with some other set
		await ac.updateRole(user, permissions2, {from: operator});

		// calculate expected set of permissions for updated account
		const expected = permissions1.and(permissions2);

		// verify the account permissions set (role)
		assert(await ac.isUserInRole(user, expected), "invalid set of permissions (role) after update");
	});
	it("updating role: destroying the only admin", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// account 0 is the only one super admin
		const admin = accounts[0];

		// remove any permission - destroy an admin
		await ac.updateRole(admin, 0);

		// verify the result
		assert(NO_PERM.eq(await ac.userRoles(admin)), "admin still exists");
	});

	it("m-sig: once MSIG enabled regular calls fail", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// define an operator address
		const operator = accounts[4];

		// define functions to update roles and features
		const disableMsig = async() => await ac.updateFeatures(SOME_PERM);
		const updRole = async() => await ac.updateRole(operator, SOME_PERM);
		const enableMsig = async() => await ac.updateFeatures(FEATURE_MSIG_ENABLED.or(SOME_PERM));

		// requests succeed but only before MSIG is enabled
		await disableMsig();
		await updRole();
		await updRole();
		await disableMsig();
		await enableMsig();
		// after MSIG enabled all non-MultiSig functions fail
		await assertThrows(enableMsig);
		await assertThrows(disableMsig);
		await assertThrows(updRole);

		// verify features and roles set
		assert(FEATURE_MSIG_ENABLED.or(SOME_PERM).eq(await ac.features()), "wrong set of features");
		assert(SOME_PERM.eq(await ac.userRoles(operator)), "wrong set of user permissions");
	});
	it("m-sig: creating a request", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// current time
		const now = Date.now() / 1000 | 0;

		// define function to test
		const fn = async(delta) => await ac.constructUpdateMsigRequest(accounts[1], SOME_PERM, now + delta);

		// constructing a request expiring in the past fail
		await assertThrows(fn, -15);

		// constructing a request expiring in the future succeeds
		await fn(15);
	});
	it("m-sig: sign and perform feature update request (1 signature + sender)", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// define the request signer
		const signer = accounts[1];
		// define the request sender - an account without any special permissions
		const sender = accounts[7];
		// define request expiration date - 15 seconds in the future
		const expiresOn = 15 + Date.now() / 1000 | 0;

		// define functions to construct requests to sign
		const addFeatureRequest = async() => await ac.constructUpdateMsigRequest(ZERO_ADDR, SOME_PERM, expiresOn);
		const removeFeatureRequest = async() => await ac.constructUpdateMsigRequest(ZERO_ADDR, NO_PERM, expiresOn);

		// sign the request by sender itself, extract signature parameters into `ps`
		// self signed transactions always fail in m-sig mode since both signatures are the same
		const s0 = await signAndExtract(await addFeatureRequest(), sender);
		// sign the request and extract signature parameters into `p0`
		const p0 = await signAndExtract(await addFeatureRequest(), signer);
		// sign another request and extract signature parameters into `p1`
		let p1 = await signAndExtract(await removeFeatureRequest(), signer);
		// verify the signatures: uncomment if recoverUpdateMsigRequestEthSign is public
		//assert.equal(signer, await ac.recoverUpdateMsigRequestEthSign(ZERO_ADDR, SOME_PERM, expiresOn, p0.v, p0.r, p0.s), "invalid signature p0");
		//assert.equal(signer, await ac.recoverUpdateMsigRequestEthSign(ZERO_ADDR, NO_PERM, expiresOn, p1.v, p1.r, p1.s), "invalid signature p1");

		// define functions to send the request with a signature
		const selfSigned = async() => await ac.updateMsig(ZERO_ADDR, SOME_PERM, expiresOn, [s0.v], [s0.r], [s0.s], {from: sender});
		const addFeature = async() => await ac.updateMsig(ZERO_ADDR, SOME_PERM, expiresOn, [p0.v], [p0.r], [p0.s], {from: sender});
		const removeFeature = async() => await ac.updateMsig(ZERO_ADDR, NO_PERM, expiresOn, [p1.v], [p1.r], [p1.s], {from: sender});
		const badRemove = async() => await ac.updateMsig(ZERO_ADDR, NO_PERM, expiresOn, [p0.v], [p0.r], [p0.s], {from: sender});

		// initially nor sender neither signer don't have any permissions and all requests fail
		await assertThrows(selfSigned);
		await assertThrows(addFeature);
		await assertThrows(removeFeature);
		await assertThrows(badRemove); // this one contains invalid signature and always fail
		// if we give sender required permissions all request still fail - 2 signatures required
		await ac.updateRole(sender, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		await assertThrows(selfSigned);
		await assertThrows(addFeature);
		await assertThrows(removeFeature);
		await assertThrows(badRemove);
		// now give signer also required permissions
		await ac.updateRole(signer, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		await assertThrows(selfSigned); // self signed request always fail
		await assertThrows(badRemove); // malformed request always fail
		// properly signed request now succeeds
		await addFeature();
		// repeating the request fails since nonce is increased (replay attack)
		await assertThrows(addFeature);
		// sending another request with the same nonce still fails (replay attack)
		await assertThrows(removeFeature);
		// verify feature was enabled successfully
		assert(await ac.isFeatureEnabled(SOME_PERM), "no feature present after adding it");

		// to allow removeFeature to execute we need to regenerate the signature with new nonce
		p1 = await signAndExtract(await removeFeatureRequest(), signer);
		// now removeFeature succeeds
		await removeFeature();
		// verify feature was disabled successfully
		assert(!await ac.isFeatureEnabled(SOME_PERM), "feature still present after removing it");
	});
	it("m-sig: sign and perform role update request (1 signature + sender)", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// define the request signer
		const signer = accounts[1];
		// define an operator address
		const operator = accounts[4];
		// and fake operator address - an address which we will try to use instead operator
		const fakeOperator = accounts[5];
		// define the request sender - an account without any special permissions
		const sender = accounts[7];
		// define request expiration date - 15 seconds in the future
		const expiresOn = 15 + Date.now() / 1000 | 0;

		// define functions to construct requests to sign
		const addRoleRequest = async() => await ac.constructUpdateMsigRequest(operator, SOME_PERM, expiresOn);
		const removeRoleRequest = async() => await ac.constructUpdateMsigRequest(operator, NO_PERM, expiresOn);

		// sign the request by sender itself, extract signature parameters into `ps`
		// self signed transactions always fail in m-sig mode since both signatures are the same
		const s0 = await signAndExtract(await addRoleRequest(), sender);
		// sign the request and extract signature parameters into `p0`
		const p0 = await signAndExtract(await addRoleRequest(), signer);
		// sign another request and extract signature parameters into `p1`
		let p1 = await signAndExtract(await removeRoleRequest(), signer);
		// verify the signatures: uncomment if recoverUpdateMsigRequestEthSign is public
		//assert.equal(signer, await ac.recoverUpdateMsigRequestEthSign(operator, SOME_PERM, expiresOn, p0.v, p0.r, p0.s), "invalid signature p0");
		//assert.equal(signer, await ac.recoverUpdateMsigRequestEthSign(operator, NO_PERM, expiresOn, p1.v, p1.r, p1.s), "invalid signature p1");

		// define functions to send the request with a signature
		const selfSigned = async() => await ac.updateMsig(operator, SOME_PERM, expiresOn, [s0.v], [s0.r], [s0.s], {from: sender});
		const fakeAdd = async() => await ac.updateMsig(fakeOperator, SOME_PERM, expiresOn, [p0.v], [p0.r], [p0.s], {from: sender});
		const addRole = async() => await ac.updateMsig(operator, SOME_PERM, expiresOn, [p0.v], [p0.r], [p0.s], {from: sender});
		const removeRole = async() => await ac.updateMsig(operator, NO_PERM, expiresOn, [p1.v], [p1.r], [p1.s], {from: sender});

		// initially nor sender neither signer don't have any permissions and all requests fail
		await assertThrows(selfSigned); // self signed requests always fail
		await assertThrows(fakeAdd); // this one contains invalid signature and always fail
		await assertThrows(addRole);
		await assertThrows(removeRole);
		// if we give sender required permissions all request still fail - 2 signatures required
		await ac.updateRole(sender, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		await assertThrows(selfSigned); // self signed requests always fail
		await assertThrows(fakeAdd);
		await assertThrows(addRole);
		await assertThrows(removeRole);
		// now give signer also required permissions
		await ac.updateRole(signer, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		await assertThrows(selfSigned); // self signed requests always fail
		await assertThrows(fakeAdd); // malformed request always fail
		// properly signed request now succeeds
		await addRole();
		// repeating the request fails since nonce is increased (replay attack)
		await assertThrows(addRole);
		// sending another request with the same nonce still fails (replay attack)
		await assertThrows(removeRole);
		// verify role was added successfully
		assert(await ac.isUserInRole(operator, SOME_PERM), "operator doesn't have granted role");
		assert(!await ac.isUserInRole(fakeOperator, SOME_PERM), "fake operator has a role");

		// to allow removeRole to execute we need to regenerate the signature with new nonce
		p1 = await signAndExtract(await removeRoleRequest(), signer);
		// now removeRole succeeds
		await removeRole();
		// verify feature was disabled successfully
		assert(!await ac.isUserInRole(operator, SOME_PERM), "operator still has a role after revoking it");
	});
	it("m-sig: sign and perform feature update request (2 signatures)", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// define the request signers
		const signer1 = accounts[1];
		const signer2 = accounts[2];
		const signer3 = accounts[3];
		// define the request sender - an account without any special permissions
		const sender = accounts[7];
		// define request expiration date - 15 seconds in the future
		const expiresOn = 15 + Date.now() / 1000 | 0;

		// define a function to construct requests to sign
		const addFeatureRequest = async() => await ac.constructUpdateMsigRequest(ZERO_ADDR, SOME_PERM, expiresOn);

		// sign the request by signer1 and extract signature parameters into `p1`
		const p1 = await signAndExtract(await addFeatureRequest(), signer1);
		// sign same request by signer2 and extract signature parameters into `p2`
		const p2 = await signAndExtract(await addFeatureRequest(), signer2);
		// sign same request by signer3 and extract signature parameters into `p3`
		const p3 = await signAndExtract(await addFeatureRequest(), signer3);
		// verify the signatures: uncomment if recoverUpdateMsigRequestEthSign is public
		//assert.equal(signer, await ac.recoverUpdateMsigRequestEthSign(operator, SOME_PERM, expiresOn, p1.v, p1.r, p1.s), "invalid signature p1");
		//assert.equal(signer, await ac.recoverUpdateMsigRequestEthSign(operator, SOME_PERM, expiresOn, p2.v, p2.r, p2.s), "invalid signature p2");

		// define functions to send the request with two different signatures
		const addRole13 = async() => await ac.updateMsig(ZERO_ADDR, SOME_PERM, expiresOn, [p1.v, p3.v], [p1.r, p3.r], [p1.s, p3.s], {from: sender});
		const addRole23 = async() => await ac.updateMsig(ZERO_ADDR, SOME_PERM, expiresOn, [p2.v, p3.v], [p2.r, p3.r], [p2.s, p3.s], {from: sender});
		const addRole12 = async() => await ac.updateMsig(ZERO_ADDR, SOME_PERM, expiresOn, [p1.v, p2.v], [p1.r, p2.r], [p1.s, p2.s], {from: sender});
		// define functions to send the request with only one signatures specified twice
		const addRole11 = async() => await ac.updateMsig(ZERO_ADDR, SOME_PERM, expiresOn, [p1.v, p1.v], [p1.r, p1.r], [p1.s, p1.s], {from: sender});
		const addRole22 = async() => await ac.updateMsig(ZERO_ADDR, SOME_PERM, expiresOn, [p2.v, p2.v], [p2.r, p2.r], [p2.s, p2.s], {from: sender});
		const addRole33 = async() => await ac.updateMsig(ZERO_ADDR, SOME_PERM, expiresOn, [p3.v, p3.v], [p3.r, p3.r], [p3.s, p3.s], {from: sender});

		// initially all 6 fail - none of the signers has required role
		await assertThrows(addRole13);
		await assertThrows(addRole23);
		await assertThrows(addRole12);
		// single signature calls always fail
		await assertThrows(addRole11);
		await assertThrows(addRole22);
		await assertThrows(addRole33);
		// give one of them required permissions
		await ac.updateRole(signer1, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		// still all 6 fail since 2 signatures with permissions are required
		await assertThrows(addRole13);
		await assertThrows(addRole23);
		await assertThrows(addRole12);
		// single signature calls always fail
		await assertThrows(addRole11);
		await assertThrows(addRole22);
		await assertThrows(addRole33);
		// give another one required permissions
		await ac.updateRole(signer2, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		// now calls with only 1 signature fail
		await assertThrows(addRole13);
		await assertThrows(addRole23);
		// single signature calls always fail
		await assertThrows(addRole11);
		await assertThrows(addRole22);
		await assertThrows(addRole33);
		// but call with 2 signatures succeeds
		await addRole12();
		// give one more required permissions
		await ac.updateRole(signer3, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		// all the calls still fail - nonce has already increased
		await assertThrows(addRole13);
		await assertThrows(addRole23);
		await assertThrows(addRole12);
		await assertThrows(addRole11);
		await assertThrows(addRole22);
		await assertThrows(addRole33);
		// verify feature was enabled successfully
		assert(await ac.isFeatureEnabled(SOME_PERM), "no feature present after adding it");
	});
	it("m-sig: sign and perform role update request (2 signatures)", async() => {
		// create ACL from the default account
		const ac = await ACL.new();

		// define the request signers
		const signer1 = accounts[1];
		const signer2 = accounts[2];
		const signer3 = accounts[3];
		// define an operator address
		const operator = accounts[4];
		// and fake operator address - an address which we will try to use instead operator
		const fakeOperator = accounts[5];
		// define the request sender - an account without any special permissions
		const sender = accounts[7];
		// define request expiration date - 15 seconds in the future
		const expiresOn = 15 + Date.now() / 1000 | 0;

		// define a function to construct requests to sign
		const addFeatureRequest = async() => await ac.constructUpdateMsigRequest(operator, SOME_PERM, expiresOn);

		// sign the request by signer1 and extract signature parameters into `p1`
		const p1 = await signAndExtract(await addFeatureRequest(), signer1);
		// sign same request by signer2 and extract signature parameters into `p2`
		const p2 = await signAndExtract(await addFeatureRequest(), signer2);
		// sign same request by signer3 and extract signature parameters into `p3`
		const p3 = await signAndExtract(await addFeatureRequest(), signer3);
		// verify the signatures: uncomment if recoverUpdateMsigRequestEthSign is public
		//assert.equal(signer, await ac.recoverUpdateMsigRequestEthSign(operator, SOME_PERM, expiresOn, p1.v, p1.r, p1.s), "invalid signature p1");
		//assert.equal(signer, await ac.recoverUpdateMsigRequestEthSign(operator, SOME_PERM, expiresOn, p2.v, p2.r, p2.s), "invalid signature p2");

		// define functions to send the request with one or two signatures
		const addRole13 = async() => await ac.updateMsig(operator, SOME_PERM, expiresOn, [p1.v, p3.v], [p1.r, p3.r], [p1.s, p3.s], {from: sender});
		const addRole23 = async() => await ac.updateMsig(operator, SOME_PERM, expiresOn, [p2.v, p3.v], [p2.r, p3.r], [p2.s, p3.s], {from: sender});
		const addRole12 = async() => await ac.updateMsig(operator, SOME_PERM, expiresOn, [p1.v, p2.v], [p1.r, p2.r], [p1.s, p2.s], {from: sender});
		// define functions to send the request with only one signatures specified twice
		const addRole11 = async() => await ac.updateMsig(operator, SOME_PERM, expiresOn, [p1.v, p1.v], [p1.r, p1.r], [p1.s, p1.s], {from: sender});
		const addRole22 = async() => await ac.updateMsig(operator, SOME_PERM, expiresOn, [p2.v, p2.v], [p2.r, p2.r], [p2.s, p2.s], {from: sender});
		const addRole33 = async() => await ac.updateMsig(operator, SOME_PERM, expiresOn, [p3.v, p3.v], [p3.r, p3.r], [p3.s, p3.s], {from: sender});
		// define functions to send the request for fake operator
		const addRole13f = async() => await ac.updateMsig(fakeOperator, SOME_PERM, expiresOn, [p1.v, p3.v], [p1.r, p3.r], [p1.s, p3.s], {from: sender});
		const addRole23f = async() => await ac.updateMsig(fakeOperator, SOME_PERM, expiresOn, [p2.v, p3.v], [p2.r, p3.r], [p2.s, p3.s], {from: sender});
		const addRole12f = async() => await ac.updateMsig(fakeOperator, SOME_PERM, expiresOn, [p1.v, p2.v], [p1.r, p2.r], [p1.s, p2.s], {from: sender});

		// initially all 6 fail - none of the signers has required role
		await assertThrows(addRole13);
		await assertThrows(addRole23);
		await assertThrows(addRole12);
		// single signature calls always fail
		await assertThrows(addRole11);
		await assertThrows(addRole22);
		await assertThrows(addRole33);
		// adding fake operator always fail because of malformed signature
		await assertThrows(addRole13f);
		await assertThrows(addRole23f);
		await assertThrows(addRole12f);
		// give one of them required permissions
		await ac.updateRole(signer1, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		// still all three fail since 2 signatures with permissions are required
		await assertThrows(addRole13);
		await assertThrows(addRole23);
		await assertThrows(addRole12);
		// single signature calls always fail
		await assertThrows(addRole11);
		await assertThrows(addRole22);
		await assertThrows(addRole33);
		// adding fake operator always fail because of malformed signature
		await assertThrows(addRole13f);
		await assertThrows(addRole23f);
		await assertThrows(addRole12f);
		// give another one required permissions
		await ac.updateRole(signer2, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		// adding fake operator always fail because of malformed signature
		await assertThrows(addRole13f);
		await assertThrows(addRole23f);
		await assertThrows(addRole12f);
		// calls with only 1 signature still fail
		await assertThrows(addRole13);
		await assertThrows(addRole23);
		// single signature calls always fail
		await assertThrows(addRole11);
		await assertThrows(addRole22);
		await assertThrows(addRole33);
		// but call with 2 signatures succeeds
		await addRole12();
		// give one more required permissions
		await ac.updateRole(signer3, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		// all the calls still fail - nonce has already increased
		await assertThrows(addRole13);
		await assertThrows(addRole23);
		await assertThrows(addRole12);
		await assertThrows(addRole11);
		await assertThrows(addRole22);
		await assertThrows(addRole33);
		await assertThrows(addRole13f);
		await assertThrows(addRole23f);
		await assertThrows(addRole12f);
		// verify feature was enabled successfully
		assert(await ac.isUserInRole(operator, SOME_PERM), "no feature present after adding it");
	});
	it("m-sig: replay attack using 2 instances – Robert Magier scenario", async() => {
		// create 2 ACLs from the default account
		const ac1 = await ACL.new();
		const ac2 = await ACL.new();

		// define the request signers
		const signer1 = accounts[1];
		const signer2 = accounts[2];

		// define an operator address which should be given access to ac1
		const operator1 = accounts[4];
		// some address with no permissions which will use the obtained signatures
		const someone = accounts[5];

		// give signers manager permission and some other permission
		await ac1.updateRole(signer1, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		await ac1.updateRole(signer2, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		await ac2.updateRole(signer1, ROLE_ACCESS_MANAGER.or(SOME_PERM));
		await ac2.updateRole(signer2, ROLE_ACCESS_MANAGER.or(SOME_PERM));

		// define request expiration date - 15 seconds in the future
		const expiresOn = 15 + Date.now() / 1000 | 0;
		// prepare the message to sign by signer1 and signer2
		const msg = await ac1.constructUpdateMsigRequest(operator1, SOME_PERM, expiresOn);
		// sign the request by signer1 and signer2 and extract signature parameters into p1 and p2
		const p1 = await signAndExtract(msg, signer1);
		const p2 = await signAndExtract(msg, signer2);

		// define an updateMsig execution function
		const fn = async (instance) => await instance.updateMsig(operator1, SOME_PERM, expiresOn, [p1.v, p2.v], [p1.r, p2.r], [p1.s, p2.s], {from: someone});
		// executing request on ac2 fails
		await assertThrows(fn, ac2);
		// executing request on ac1 succeeds
		await fn(ac1);

		// verify the permissions
		assert(await ac1.isUserInRole(operator1, SOME_PERM), "operator1 doesn't have SOME_PERM on ac1");
		assert(!await ac2.isUserInRole(operator1, SOME_PERM), "operator1 has SOME_PERM on ac2");
	});
});

// import auxiliary function to ensure function `fn` throws
import {assertThrows, toBN, ZERO_ADDR, toPrettyBinary} from "../scripts/shared_functions";


// START: Geth specific functions // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign
/**
 * Extracts ECDSA signature parameters r, s and v from the signature
 * @param signature a signature to extract parameters from
 */
function extractEllipticCurveParameters(signature) {
	const parameters = {};
	parameters.r = "0x" + signature.slice(2, 66);
	parameters.s = "0x" + signature.slice(66, 130);
	parameters.v = toBN("0x" + signature.slice(130, 132)).toNumber();
	return parameters;
}

/**
 * Signs a message using an account and extracts
 * ECDSA signature parameters r, s and v from the signature
 * @param message a message to be signed by the account
 * @param account an account used to sign a message
 */
async function signAndExtract(message, account) {
	const signature = await web3.eth.sign(message, account);
	return extractEllipticCurveParameters(signature);
}
// END: Geth specific functions
