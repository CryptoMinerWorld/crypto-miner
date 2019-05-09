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
		plotAddress = "0xd2d1B1FE416E72aDddf6C70f1E16b3bfc90e510f";
		artifactAddress = "0x1"; // TODO
		silverAddress = "0x901C62b3194C6c460B303537Ab3F39e80f933d48";
		goldAddress = "0x6c4BC3179A2B28f641ae15DD55419240bB61e1A6";
		artifact20Address = "0xd320AE7AB4Da96157ed8090F69dE13120BC92DE8";
		foundersKeyAddress = "0x668B9A40f01B699fE1bd4256A8da74cD77423be3";
		chestKeyAddress = "0x2739e57f3552d816625ab82b4a55E3A07b48bE12";
	}

	// create links to instances for access control
	const gemControl = AccessControl.at(gemAddress);
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
