const jQuery3 = jQuery.noConflict();

const con = document.getElementById("console");
const tok = document.getElementById("TokenAddress");
const sale = document.getElementById("SaleAddress");
const tokAddr = "0xb9fd306efe737736a05a9d558543ec848b8a245c";
const saleAddr = "0x9042ef6d8e62ac84d45558c2de0aacae07efbf18";

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
		printLog("Web3 integration loaded.");
		printLog("Your account is " + myAccount);
		myWeb3.eth.getBalance(myAccount, function(err, balance) {
			if(err) {
				printError("getBalance() error: " + err);
				return;
			}
			if(balance > 0) {
				printLog("Your balance is " + myWeb3.fromWei(balance, 'ether'));
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
					printLog("Gem ABI loaded successfully");
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
					printLog("GeodeSale ABI loaded successfully");
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
		printError("Page is not properly initialized. Reload the page.");
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
			printLog("Successfully connected to Gem (ERC721 Token) Instance at " + tokenAddress);
			const mintEvent = gemInstance.Minted();
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
				printLog("Minted(0x" + tokenId + ", " + to + ", " + by + ")");
			});
			printLog("Successfully registered Minted(uint80, address, address) event listener");
			const burnEvent = gemInstance.Burnt();
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
				printLog("Burnt(0x" + tokenId + ", " + from + ", " + by + ")");
			});
			printLog("Successfully registered Burnt(uint80, address, address) event listener");
			const transferEvent = gemInstance.Transfer();
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
				printLog("Transfer(" + from + ", " + to + ", 0x" + gemId + ")");
			});
			printLog("Successfully registered Transfer(address, address, uint80) event listener");
			gemInstance.balanceOf(myAccount, function(err, balance) {
				if(err) {
					printError("Unable to read gem balance: " + err);
					gemInstance = null;
					return;
				}
				if(balance > 0) {
					printLog("You own " + balance + " gem(s):");
					for(let i = 0; i < balance; i++) {
						gemInstance.collections(myAccount, i, function(err, gemId) {
							if(err) {
								printError("Cannot load list of the gems");
								return;
							}
							printLog("0x" + gemId.toString(16));
						});
					}
				}
				else {
					printLog("You don't own any gems");
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
		printError("Page is not properly initialized. Reload the page.");
		gemInstance = null;
		return;
	}
	const saleAddress = sale ? sale.value : saleAddr;
	saleInstance = saleABI.at(saleAddress);
	saleInstance.GEODE_PRICE(function(err, price) {
		if(err) {
			printError("Unable to read geode price value");
			saleInstance = null;
			return;
		}
		const priceETH = myWeb3.fromWei(price, "ether");
		printLog("Geode price is " + price + " wei (" + priceETH + " ETH)");
		geodePriceETH = priceETH.toString(10);
		saleInstance.geodesSold(function(err, sold) {
			if(err) {
				printError("Unable to read geodes sold value: " + err);
				saleInstance = null;
				return;
			}
			printLog(sold + " geodes sold");
			geodesSold = sold.toString(10);
		});
	});
}

function buy() {
	connect_sale();

	if(!(myWeb3 && saleInstance && myAccount)) {
		printError("Page is not properly initialized. Reload the page.");
		saleInstance = null;
		return;
	}
	try {
		saleInstance.getGeodes.sendTransaction({value: 100000000000000000}, function(err, txHash) {
			if(err) {
				printError("Transaction failed: " + err.toString().split("\n")[0]);
				return;
			}
			printLog("Transaction sent: " + txHash);
		});
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
	}
}

function printLog(msg) {
	console.log(msg);
	if(con) {
		con.innerHTML += msg;
		con.innerHTML += "\n";
	}
}

function printError(msg) {
	console.error(msg);
	if(con) {
		con.innerHTML += '<span style="color: red;">' + msg + '</span>';
		con.innerHTML += "\n";
	}
}

jQuery3(document).ready(function() {
	init();

	setInterval(function() {
		if(myWeb3 && myWeb3.eth.accounts[0] !== myAccount) {
			myAccount = myWeb3.eth.accounts[0];
			printLog("Your account is switched to " + myAccount);
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
