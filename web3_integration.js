const jQuery3 = jQuery.noConflict();

const con = document.getElementById("console");

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
				url: "https://cdn.rawgit.com/vgorin/crypto-miner/master/build/contracts/Gem.json",
				dataType: "json",
				success: function(data, textStatus, jqXHR) {
					printLog("Gem ABI loaded successfully");
					gemABI = myWeb3.eth.contract(data.abi);
				},
				error: function(jqXHR, textStatus, errorThrown) {
					printError("Cannot load Gem ABI: " + errorThrown);
				}
			});
			jQuery3.ajax({
				async: false,
				global: false,
				url: "https://cdn.rawgit.com/vgorin/crypto-miner/master/build/contracts/GeodeSale.json",
				dataType: "json",
				success: function(data, textStatus, jqXHR) {
					printLog("GeodeSale ABI loaded successfully");
					saleABI = myWeb3.eth.contract(data.abi);
				},
				error: function(jqXHR, textStatus, errorThrown) {
					printError("Cannot load GeodeSale ABI: " + errorThrown);
				}
			});
		})
	});
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

init();

setInterval(function() {
	if(myWeb3 && myWeb3.eth.accounts[0] !== myAccount) {
		myAccount = myWeb3.eth.accounts[0];
		printLog("Your account is switched to " + myAccount);
	}
}, 988);

