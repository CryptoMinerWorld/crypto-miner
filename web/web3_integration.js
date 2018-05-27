document.write(`
<div id="geode_qty_modal" class="overlay">
	<a class="cancel" href="#"></a>
	<div class="modal">
		<h3>Buying Geodes</h3>
		<div class="content">
			<select id="NumberOfGeodes" name="NumberOfGeodes" title="Number of Geodes" style="width: 100%; height: 2em; margin: 1em 0 2em 0;">
				<option value="1">1</option>
				<option value="2">2</option>
				<option value="3">3</option>
				<option value="4">4</option>
				<option value="5">5 (+1 free Gem)</option>
				<option value="6">6 (+1 free Gem)</option>
				<option value="7">7 (+1 free Gem)</option>
				<option value="8">8 (+1 free Gem)</option>
				<option value="9">9 (+1 free Gem)</option>
				<option value="10">10 (+1 free Gem and +1 free Geode)</option>
			</select>
			<input type="button" value="Buy" onclick="buy()" style="width: 100%; height: 2em;"/>
		</div>
	</div>
</div>
<div id="gem_modal" class="overlay">
	<a class="cancel" href="#"></a>
	<div class="modal" style="margin-top: 120px; width: 800px;">
		<div class="content">
			<table>
				<tr><td style="padding: 0; width: 500px;">
					<img id="picture" width="500" height="500" src="https://rawgit.com/vgorin/crypto-miner/master/web/gems/Ame 1 A.png"/>
				</td><td style="vertical-align: middle;">
					<h1>Tipsy Pete</h1>
					<h4>Mining rate – <span id="grade_value">25</span>%</h4>
					<h4>Energy level – <span id="energy_level">100</span>%</h4>
					<h4>Grade <span id="grade_type">B</span></h4>
					<h4 id="level">Baby, Level 1</h4>
					<h4 id="color">Amethyst (February)</h4>
				</td></tr>
			</table>
		</div>
	</div>
</div>
`);


const jQuery3 = jQuery.noConflict();

const con = document.getElementById("console");
const tok = document.getElementById("TokenAddress");
const sale = document.getElementById("SaleAddress");
const geodesNum = document.getElementById("NumberOfGeodes");
const tokAddr = "0xfe71b017577c8439fa2cecbf3e66a7ea61ce5196";
const helperAddr = "0x61646e64b6c9bc939139a1847477704cdb26992f";
const saleAddr = "0x17044300943b4d0206e6f64894c71b6595d8822f";

let myWeb3;
let myAccount;
let gemABI;
let gemHelperABI;
let saleABI;

function init() {
	if(typeof window.web3 === 'undefined') {
		printError("Web3 is not enabled. Do you need to install MetaMask?");
		return;
	}
	myWeb3 = new Web3(window.web3.currentProvider);
	myWeb3.eth.getAccounts(function(err, accounts) {
		if(err) {
			printError("getAccounts() error: " + err);
			return;
		}
		myAccount = accounts[0];
		if(!myAccount) {
			printError("Cannot access default account. Is MetaMask locked?");
			return;
		}
		printInfo("Web3 integration loaded. Your account is " + myAccount);
		myWeb3.eth.getBalance(myAccount, function(err, balance) {
			if(err) {
				printError("getBalance() error: " + err);
				return;
			}
			if(balance > 0) {
				printInfo("Your balance is " + myWeb3.fromWei(balance, 'ether'));
			}
			else {
				printError("Your balance is zero. You won't be able to send any transaction.");
			}
			jQuery3.ajax({
				async: false,
				global: false,
				url: "abi/GemERC721.json",
				dataType: "json",
				success: function(data, textStatus, jqXHR) {
					printInfo("Gem ABI loaded successfully");
					gemABI = myWeb3.eth.contract(data.abi);
					connect_gem();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					jQuery3.ajax({
						async: false,
						global: false,
						url: "https://rawgit.com/vgorin/crypto-miner/master/web/abi/GemERC721.json",
						dataType: "json",
						success: function(data, textStatus, jqXHR) {
							printInfo("Gem ABI loaded successfully");
							gemABI = myWeb3.eth.contract(data.abi);
							connect_gem();
						},
						error: function(jqXHR, textStatus, errorThrown) {
							printError("Cannot load Gem ABI: " + errorThrown);
						}
					});
				}
			});
			jQuery3.ajax({
				async: false,
				global: false,
				url: "abi/GemHelper.json",
				dataType: "json",
				success: function(data, textStatus, jqXHR) {
					printInfo("Gem Helper ABI loaded successfully");
					gemHelperABI = myWeb3.eth.contract(data.abi);
					connect_gem_helper();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					jQuery3.ajax({
						async: false,
						global: false,
						url: "https://rawgit.com/vgorin/crypto-miner/master/web/abi/GemHelper.json",
						dataType: "json",
						success: function(data, textStatus, jqXHR) {
							printInfo("Gem Helper ABI loaded successfully");
							gemHelperABI = myWeb3.eth.contract(data.abi);
							connect_gem_helper();
						},
						error: function(jqXHR, textStatus, errorThrown) {
							printError("Cannot load Gem Helper ABI: " + errorThrown);
						}
					});
				}
			});
			jQuery3.ajax({
				async: false,
				global: false,
				url: "abi/GeodeSale.json",
				dataType: "json",
				success: function(data, textStatus, jqXHR) {
					printInfo("GeodeSale ABI loaded successfully");
					saleABI = myWeb3.eth.contract(data.abi);
					connect_sale();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					jQuery3.ajax({
						async: false,
						global: false,
						url: "https://rawgit.com/vgorin/crypto-miner/master/web/abi/GeodeSale.json",
						dataType: "json",
						success: function(data, textStatus, jqXHR) {
							printInfo("GeodeSale ABI loaded successfully");
							saleABI = myWeb3.eth.contract(data.abi);
							connect_sale();
						},
						error: function(jqXHR, textStatus, errorThrown) {
							printError("Cannot load GeodeSale ABI: " + errorThrown);
						}
					});
				}
			});
		})
	});
}

let gemInstance;

function connect_gem() {
	if(!(myWeb3 && gemABI && myAccount)) {
		printError("Web3 is not properly initialized. Reload the page.");
		gemInstance = null;
		return;
	}
	const tokenAddress = tok ? tok.value : tokAddr;
	gemInstance = gemABI.at(tokenAddress);
	try {
		gemInstance.symbol(function(err, symbol) {
			if(err) {
				printError("Error accessing Gem (ERC721 Token) Instance: " + err);
				printError("Check if the address specified points to a valid ERC721 contract");
				gemInstance = null;
				return;
			}
			if("GEM" !== symbol) {
				printError("Error accessing Gem (ERC721 Token) Instance: not a valid instance");
				printError("Check if the address specified points to an ERC721 instance with the symbol = GEM");
				gemInstance = null;
				return;
			}
			printInfo("Successfully connected to Gem (ERC721 Token) Instance at " + tokenAddress);
			const mintEvent = gemInstance.Minted({}, {fromBlock: "latest", toBlock: "latest"});
			mintEvent.watch(function(err, receipt) {
				if(err) {
					printError("Error receiving Minted event: " + err);
					return;
				}
				if(!(receipt && receipt.args && receipt.args._by && receipt.args._to && receipt.args._tokenId)) {
					printError("Minted event received in wrong format: wrong arguments");
					return;
				}
				const by = receipt.args._by;
				const to = receipt.args._to;
				const tokenId = receipt.args._tokenId.toString(16);
				printInfo("Minted(0x" + tokenId + ", " + to + ", " + by + ")");
			});
			printInfo("Successfully registered Minted(uint32, address, address) event listener");
/*
			const burnEvent = gemInstance.Burnt({}, {fromBlock: "latest", toBlock: "latest"});
			burnEvent.watch(function(err, receipt) {
				if(err) {
					printError("Error receiving Burnt event: " + err);
					return;
				}
				if(!(receipt && receipt.args && receipt.args.tokenId && receipt.args.from && receipt.args.by)) {
					printError("Burnt event received in wrong format: wrong arguments");
					return;
				}
				const tokenId = receipt.args.tokenId.toString(16);
				const from = receipt.args.from;
				const by = receipt.args.by;
				printInfo("Burnt(0x" + tokenId + ", " + from + ", " + by + ")");
			});
			printInfo("Successfully registered Burnt(uint80, address, address) event listener");
*/
			const tokenTransferEvent = gemInstance.TokenTransfer({}, {fromBlock: "latest", toBlock: "latest"});
			tokenTransferEvent.watch(function(err, receipt) {
				if(err) {
					printError("Error receiving TokenTransfer event: " + err);
					return;
				}
				if(!(receipt && receipt.args && receipt.args._from && receipt.args._to && receipt.args._tokenId)) {
					printError("TokenTransfer event received in wrong format: wrong arguments");
					return;
				}
				const from = receipt.args._from;
				const to = receipt.args._to;
				const gemId = receipt.args._tokenId.toString(16);
				printInfo("TokenTransfer(" + from + ", " + to + ", 0x" + gemId + ")");
			});
			printInfo("Successfully registered TokenTransfer(address, address, uint32) event listener");

			connection_successful();
		});
	}
	catch(err) {
		printError("Cannot access Gem (ERC721 Token) Instance: " + err);
		gemInstance = null;
	}
}

let gemHelperInstance;

function connect_gem_helper() {
	if(!(myWeb3 && gemHelperABI && myAccount)) {
		printError("Web3 is not properly initialized. Reload the page.");
		gemHelperInstance = null;
		return;
	}
	const tokenAddress = tok ? tok.value : tokAddr;
	gemHelperInstance = gemHelperABI.at(helperAddr);
	try {
		gemHelperInstance.getPackedCollection(tokenAddress, myAccount, function(err, packedCollection) {
			if(err) {
				printError("Error accessing Gem (ERC721 Token) Instance: " + err);
				printError("Check if the address specified points to a valid ERC721 contract");
				gemHelperInstance = null;
				return;
			}
			if(packedCollection.length === 0) {
				printInfo("You don't own any gems");
				return;
			}
			printInfo("You own " + packedCollection.length + " gem(s):");
			for(let i = 0; i < packedCollection.length; i++) {
				printInfo("0x" + packedCollection[i].toString(16));
			}

			// ========= START: Draw Gems in a Table =========
			const columns = 6;
			const rows = Math.ceil(packedCollection.length / columns);
			let html = "<table id='myGeodes'>\n";
			for(let i = 0; i < rows; i++) {
				html += "<tr>\n";
				for(let j = 0; j < columns; j++) {
					const idx = i * columns + j;
					if(idx < packedCollection.length) {
						const gemId = "0x" + packedCollection[idx].dividedToIntegerBy(0x100000000).toString(16);
						html += "\t<td id='" + gemId + "'>\n";

						// inject gem data
						const properties = packedCollection[idx].modulo(0x100000000);
						const colorId = properties.dividedToIntegerBy(0x1000000).toNumber();
						const levelId = properties.dividedToIntegerBy(0x10000).modulo(0x100).toNumber();
						const gradeType = properties.dividedToIntegerBy(0x100).modulo(0x100).toNumber();
						const gradeValue = properties.modulo(0x100).toNumber();

						const color = gem_color_to_string(colorId);
						const level = gem_level_to_string(levelId);
						const grade = gem_grade_type_to_string(gradeType);
						const thumbnail = gem_thumbnail_url(color, level, grade);

						html += '<a href="javascript:display_gem(\'' + color + '\', \'' + level + '\', \'' + grade + '\', \'' + gradeValue + '\')">';
						html += "<img width='160' height='160' src='" + thumbnail + "'/></a><br/>\n";
						html += "Lv." + levelId + " " + color.substr(0, color.indexOf(" ")) + " " + grade + " " + gradeValue + "%";
					}
					else {
						html += "\t<td>\n";
					}
				}
				html += "</tr>\n";
			}
			html += "</table>\n";
			jQuery3("#pl-951").html(html);
			// =========  END:  Draw Gems in a Table =========
		});
	}
	catch(err) {
		printError("Cannot access Gem (ERC721 Token) Instance: " + err);
		gemInstance = null;
	}
}


let saleInstance;

function connect_sale() {
	if(!(myWeb3 && saleABI && myAccount)) {
		printError("Web3 is not properly initialized. Reload the page.");
		gemInstance = null;
		return;
	}
	const saleAddress = sale ? sale.value : saleAddr;
	saleInstance = saleABI.at(saleAddress);
	try {
		registerGeodeSaleEvent();
		updateGeodePrice();
		updateGeodesSold(connection_successful);
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
		saleInstance = null;
	}
}

function connection_successful() {
	if(myWeb3 && gemInstance && saleInstance) {
		printSuccess("Successfully connected<br/>\nNetwork ID: " + myWeb3.version.network);
	}
}

function buy() {
	if(!(myWeb3 && saleInstance && myAccount)) {
		printError("Web3 is not properly initialized. Reload the page.");
		saleInstance = null;
		return 0x1;
	}
	try {
		const n = geodesNum ? geodesNum.value: 1;
		saleInstance.currentPrice(function(err, price) {
			if(err) {
				printError("Cannot get total price of the " + n + " geodes");
				return;
			}
			price = price.times(n);
			const priceETH = myWeb3.fromWei(price, "ether");
			printInfo("Total price of the " + n + " geodes is " + priceETH);
			saleInstance.getGeodes.sendTransaction({value: price}, function(err, txHash) {
				if(err) {
					printError("Transaction failed: " + err.toString().split("\n")[0]);
					return;
				}
				printSuccess("Transaction sent: " + txHash);
				// close modal window
				location.href = "#";
			});
		});
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
		saleInstance = null;
	}
}

function registerGeodeSaleEvent() {
	if(!(myWeb3 && saleABI && myAccount && saleInstance)) {
		printError("Web3 is not properly initialized. Reload the page.");
		saleInstance = null;
		return;
	}
	try {
		const saleEvent = saleInstance.GeodeSold({}, {fromBlock: "latest", toBlock: "latest"});
		saleEvent.watch(function(err, receipt) {
			if(err) {
				printError("Error receiving GeodeSold event: " + err);
				return;
			}
			if(!(receipt && receipt.args && receipt.args.plotId && receipt.args.owner)) {
				printError("GeodeSold event received in wrong format: wrong arguments");
				return;
			}
			const plotId = receipt.args.plotId;
			const owner = receipt.args.owner;
			printInfo("GeodeSold(" + plotId + ", " + owner + ")");
			notify("Successfully bought geode #" + plotId, "success");

			updateGeodesSold();
		});
		printInfo("Successfully registered GeodeSold(uint16, address) event listener");
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
		saleInstance = null;
	}
}

function updateGeodePrice() {
	if(!(myWeb3 && saleABI && myAccount && saleInstance)) {
		printError("Web3 is not properly initialized. Reload the page.");
		saleInstance = null;
		return;
	}
	try {
		saleInstance.currentPrice(function(err, price) {
			if(err) {
				printError("Unable to read geode price value");
				saleInstance = null;
				return;
			}
			const priceETH = myWeb3.fromWei(price, "ether");
			const geodePriceETH = priceETH.toString(10);
			printInfo("call to currentPrice returned " + geodePriceETH + " ETH");
			jQuery3("#geodePriceETH").html(geodePriceETH);
		});
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
		saleInstance = null;
	}
}

function updateGeodesSold(callback) {
	if(!(myWeb3 && saleABI && myAccount && saleInstance)) {
		printError("Web3 is not properly initialized. Reload the page.");
		saleInstance = null;
		return;
	}
	try {
		saleInstance.geodesSold(function(err, sold) {
			if(err) {
				printError("Unable to read geodes sold value: " + err);
				saleInstance = null;
				return;
			}
			const geodesSold = sold.toString(10);
			printInfo("call to geodesSold returned " + geodesSold);
			jQuery3("span.counter").html(geodesSold);
			if(callback) {
				callback();
			}
		});
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
		saleInstance = null;
	}
}

function selectAndBuy() {
	if(!myWeb3) {
		location.href = "https://metamask.io/";
		return;
	}

	const getGeodeModal = document.getElementById("geode_qty_modal");
	if(getGeodeModal) {
		location.href = "#geode_qty_modal";
	}
	else {
		buy();
	}
}

function printInfo(msg) {
	console.log(msg);
	if(con) {
		con.innerHTML += msg;
		con.innerHTML += "\n";
	}
}

function printSuccess(msg) {
	console.log(msg);
	if(con) {
		con.innerHTML += '<span style="color: darkgreen;">' + msg + '</span>';
		con.innerHTML += "\n";
	}
	notify(msg, "success");
}

function printError(msg) {
	console.error(msg);
	if(con) {
		con.innerHTML += '<span style="color: red;">' + msg + '</span>';
		con.innerHTML += "\n";
	}
	notify(msg, "danger");
}

let lastNotify;
function notify(msg, type) {
	if(msg == lastNotify) {
		return;
	}
	lastNotify = msg;
	jQuery3.notify(msg, {
		type: type,
		placement: {
			from: "bottom",
			align: "right"
		},
		delay: type === "danger" ? 10000: 1000,
		template: '<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">' +
		'<span data-notify="icon"></span> ' +
		'<span data-notify="title">{1}</span> ' +
		'<span data-notify="message">{2}</span>' +
		'<div class="progress" data-notify="progressbar">' +
		'<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0;"></div>' +
		'</div>' +
		'<a href="{3}" target="{4}" data-notify="url"></a>' +
		'</div>'
	});
}

function display_gem(color, level, grade, gradeValue) {
	console.log("display_gem(%s, %s, %s, %s)", color, level, grade, gradeValue);
	jQuery3("#gem_modal #picture").attr("src", gem_url(color, level, grade));
	jQuery3("#gem_modal #level").html(level);
	jQuery3("#gem_modal #color").html(color);
	jQuery3("#gem_modal #grade").html(grade);
	jQuery3("#gem_modal #grade_value").html(gradeValue);
	location.href = "#gem_modal";
}

function preload_images() {
	const images = [];
	for(let colorId = 1; colorId <= 12; colorId++) {
		for(let levelId = 1; levelId <= 2; levelId++) {
			for(let gradeType = 1; gradeType <= 6; gradeType++) {
				const img = new Image();
				img.src = gem_thumbnail_url(gem_color_to_string(colorId), gem_level_to_string(levelId), gem_grade_type_to_string(gradeType));
				images.push(img);
			}
		}
	}
}

function gem_color_to_string(colorId) {
	let color = "";
	switch(colorId) {
		case 1: color = "Garnet (January)"; break;
		case 2: color = "Amethyst (February)"; break;
		case 3: color = "Aquamarine (March)"; break;
		case 4: color = "Diamond (April)"; break;
		case 5: color = "Emerald (May)"; break;
		case 6: color = "Pearl (June)"; break;
		case 7: color = "Ruby (July)"; break;
		case 8: color = "Peridot (August)"; break;
		case 9: color = "Sapphire (September)"; break;
		case 10: color = "Opal (October)"; break;
		case 11: color = "Topaz (November)"; break;
		case 12: color = "Turquoise (December)"; break;
	}
	return color;
}

function gem_level_to_string(levelId) {
	let level = "";
	switch(levelId) {
		case 1: level = "Baby, Level "; break;
		case 2: level = "Toddler, Level "; break;
		case 3: level = "Child, Level "; break;
		case 4: level = "Teen, Level "; break;
		case 5: level = "Adult, Level "; break;
	}
	level += levelId;
	return level;
}

function gem_grade_type_to_string(gradeType) {
	let grade = "";
	switch(gradeType) {
		case 1: grade = "D"; break;
		case 2: grade = "C"; break;
		case 3: grade = "B"; break;
		case 4: grade = "A"; break;
		case 5: grade = "AA"; break;
		case 6: grade = "AAA"; break;
	}
	return grade;
}

function gem_thumbnail_url(color, level, grade) {
	return "https://rawgit.com/vgorin/crypto-miner/master/web/gems/thumbnails/"
		+ color.substr(0, 3) + " " + level.substr(-1, 1) + " " + grade + ".png";
}

function gem_url(color, level, grade) {
	return "https://rawgit.com/vgorin/crypto-miner/master/web/gems/"
		+ color.substr(0, 3) + " " + level.substr(-1, 1) + " " + grade + ".png";
}

jQuery3(document).ready(function() {
	init();

	setInterval(function() {
		if(myWeb3 && myWeb3.eth.accounts[0] !== myAccount) {
			myAccount = myWeb3.eth.accounts[0];
			printInfo("Your account is switched to " + myAccount);
			init();
			setTimeout(updateGeodesSold, 988);
		}
	}, 1988);

	// TODO: get rid of this ugly solution to update geodes sold counter
	if(myWeb3 && myAccount) {
		setTimeout(updateGeodesSold, 988);
	}

	const getGeodeButton = jQuery3("#GetGeodeButton");
	getGeodeButton.bind("click", selectAndBuy);
	getGeodeButton.css("cursor", "pointer");

	preload_images();
});
