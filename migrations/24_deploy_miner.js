// Miner Smart Contract
const Miner = artifacts.require("./Miner");

// Access Control ABIs to grant permissions
const AccessControl = artifacts.require("./AccessControl"); // for GemERC721
const AccessControlLight = artifacts.require("./AccessControlLight"); // for all other tokens

// Miner Smart Contract Deployment
module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy miner] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy miner] coverage network - skipping the migration script");
		return;
	}

	// define miner dependencies
	let gemAddress = "0xeAe9d154dA7a1cD05076dB1B83233f3213a95e4F";
	let gemExtAddress = "";
	let plotAddress = "";
	let artifactAddress = "";
	let silverAddress = "0x5eAb0Ea7AC3cC27f785D8e3fABA56b034aa56208";
	let goldAddress = "0x4e55C62f4e2ca19B22c2156273F5900e124B9acD";
	let artifact20Address = "";
	let foundersKeyAddress = "";
	let chestKeyAddress = "";

	// for test network addresses are different
	if(network !== "mainnet") {
		gemAddress = "0x82FF6Bbd7B64f707e704034907d582C7B6E09d97";
		gemExtAddress = "0x907C6A3fe243031f366e79c9479626a407890ACD";
		plotAddress = "0xE723149a90951F343523b008cae605eC1205cC16";
		artifactAddress = "0x1"; // TODO
		silverAddress = "0x901C62b3194C6c460B303537Ab3F39e80f933d48";
		goldAddress = "0x6c4BC3179A2B28f641ae15DD55419240bB61e1A6";
		artifact20Address = "0x37C5D9A33ce8f924115bDDc3B751a5D28B1c3358";
		foundersKeyAddress = "0x5BB38ec2C5bebAe9b13188b9cFdF4cd7a24d3b94";
		chestKeyAddress = "0x61CB4B77B6c039D3b4F9797Ea97e42d43555A3fe";
	}

	// create links to instances for access control
	const gemControl = AccessControl.at(gemAddress);
	const gemExtControl = AccessControlLight.at(gemExtAddress);
	const plotControl = AccessControlLight.at(plotAddress);
	// const artifactControl = AccessControlLight.at(artifactAddress); // TODO:
	const silverControl = AccessControlLight.at(silverAddress);
	const goldControl = AccessControlLight.at(goldAddress);
	const artifact20Control = AccessControlLight.at(artifact20Address);
	const foundersKeyControl = AccessControlLight.at(foundersKeyAddress);
	const chestKeyControl = AccessControlLight.at(chestKeyAddress);

	// deploy Miner smart contract
	await deployer.deploy(
		Miner,
		gemAddress,
		gemExtAddress,
		plotAddress,
		artifactAddress,
		silverAddress,
		goldAddress,
		artifact20Address,
		foundersKeyAddress,
		chestKeyAddress
	);
	const miner = await Miner.deployed();
	const minerAddress = miner.address;

	// for test networks:
	if(network !== "mainnet") {
		// give miner all the permissions required
		await gemControl.addOperator(minerAddress, 0x00440000); // state provider, token creator
		await gemExtControl.updateRole(minerAddress, 0x00000003); // next ID inc, extension writer
		await plotControl.updateRole(minerAddress, 0x00000014); // state provider, offset provider
		// await artifactControl.updateRole(); // TODO
		await silverControl.updateRole(minerAddress, 0x00000001); // token creator
		await goldControl.updateRole(minerAddress, 0x00000001); // token creator
		await artifact20Control.updateRole(minerAddress, 0x00000001); // token creator
		await foundersKeyControl.updateRole(minerAddress, 0x00000001); // token creator
		await chestKeyControl.updateRole(minerAddress, 0x00000001); // token creator

		// enable mining feature
		await miner.updateFeatures(0x00000001); // mining feature
	}

	console.log("________________________________________________________________________");
	console.log("miner:          " + minerAddress);

};
