const jQuery3 = jQuery.noConflict();

const con = document.getElementById("console");
const tok = document.getElementById("TokenAddress");
const sale = document.getElementById("SaleAddress");
const tokAddr = "0xc169f76e51b0ea410a4e376a5335efbed5e198c2";
const saleAddr = "0xed2ca6f1bedd4f1e9ffef66a4845d496b7009221";

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
			printInfo("Successfully connected to Gem (ERC721 Token) Instance at " + tokenAddress);
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
				printSuccess("Minted(0x" + tokenId + ", " + to + ", " + by + ")");
			});
			printInfo("Successfully registered Minted(uint80, address, address) event listener");
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
				printSuccess("Burnt(0x" + tokenId + ", " + from + ", " + by + ")");
			});
			printInfo("Successfully registered Burnt(uint80, address, address) event listener");
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
				printSuccess("Transfer(" + from + ", " + to + ", 0x" + gemId + ")");
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
		printError("Page is not properly initialized. Reload the page.");
		gemInstance = null;
		return;
	}
	const saleAddress = sale ? sale.value : saleAddr;
	saleInstance = saleABI.at(saleAddress);
	try {
		const saleEvent = saleInstance.GeodeSold();
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
			printSuccess("GeodeSold(" + plotId + ", " + owner + ")");
		});
		printInfo("Successfully registered GeodeSold(uint16, address) event listener");
		saleInstance.GEODE_PRICE(function(err, price) {
			if(err) {
				printError("Unable to read geode price value");
				saleInstance = null;
				return;
			}
			const priceETH = myWeb3.fromWei(price, "ether");
			geodePriceETH = priceETH.toString(10);
			saleInstance.geodesSold(function(err, sold) {
				if(err) {
					printError("Unable to read geodes sold value: " + err);
					saleInstance = null;
					return;
				}
				geodesSold = sold.toString(10);
			});
		});
	}
	catch(e) {
		printError("Cannot access GeodeSale Instance: " + err);
		saleInstance = null;
	}
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
			printSuccess("Transaction sent: " + txHash);
		});
	}
	catch(err) {
		printError("Cannot access GeodeSale Instance: " + err);
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
	jQuery3.notify(msg, {
		type: "success",
		placement: {
			from: "bottom",
			align: "right"
		}
	});
}

function printError(msg) {
	console.error(msg);
	if(con) {
		con.innerHTML += '<span style="color: red;">' + msg + '</span>';
		con.innerHTML += "\n";
	}
	jQuery3.notify(msg, {
		type: "danger",
		placement: {
			from: "bottom",
			align: "right"
		}
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
