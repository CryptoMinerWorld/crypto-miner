const ROLE_TOKEN_CREATOR = 0x00040000;
const ROLE_ROLE_MANAGER = 0x10000000;

const Token = artifacts.require("./GemERC721");
const Sale = artifacts.require("./Presale");

contract('Presale 5500', function(accounts) {
	it("presale: buying all 5500 geodes", async function() {
		const tk = await Token.new();
		const sale = await Sale.new(tk.address, accounts[9], accounts[9]);
		await tk.updateFeatures(ROLE_ROLE_MANAGER | ROLE_TOKEN_CREATOR);
		await tk.addOperator(sale.address, ROLE_TOKEN_CREATOR);

		const first500 = (await sale.currentPrice()).times(10);
		const next5000 = first500.times(2);
		process.stdout.write("    ");
		for(let i = 0; i < 500; i++) {
			process.stdout.write("" + i);
			await sale.getGeodes.sendTransaction({
				from: accounts[i % 8],
				value: i < 46? first500: next5000
			});
			process.stdout.write(".");
		}
		process.stdout.write("\n");

		let allTheGems = [];
		for(let i = 0; i < 8; i++) {
			const collection = await tk.getPackedCollection(accounts[i]);
			console.log("    collection " + i + " size: " + collection.length);
			allTheGems = allTheGems.concat(collection);
		}

		console.log("    total gems bought: " + allTheGems.length);
		const colorNames = {
			1: "January",
			2: "February",
			3: "March",
			4: "April",
			5: "May",
			6: "June",
			7: "July",
			8: "August",
			9: "September",
			10: "October",
			11: "Noveber",
			12: "December",
		};
		const colors = {};
		const levels = {};
		const gradeNames = {
			1: "Grade D",
			2: "Grade C",
			3: "Grade B",
			4: "Grade A",
			5: "Grade AA",
			6: "Grade AAA",
		};
		const grades = {};
		for(let i = 0; i < allTheGems.length; i++) {
			const colorId = allTheGems[i].dividedToIntegerBy(0x1000000).modulo(0x100);
			const levelId = allTheGems[i].dividedToIntegerBy(0x10000).modulo(0x100);
			const gradeType = allTheGems[i].dividedToIntegerBy(0x100).modulo(0x100);
			colors[colorId] = ++colors[colorId] || 0;
			levels[levelId] = ++levels[levelId] || 0;
			grades[gradeType] = ++grades[gradeType] || 0;
		}
		for(let i = 1; i <= 12; i++) {
			console.log("    " + colorNames[i] + ": \t" + (colors[i] || 0));
		}
		for(let i = 1; i <= 5; i++) {
			console.log("    Level " + i + ":\t" + (levels[i] || 0));
		}
		for(let i = 1; i <= 6; i++) {
			console.log("    " + gradeNames[i] + ":\t" + (grades[i] || 0));
		}
	});
});