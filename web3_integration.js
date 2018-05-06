const jQuery3 = jQuery.noConflict();

const con = document.getElementById("console");
const tok = document.getElementById("TokenAddress");
const sale = document.getElementById("SaleAddress");
const geodesNum = document.getElementById("NumberOfGeodes");
const tokAddr = "0x022698205db38497753afed4a6f095db341c94ae";
const saleAddr = "0xf6982cce79eea5b6ad987ce630a12c7423bb20f1";

let myWeb3;
let myAccount;
let gemABI;
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
				url: "https://rawgit.com/vgorin/crypto-miner/master/build/contracts/Gem.json",
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
			jQuery3.ajax({
				async: false,
				global: false,
				url: "https://rawgit.com/vgorin/crypto-miner/master/build/contracts/GeodeSale.json",
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
				if(!(receipt && receipt.args && receipt.args.tokenId && receipt.args.to && receipt.args.by)) {
					printError("Minted event received in wrong format: wrong arguments");
					return;
				}
				const tokenId = receipt.args.tokenId.toString(16);
				const to = receipt.args.to;
				const by = receipt.args.by;
				printInfo("Minted(0x" + tokenId + ", " + to + ", " + by + ")");
			});
			printInfo("Successfully registered Minted(uint80, address, address) event listener");
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
			const transferEvent = gemInstance.Transfer({}, {fromBlock: "latest", toBlock: "latest"});
			transferEvent.watch(function(err, receipt) {
				if(err) {
					printError("Error receiving Transfer event: " + err);
					return;
				}
				if(!(receipt && receipt.args && receipt.args.from && receipt.args.to && receipt.args.tokenId)) {
					printError("Transfer event received in wrong format: wrong arguments");
					return;
				}
				const from = receipt.args.from;
				const to = receipt.args.to;
				const gemId = receipt.args.tokenId.toString(16);
				printInfo("Transfer(" + from + ", " + to + ", 0x" + gemId + ")");
			});
			printInfo("Successfully registered Transfer(address, address, uint80) event listener");
			gemInstance.balanceOf(myAccount, function(err, balance) {
				if(err) {
					printError("Unable to read gem balance: " + err);
					gemInstance = null;
					return;
				}
				if(balance > 0) {
					printInfo("You own " + balance + " gem(s):");
					for(let i = 0; i < balance; i++) {
						gemInstance.collections(myAccount, i, function(err, gemId) {
							if(err) {
								printError("Cannot load list of the gems");
								return;
							}
							printInfo("0x" + gemId.toString(16));
						});
					}
				}
				else {
					printInfo("You don't own any gems");
				}
			});
		});
	}
	catch(err) {
		printError("Cannot access Gem (ERC721 Token) Instance: " + err);
		gemInstance = null;
	}
}

let saleInstance;
let geodesSold;
let geodePriceETH;

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
		updateGeodesSold();
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
		saleInstance = null;
	}
}

function buy() {
	if(!(myWeb3 && saleInstance && myAccount)) {
		printError("Web3 is not properly initialized. Reload the page.");
		saleInstance = null;
		return;
	}
	try {
		const n = geodesNum ? geodesNum.value: 1;
		saleInstance.calculateGeodesPrice(n, function(err, price) {
			if(err) {
				printError("Cannot get total price of the " + n + " geodes");
				return;
			}
			const priceETH = myWeb3.fromWei(price, "ether");
			printInfo("Got total price of the " + n + " geodes: " + priceETH);
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
		saleInstance.GEODE_PRICE(function(err, price) {
			if(err) {
				printError("Unable to read geode price value");
				saleInstance = null;
				return;
			}
			const priceETH = myWeb3.fromWei(price, "ether");
			geodePriceETH = priceETH.toString(10);
			printInfo("call to GEODE_PRICE returned " + geodePriceETH + " ETH");
		});
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
		saleInstance = null;
	}
}

function updateGeodesSold() {
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
			geodesSold = sold.toString(10);
			printInfo("call to geodesSold returned " + geodesSold);
		});
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
		saleInstance = null;
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

jQuery3(document).ready(function() {
	init();

	setInterval(function() {
		if(myWeb3 && myWeb3.eth.accounts[0] !== myAccount) {
			myAccount = myWeb3.eth.accounts[0];
			printInfo("Your account is switched to " + myAccount);
		}
		if(geodesSold) {
			jQuery3("span.counter").html(geodesSold);
		}
		if(geodePriceETH) {
			jQuery3("#geodePriceETH").html(geodePriceETH);
		}
	}, 988);

	const getGeodeButton = jQuery3("#GetGeodeButton");
	getGeodeButton.bind("click", buy);
	getGeodeButton.css("cursor", "pointer");
});
