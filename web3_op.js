function mint() {
	if(!(myWeb3 && gemABI && myAccount && gemInstance)) {
		printError("Not connected to a Gem (ERC721 Token) Instance");
		return;
	}
	const gemId = document.getElementById("mint_gem_id").value;
	const owner = document.getElementById("mint_owner").value;
	if(!myWeb3.isAddress(owner)) {
		printError("Please provide a valid Gem Owner Address");
		return;
	}
	gemInstance.exists(gemId, function(err, exists) {
		if(err) {
			printError("Cannot check if gem doesn't exist: " + err);
			return;
		}
		if(exists) {
			printError("Gem " + gemId + " already exists!");
			return;
		}
		gemInstance.mint.sendTransaction(gemId, owner, function(err, txHash) {
			if(err) {
				printError("Mint transaction failed: " + err.toString().split("\n")[0]);
				return;
			}
			printInfo("Mint transaction sent: " + txHash);
		});
	});
}

function burn() {
	if(!(myWeb3 && gemABI && myAccount && gemInstance)) {
		printError("Not connected to a Gem (ERC721 Token) Instance");
		return;
	}
	const gemId = document.getElementById("burn_gem_id").value;
	gemInstance.exists(gemId, function(err, exists) {
		if(err) {
			printError("Cannot check if gem exists: " + err);
			return;
		}
		if(!exists) {
			printError("Gem " + gemId + " doesn't exist!");
			return;
		}
		gemInstance.burn.sendTransaction(gemId, function(err, txHash) {
			if(err) {
				printError("Burn transaction failed: " + err.toString().split("\n")[0]);
				return;
			}
			printInfo("Burn transaction sent: " + txHash);
		});
	});
}

function transfer() {
	if(!(myWeb3 && gemABI && myAccount && gemInstance)) {
		printError("Not connected to a Gem (ERC721 Token) Instance");
		return;
	}
	const gemId = document.getElementById("transfer_gem_id").value;
	const to = document.getElementById("transfer_to").value;
	if(!myWeb3.isAddress(to)) {
		printError("Please provide a valid Transfer To Address");
		return;
	}
	gemInstance.exists(gemId, function(err, exists) {
		if(err) {
			printError("Cannot check if gem exists: " + err);
			return;
		}
		if(!exists) {
			printError("Gem " + gemId + " doesn't exist!");
			return;
		}
		gemInstance.ownerOf(gemId, function(err, owner) {
			if(err) {
				printError("Cannot get the owner a gem: " + err);
				return;
			}
			if(owner !== myAccount) {
				printError("You cannot transfer other's owner gem. Gem " + gemId + " belongs to " + owner);
				return;
			}
			gemInstance.transfer.sendTransaction(to, gemId, function(err, txHash) {
				if(err) {
					printError("Transfer transaction failed: " + err.toString().split("\n")[0]);
					return;
				}
				printInfo("Transfer transaction sent: " + txHash);
			});
		});
	});
}
