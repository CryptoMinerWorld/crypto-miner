const Sale2 = artifacts.require("./Presale2");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[get player stats] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[get player stats] coverage network - skipping the migration script");
		return;
	}

	let sale2Address = "0xE0A21044eEeB9efC340809E35DC0E9d82Dc87DD1"; // mainnet
	if(network !== "mainnet") {
		sale2Address = "0x10A0F683304B6878E5e70295445Fb03EEB6dEc75"; // rinkeby
		if(network === "ropsten") {
			sale2Address = "0x3cf439e50cf3a1147f79ca59a2ad52affd1fa0f0"; // ropsten
		}
	}

	const sale2Instance = Sale2.at(sale2Address);
	console.log(`address, gems, geodes, ref points, refs used, refs available`);
	const uint64 = web3.toBigNumber("0x10000000000000000");
	let i = 0, addr;
	while((addr = await sale2Instance.referralPointsHolders(i++)) != '0x') {
		const packed = await sale2Instance.getPackedBalances(addr);
		const totalPoints = packed.modulo(0x100000000);
		const availablePoints = packed.dividedToIntegerBy(0x100000000).modulo(0x100000000);
		const usedPoints = totalPoints.minus(availablePoints);
		const geodes = packed.dividedToIntegerBy(uint64).modulo(0x10000);
		const gems = packed.dividedToIntegerBy(uint64).dividedToIntegerBy(0x10000);
		console.log(`${addr}, ${gems}, ${geodes}, ${totalPoints}, ${usedPoints}, ${availablePoints}`);
	}
};
