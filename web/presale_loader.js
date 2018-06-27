// inject all the required modal windows
document.write(`
<div id="geode_qty_modal" class="overlay">
	<a class="cancel" href="javascript:history.back()"></a>
	<div class="modal">
		<h3>Buying Geodes</h3>
		<div class="content">
			<select id="NumberOfGeodes" name="NumberOfGeodes" title="Number of Geodes" style="width: 100%; margin: 1em 0 2em 0;">
				<option value="1">1</option>
				<option value="2">2</option>
				<option value="3">3</option>
				<option value="4">4</option>
				<option value="5">5 (+1 free Gem)</option>
				<option value="6">6 (+1 free Gem)</option>
				<option value="7">7 (+1 free Gem)</option>
				<option value="8">8 (+1 free Gem)</option>
				<option value="9">9 (+1 free Gem)</option>
				<option value="10">10 (+1 free Gem, +1 free Geode)</option>
			</select>
			<input type="button" value="Buy" onclick="buyGeodes()" style="width: 100%;"/>
		</div>
	</div>
</div>
<div id="gem_modal" class="overlayGemModalWorkshop">
	<a class="cancel" href="javascript:history.back()"></a>
	<div class="modal">
		<div class="content">
			<img id="picture" class="centerImg" src= IMAGE_BASE + "Ame-1-D.png"/>
			<table class=gemModalFooterTable>
				<tr >
				<td class="gemInfoModalWorkshop">
					Mining rate – <span id="mining_rate">25%</span>
				</td>
				<td class="energyGemInfoModalWorkshop" id="energy_level">
					Energy level – 0%
				</td>
				<td class="gemInfoModalWorkshop">
					Grade <span id="grade_type">B</span>
				</td>
				<td class="gemInfoModalWorkshop" id="level">
					Baby, Level 1
				</td>
				<td class="gemInfoModalWorkshop" id="color">
					Amethyst (Febuary)
				</td></tr>
			</table>
		</div>
	</div>
</div>
<div id="geode_bought_modal" class="overlay">
	<a class="cancel" href="javascript:history.back()"></a>
	<div class="modal">
		<div class="content">
			<h1>Purchase Complete!</h1>
			<h5 style="margin: 1em 0 2em 0;">
				Successfully bought <span class="geodes_bought"></span> geode(s)<br/>
				(and <span class="geodes_bought"></span> Founders Plot of Land),<br/>
				containing <span class="gems_received"></span> gems
			</h5>
			<input id="goto_workshop_btn" type="button" value="" onclick="location.href = '/workshop';"/>
		</div>
	</div>
</div>
<div id="metamask_info_modal" class="overlay">
	<a class="cancel" href="javascript:history.back()"></a>
	<div class="modal">
		<div class="content">
			<h1>MetaMask Required</h1>
			<h5 style="margin: 1em 0 2em 0;">
				Seems like you don't have MetaMask installed. Click the button below for more info.
			</h5>
			<input type="button" value="More Info" onclick="location.href = 'https://www.cryptominerworld.com/game_info#GameInfoMetaMask';"/>
		</div>
	</div>
</div>
<div id="wrong_network_modal" class="overlay">
	<a class="cancel" href="javascript:history.back()"></a>
	<div class="modal">
		<div class="content">
			<h1>Wrong Network</h1>
			<h5 style="margin: 1em 0 2em 0;">
				Seems like you are connected to a wrong network. Please connect to network <span id="required_network_id">1: Mainnet</span>
			</h5>
			<input type="button" value="More Info" onclick="location.href = 'https://www.cryptominerworld.com/game_info#GameInfoMetaMask';"/>
		</div>
	</div>
</div>
<div id="add_coupon_modal" class="overlay">
	<a class="cancel" href="javascript:history.back()"></a>
	<div class="modal">
		<h3>Adding a Coupon</h3>
		<div class="content">
			<input id="coupon_code" type="text" value="" placeholder="Coupon Code" style="width: 100%; margin: 1em 0;"/><br/>
			<input id="free_gems" type="number" min="1" max="50" placeholder="Free Gems it Contains" style="width: 100%; margin: 1em 0 2em 0;"/><br/>
			<input type="button" value="Add a Coupon" onclick="addCoupon()" style="width: 100%;"/>
		</div>
	</div>
</div>
<div id="use_coupon_modal" class="overlay">
	<a class="cancel" href="javascript:history.back()"></a>
	<div class="modal">
		<h3>Using a Coupon</h3>
		<div class="content">
			<input id="use_coupon" type="text" value="" placeholder="Coupon Code" style="width: 100%; margin: 1em 0 2em 0;"/><br/>
			<input type="button" value="Use this Coupon" onclick="useCoupon()" style="width: 100%;"/>
		</div>
	</div>
</div>

`);

const WEB_BASE = "https://rawgit.com/CryptoMinerWorld/crypto-miner/master/web/";
const IMAGE_BASE = "https://www.cryptominerworld.com/wp-content/uploads/Temp_Gems/";
const THUMB_BASE = "https://www.cryptominerworld.com/wp-content/uploads/Temp_Gems/Temp_Gems-Thumbnails/";
const MIS_IMG_BASE = "https://www.cryptominerworld.com/wp-content/uploads/Imgs_for_presale_code_import/";

const REQUIRED_NETWORK_ID = 4;
const REQUIRED_NETWORK_NAME = "4: Rinkeby";

const jQuery3 = jQuery.noConflict();

// configure bootstrap notify instance
jQuery3.notifyDefaults({
	placement: {
		from: "bottom",
		align: "right"
	},
	delay: 8192,
	template: `
	<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">
		<span data-notify="icon"></span>
		<span data-notify="title">{1}</span>
		<span data-notify="message">{2}</span>
		<div class="progress" data-notify="progressbar">
			<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0;"></div>
		</div>
		<a href="{3}" target="{4}" data-notify="url"></a>
	</div>
`
});

// define a logger
const logger = {
	error: function(...msg) {
		jQuery3.notify(msg.join("").replace(/\n/g, '<br/>'), {
			type: "danger",
			delay: 8500,
		});
	},
	warning: function(...msg) {
		jQuery3.notify(msg.join("").replace(/\n/g, '<br/>'), {
			type: "warning",
			delay: 5500,
		});
	},
	success: function(...msg) {
		jQuery3.notify(msg.join("").replace(/\n/g, '<br/>'), {
			type: "success",
			delay: 1500,
		});
	},
};

// create an API client
const presale = new PresaleApi(logger, jQuery3);

function addCoupon() {
	const code = document.getElementById("coupon_code").value;
	const freeGems = document.getElementById("free_gems").value;

	const errCode = presale.addCoupon(code, freeGems, function(err, result) {
		if(err || err > 0) {
			return;
		}
		if(result.event === "transaction_sent") {
			logger.success("Add Coupon transaction sent")
		}
	});
	if(errCode > 0) {
		alert("Error: " + errCode);
	}
}

function useCoupon() {
	const code = document.getElementById("use_coupon").value;

	const errCode = presale.useCoupon(code, function(err, result) {
		if(err || err > 0) {
			return;
		}
		if(result.event === "transaction_sent") {
			logger.success("Use Coupon transaction sent")
		}
	});
	if(errCode > 0) {
		alert("Error: " + errCode);
	}

	// hide the modal
	location.href = "#";
}

function buyGeodes() {
	const qty = jQuery3("#NumberOfGeodes").val();
	const errCode = presale.buyGeodes(qty, function (err, result) {
		if(err || err > 0) {
			return;
		}
		if(result.event === "transaction_sent") {
			logger.success("Buy Geode(s) transaction sent")
		}
	});
	if(errCode > 0) {
		location.href = "https://www.cryptominerworld.com/game_info#GameInfoMetaMask";
	}
	// hide the modal
	location.href = "#";
}

jQuery3(document).ready(function() {
	function load_and_reload_default_counters() {
		load_default_counters();
		setTimeout(load_default_counters, 1023);
	}

	function load_default_counters() {
		jQuery3.ajax({
			global: false,
			url: WEB_BASE + "presale-status.json",
			dataType: "json",
			success: function(data, textStatus, jqXHR) {
				console.log("successfully loaded default presale JSON: " + data);
				update_counters(data);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				logger.error("could not load default presale status JSON: " + errorThrown)
			}
		});
	}

	function update_counters(data) {
		jQuery3(".counter").html(data.left);
		jQuery3("#geodePriceETH").html(data.currentPrice);
	}

	function workshop_loading() {
		jQuery3("#WorkshopLoading").show();
		jQuery3("#WorkshopNoGems").hide();
		jQuery3("#WorkshopNoMetamask").hide();
		jQuery3("#WorkshopMetamaskLocked").hide();
		jQuery3("#WorkshopWrongNetwork").hide();
	}

	function workshop_no_web3() {
		jQuery3("#WorkshopLoading").hide();
		jQuery3("#WorkshopNoGems").hide();
		jQuery3("#WorkshopNoMetamask").show();
		jQuery3("#WorkshopMetamaskLocked").hide();
		jQuery3("#WorkshopWrongNetwork").hide();
	}

	function workshop_account_locked() {
		jQuery3("#WorkshopLoading").hide();
		jQuery3("#WorkshopNoGems").hide();
		jQuery3("#WorkshopNoMetamask").hide();
		jQuery3("#WorkshopMetamaskLocked").show();
		jQuery3("#WorkshopWrongNetwork").hide();
	}

	function workshop_no_gems() {
		jQuery3("#WorkshopLoading").hide();
		jQuery3("#WorkshopNoGems").show();
		jQuery3("#WorkshopNoMetamask").hide();
		jQuery3("#WorkshopMetamaskLocked").hide();
		jQuery3("#WorkshopWrongNetwork").hide();
	}

	function workshop_wrong_network(actual, required) {
		jQuery3("#WorkshopLoading").hide();
		jQuery3("#WorkshopNoGems").hide();
		jQuery3("#WorkshopNoMetamask").hide();
		jQuery3("#WorkshopMetamaskLocked").hide();
		jQuery3("#WorkshopWrongNetwork").show();
	}

	function workshop_display_gems(collection) {
		workshop_loading();

		// ========= START: Draw Gems in a Table =========
		collection.sort((x, y) => {
			return y.id - x.id;
		});
		const columns = 4;
		const rows = Math.ceil(collection.length / columns);
		let html = "";
		html += '<h1 id="my_geodes_header">'+ collection.length + ' - Gemstone Worker Buddies</h1>';
		html += '<h1 id="my_geodes_subheader"></h1>';
		html += `
			<div id="gem_sorting_options">
				<select id="gem_sorting_by">
					<option value="">Sort By</option>
					<option value="id">Date</option>
					<option value="grade">Grade</option>
					<option value="level">Age(Lvl)</option>
					<option value="color">Color</option>
				</select>
				&nbsp &nbsp &nbsp &nbsp &nbsp 
				<select id="gem_sorting_order">
					<option value="asc">Ascending</option>
					<option value="desc">Descending</option>
				</select>
			</div>
			<table id="my_geodes">
			`;

		function compile_gem_html(gem) {
			// inject gem data
			const colorId = gem.colorId;
			const levelId = gem.levelId;
			const gradeType = gem.gradeType;
			const gradeValue = gem.gradeValue;
			const miningRate = baseRate(gradeType) + gradeValue / 20;

			const color = colorName(colorId);
			const level = levelName(levelId);
			const grade = gradeName(gradeType);
			const thumbnail = gemThumbnailURL(color, level, grade);

			return `
				<a href="javascript:display_gem(\'` + gem.id + `\', \'` + color + `\', \'` + level + `\', \'` + grade + `\', \'` + miningRate + `\')">
					<img style="padding: 0;" width="250" height="250" src="` + thumbnail + `"/>
				</a><br/>Lvl ` + levelId + ` ` + color.substr(0, color.indexOf(" ")) + `<br/>Grade ` + grade + ` - ` + miningRate + `%
			`;
		}

		for(let i = 0; i < rows; i++) {
			html += "<tr>\n";
			for(let j = 0; j < columns; j++) {
				const idx = i * columns + j;
				if(idx < collection.length) {
					html += "\t<td id='" + idx + "'>\n";

					// inject gem data
					html += compile_gem_html(collection[idx]);
				}
				else {
					html += "\t<td>\n";
				}
			}
			html += "</tr>\n";
		}
		html += "</table>\n";
		jQuery3("#WorkshopLoading").parent().html(html);
		function sort(by, order) {
			const byId = (x, y) => {
				return x.id - y.id;
			};
			const byColor = (x, y) => {
				return x.colorId - y.colorId;
			};
			const byLevel = (x, y) => {
				return x.levelId - y.levelId;
			};
			const byGradeType = (x, y) => {
				return x.gradeType - y.gradeType;
			};
			const byGradeValue = (x, y) => {
				return x.gradeValue - y.gradeValue;
			};
			let fn;
			switch(by) {
				case "id": fn = byId; break;
				case "color": fn = (x, y) => {
					return byColor(x, y) * 0x100000 + byLevel(x, y) * 0x10000 + byGradeType(x, y) * 0x100 + byGradeValue(x, y);
				}; break;
				case "level": fn = (x, y) => {
					return byLevel(x, y) * 0x100000 + byGradeType(x, y) * 0x1000 + byGradeValue(x, y) * 0x10 + byColor(x, y);
				}; break;
				case "grade": fn = (x, y) => {
					return byGradeType(x, y) * 0x10000 + byGradeValue(x, y) * 0x100 + byLevel(x, y) * 0x10 + byColor(x, y);
				}; break;
			}
			if(fn) {
				const cmp = order.toLowerCase().startsWith("asc")? fn: (x, y) => {
					return -1 * fn(x, y);
				};
				collection.sort(cmp);
				for(let i = 0; i < collection.length; i++) {
					document.getElementById("" + i).innerHTML = compile_gem_html(collection[i]);
				}
			}
		}
		const srt_by_selector = jQuery3("#gem_sorting_by");
		const srt_order_selector = jQuery3("#gem_sorting_order");
		srt_by_selector.on("change", function(e) {
			const by = this.value;
			const order = srt_order_selector.val();
			sort(by, order);
		});
		srt_order_selector.on("change", function(e) {
			const by = srt_by_selector.val();
			const order = this.value;
			sort(by, order);
		});
		// =========  END:  Draw Gems in a Table =========

	}

	// init the Presale API
	const errorCode = presale.init(
		// token address
		{
			address: "0x781ab793204dbd066882715d8aa5126c1e67ad5c",
			abi_url: WEB_BASE + "abi/ERC721.json"
		},
		// presale address
		{
			address: "0x40a39474edb0c1c13d993f3a0daf090119af0d54",
			abi_url: WEB_BASE + "abi/Presale.json"
		},
		// callback handler
		function(errCode, result) {
			if(errCode > 0) {
				// update workshop page to look properly
				if(presale.getNetworkId() != REQUIRED_NETWORK_ID) {
					workshop_wrong_network(presale.getNetworkName(), REQUIRED_NETWORK_NAME);
				}
				else {
					workshop_account_locked();
				}
				load_and_reload_default_counters();
				return;
			}

			// load counters (presale state)
			presale.presaleState(function(err, result) {
				if(err || err > 0) {
					load_and_reload_default_counters();
					return;
				}
				update_counters(result);
				setTimeout(update_counters, 1023, result);
			});

			// load workshop
			function reload_workshop() {
				presale.getCollection(function(err, result) {
					if(err || err > 0) {
						return;
					}
					if(result.length > 0) {
						// display the collection of gems
						workshop_display_gems(result);

						// inject number of geodes owned
						presale.getGeodeBalance(function(err, result) {
							if(err || err > 0) {
								return;
							}
							jQuery3("#my_geodes_subheader").html(result + " - Founders Plot" + (result > 1? "s": "") + " of Land");
						});
					}
					else {
						// display "no gems" screen
						workshop_no_gems();
					}
				});
			}
			reload_workshop();

			// update counters each time a PresaleStateChanged event is received
			presale.registerPresaleStateChangedEventListener(function(err, result) {
				if(err || err > 0) {
					return;
				}
				update_counters(result);
				reload_workshop();
			});

			// show success notification when coupon is created
			presale.registerCouponAddedEventListener(function(err, result) {
				if(err || err > 0) {
					return;
				}
				logger.success("coupon added (expires ", result.expires, ")");
			});

			// show success notification when coupon is consumed
			presale.registerCouponConsumedEventListener(function(err, result) {
				if(err || err > 0) {
					return;
				}
				logger.success("received ", result.gems, " free gem(s)");
			});

			// show success notification when geode is bought
			presale.registerPurchaseCompleteEventListener(function(err, result) {
				if(err || err > 0) {
					return;
				}
				logger.success("successfully bought ", result.geodes, " geode(s) (" + result.gems + " gems)");
				display_geode_bought_modal(result.geodes, result.gems);
			});

		}
	);

	// MetaMask is not installed, display proper workshop screen
	if(errorCode > 0) {
		workshop_no_web3();
		load_and_reload_default_counters();
	}

	// bind an action to a "get geodes button"
	jQuery3("#GetGeodeButton").css("cursor", "pointer").on("click", function () {
		if(presale.getWeb3()) {
			if(presale.getNetworkId() == REQUIRED_NETWORK_ID) {
				location.href = "#geode_qty_modal";
			}
			else {
				jQuery3("#required_network_id").html(REQUIRED_NETWORK_NAME);
				location.href = "#wrong_network_modal";
			}
		}
		else {
			location.href = "#metamask_info_modal";
		}
	});

});

// Auxiliary function to open a pop up when geode is bought
function display_geode_bought_modal(geodes, gems) {
	jQuery3(".geodes_bought").html(geodes);
	jQuery3(".gems_received").html(gems);
	if(location.pathname.indexOf("geode_sale") >= 0) {
		location.href = "#geode_bought_modal";
	}
}

// Auxiliary functions to draw gems list in a workshop
function display_gem(gemId, color, level, grade, miningRate) {
	console.log("display_gem(%s, %s, %s, %s, %s)", gemId, color, level, grade, miningRate);
	jQuery3("#gem_modal #level").html(level);
	jQuery3("#gem_modal #color").html(color);
	jQuery3("#gem_modal #grade_type").html(grade);
	jQuery3("#gem_modal #mining_rate").html(miningRate + "%");
	jQuery3("#gem_modal #energy_level").html(grade.startsWith("A")? "Energy level – calculating...": "");
	jQuery3("#gem_modal #picture").each(function(i, e) {
		e.src = gemURL(color, level, grade);
		e.onload = function() {
			location.href = "#gem_modal";
		}
	});
	if(grade.startsWith("A")) {
		presale.getTokenCreationTime(gemId, function(err, result) {
			if(err || err > 0) {
				return;
			}
			const ageSeconds = (Date.now() / 1000 | 0) - result;
			const oneMonthSeconds = 30 * 24 * 3600;
			let energyLevel = Math.round(100 * ageSeconds / oneMonthSeconds);
			if(energyLevel > 100) {
				energyLevel = 100;
			}
			jQuery3("#gem_modal #energy_level").html("Energy level – " + energyLevel + "%");
		});
	}
}

function preloadGemGraphics() {
	const thumbs = [];
	for(let colorIdx = 1; colorIdx <= 6; colorIdx++) {
		for(let levelId = 1; levelId <= 2; levelId++) {
			for(let gradeType = 1; gradeType <= 6; gradeType++) {
				const thumb = new Image();
				const color = colorName(((7 + colorIdx) % 12) + 1);
				const level = levelName(levelId);
				const grade = gradeName(gradeType);
				thumb.src = gemThumbnailURL(color, level, grade);
				thumb.onload = function() {
					console.log(thumb.src + " thumbnail loaded successfully");
				};
				thumbs.push(thumb);
			}
		}
	}
}

// preload gems images
preloadGemGraphics();

function colorName(colorId) {
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

function levelName(levelId) {
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

function gradeName(gradeType) {
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

function baseRate(gradeType, gradeValue) {
	switch(gradeType) {
		case 1: return 0;
		case 2: return 5;
		case 3: return 15;
		case 4: return 30;
		case 5: return 50;
		case 6: return 75;
	}
}

function gemThumbnailURL(color, level, grade) {
	return THUMB_BASE + color.substr(0, 3) + "-" + level.substr(-1, 1) + "-" + grade + "-250.png";
}

function gemURL(color, level, grade) {
	return IMAGE_BASE + color.substr(0, 3) + "-" + level.substr(-1, 1) + "-" + grade + ".png";
}
