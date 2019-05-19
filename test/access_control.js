const ROLE_ROLE_MANAGER = 0x10000000;
const ROLE_FEATURE_MANAGER = 0x20000000;

const FULL_PRIVILEGES_MASK = web3.toBigNumber("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

const AccessControl = artifacts.require("./AccessControl.sol");

contract('AccessControl', function(accounts) {
	it("initial state: creator has full access, other account don't have any roles", async function() {
		const ac = await AccessControl.new();
		assert(FULL_PRIVILEGES_MASK.eq(await ac.userRoles(accounts[0])), "creator doesn't have full permissions");
		assert.equal(0, await ac.userRoles(accounts[1]), "arbitrary account has some permissions");
	});

	it("updating features: full cycle", async function() {
		const ac = await AccessControl.new();
		await assertThrows(async function() {await ac.updateFeatures.sendTransaction(0x1, {from: accounts[1]});});
		await ac.addOperator(accounts[1], ROLE_FEATURE_MANAGER | 0x1);
		await ac.updateFeatures.sendTransaction(0x1, {from: accounts[1]});
		assert.equal(0x1, await ac.features(), "wrong features after updating features to 0x1");
	});

	it("adding an operator: full cycle", async function() {
		const ac = await AccessControl.new();
		await assertThrows(async function() {await ac.addOperator.sendTransaction(accounts[2], 0x1, {from: accounts[1]});});
		await ac.addOperator(accounts[1], ROLE_ROLE_MANAGER | 0x1);
		await assertThrows(async function() {await ac.addOperator(accounts[1], ROLE_ROLE_MANAGER | 0x1);});
		await ac.addOperator.sendTransaction(accounts[2], 0x1, {from: accounts[1]});
		await assertThrows(async function() {await ac.addOperator.sendTransaction(accounts[2], 0x1, {from: accounts[1]});});
		assert.equal(0x1, await ac.userRoles(accounts[2]), "wrong operator permissions after adding operator");
	});

	it("removing an operator: full cycle", async function() {
		const ac = await AccessControl.new();
		await assertThrows(async function() {await ac.removeOperator(accounts[1]);});
		await ac.addOperator(accounts[1], ROLE_ROLE_MANAGER | 0x1);
		await assertThrows(async function() {await ac.removeOperator.sendTransaction(accounts[1], {from: accounts[1]});});
		await assertThrows(async function() {await ac.removeOperator.sendTransaction(accounts[1], {from: accounts[2]});});
		await ac.addOperator(accounts[2], ROLE_ROLE_MANAGER | 0x1);
		await ac.removeOperator.sendTransaction(accounts[1], {from: accounts[2]});
		assert.equal(0, await ac.userRoles(accounts[1]), "wrong operator permissions after removing operator");
	});

	it("adding a role: full cycle", async function() {
		const ac = await AccessControl.new();
		await assertThrows(async function() {await ac.addRole(accounts[1], 0x2);});
		await ac.addOperator(accounts[1], 0x1);
		await assertThrows(async function() {await ac.addRole.sendTransaction(accounts[1], 0x2, {from: accounts[1]});});
		await ac.addRole(accounts[1], 0x2);
		assert.equal(0x3, await ac.userRoles(accounts[1]), "wrong operator permissions after adding a role");

		await ac.addOperator(accounts[2], ROLE_ROLE_MANAGER | 0xF0F0);
		await assertThrows(async function() {await ac.addOperator.sendTransaction(accounts[3], 0x0F0F, {from: accounts[2]});});
		await ac.addOperator.sendTransaction(accounts[3], 0xFFFF, {from: accounts[2]});
		assert.equal(0xF0F0, await ac.userRoles(accounts[3]), "wrong operator permissions after role intersection");
		await assertThrows(async function() {await ac.addRole.sendTransaction(accounts[3], 0x0F0F, {from: accounts[2]});});
	});

	it("removing a role: full cycle", async function() {
		const ac = await AccessControl.new();
		await ac.addOperator(accounts[1], 0x3);
		await ac.addOperator(accounts[3], ROLE_ROLE_MANAGER);
		await assertThrows(async function() {await ac.removeRole.sendTransaction(accounts[1], 0x2, {from: accounts[2]});});
		await assertThrows(async function() {await ac.removeRole.sendTransaction(accounts[1], 0x2, {from: accounts[3]});});
		await ac.removeRole(accounts[1], 0x2);
		assert.equal(0x1, await ac.userRoles(accounts[1]), "wrong operator permissions after removing a role");
	});
});


// import auxiliary function to ensure function `fn` throws
import {assertThrows} from "../scripts/shared_functions";
