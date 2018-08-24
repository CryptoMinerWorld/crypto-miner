const Sale2 = artifacts.require("./Presale2");

module.exports = async function(deployer, network, accounts) {
	if(network === "test") {
		console.log("[deploy gem] test network - skipping the migration script");
		return;
	}
	if(network === "coverage") {
		console.log("[deploy gem] coverage network - skipping the migration script");
		return;
	}

	let sale2Address = "0xe0a21044eeeb9efc340809e35dc0e9d82dc87dd1"; // mainnet
	if(network === "development") {
		sale2Address = "0x10a0f683304b6878e5e70295445fb03eeb6dec75"; // rinkeby
	}

	const sale2Instance = Sale2.at(sale2Address);
	console.log(`address, gems, geodes, total, used, available`);
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
