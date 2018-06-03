// inject all the required modal windows
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
				<option value="10">10 (+1 free Gem, +1 free Geode)</option>
			</select>
			<input type="button" value="Buy" onclick="buyGeodes()" style="width: 100%; height: 2em;"/>
		</div>
	</div>
</div>
<div id="gem_modal" class="overlay">
	<a class="cancel" href="#"></a>
	<div class="modal" style="margin-top: 120px; width: 800px;">
		<div class="content">
			<table>
				<tr><td style="padding: 0; width: 500px;">
					<img id="picture" width="500" height="500" src="gems/Ame 1 A.png"/>
				</td><td style="vertical-align: middle;">
					<h1>Tipsy Pete</h1>
					<h4>Mining rate – <span id="mining_rate">25%</span></h4>
					<h4>Energy level – <span id="energy_level">100%</span></h4>
					<h4>Grade <span id="grade_type">B</span></h4>
					<h4 id="level">Baby, Level 1</h4>
					<h4 id="color">Amethyst (February)</h4>
				</td></tr>
			</table>
		</div>
	</div>
</div>
`);

const WEB_BASE = "https://rawgit.com/CryptoMinerWorld/crypto-miner/master/web/";

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
				logger.info("successfully loaded default presale JSON: " + data);
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
		jQuery3("#pg-951-0").show();
		jQuery3("#pg-951-1").hide();
		jQuery3("#pg-951-2").hide();
		jQuery3("#pg-951-3").hide();
	}

	function workshop_no_web3() {
		jQuery3("#pg-951-0").hide();
		jQuery3("#pg-951-1").hide();
		jQuery3("#pg-951-2").show();
		jQuery3("#pg-951-3").hide();
	}

	function workshop_account_locked() {
		jQuery3("#pg-951-0").hide();
		jQuery3("#pg-951-1").hide();
		jQuery3("#pg-951-2").hide();
		jQuery3("#pg-951-3").show();
	}

	function workshop_no_gems() {
		jQuery3("#pg-951-0").hide();
		jQuery3("#pg-951-1").show();
		jQuery3("#pg-951-2").hide();
		jQuery3("#pg-951-3").hide();
	}

	function workshop_display_gems(collection) {
		workshop_loading();

		// ========= START: Draw Gems in a Table =========
		const columns = 4;
		const rows = Math.ceil(collection.length / columns);
		let html = "";
		html += '<h1 id="my_geodes_header">' + collection.length + ' gems in your collection</h1>';
		html += '<h3 id="my_geodes_subheader"></h3>';

		// gem sorting controls
		html += `
			<div id="gem_sorting_options">sort by
				<select id="gem_sorting_selector" onchange="alert('sorting - ' + this.value);">
					<option value="color">Color</option>
					<option value="level">Level</option>
					<option value="grade">Grade</option>
				</select>
			</div>`;

		html += '<table id="my_geodes">\n';
		for(let i = 0; i < rows; i++) {
			html += "<tr>\n";
			for(let j = 0; j < columns; j++) {
				const idx = i * columns + j;
				if(idx < collection.length) {
					const gemId = collection[idx].id;
					html += "\t<td id='" + gemId + "'>\n";

					// inject gem data
					const colorId = collection[idx].colorId;
					const levelId = collection[idx].levelId;
					const gradeType = collection[idx].gradeType;
					const gradeValue = collection[idx].gradeValue;
					const miningRate = baseRate(gradeType) + gradeValue / 20;

					const color = colorName(colorId);
					const level = levelName(levelId);
					const grade = gradeName(gradeType);
					const thumbnail = gemThumbnailURL(color, level, grade);

					html += '<a href="javascript:display_gem(\'' + gemId +'\', \'' + color + '\', \'' + level + '\', \'' + grade + '\', \'' + miningRate + '\')">';
					html += '<img style="padding: 0;" width="250" height="250" src="' + thumbnail + '"/></a><br/>\n';
					html += "Lv." + levelId + " " + color.substr(0, color.indexOf(" ")) + " " + grade + " " + miningRate + "%";
				}
				else {
					html += "\t<td>\n";
				}
			}
			html += "</tr>\n";
		}
		html += "</table>\n";
		jQuery3("#pg-951-0").html(html);
		// =========  END:  Draw Gems in a Table =========

	}

	// init the Presale API
	const errorCode = presale.init(
		// token address
		{
			address: "0xb42aab57c4406b19518204c055f273c7acd84ed6",
			abi_url: WEB_BASE + "abi/ERC721.json"
		},
		// presale address
		{
			address: "0xfd6c69a612911b2a918ce8fd3d9c174921d359b9",
			abi_url: WEB_BASE + "abi/Presale.json"
		},
		// callback handler
		function(errCode, result) {
			if(errCode > 0) {
				// update workshop page to look properly
				workshop_account_locked();
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
							jQuery3("#my_geodes_subheader").html(result + " plot(s) of land");
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

			// show success notification when geode is bought
			presale.registerPurchaseCompleteEventListener(function(err, result) {
				if(err || err > 0) {
					return;
				}
				logger.success("successfully bought ", result.geodes, " geode(s) (" + result.gems + " gems)");
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
			location.href = "#geode_qty_modal";
		}
		else {
			location.href = "https://www.cryptominerworld.com/game_info#GameInfoMetaMask";
		}
	});

});

// Auxiliary functions to draw gems list in a workshop
function display_gem(gemId, color, level, grade, miningRate) {
	console.log("display_gem(%s, %s, %s, %s, %s)", gemId, color, level, grade, miningRate);
	jQuery3("#gem_modal #level").html(level);
	jQuery3("#gem_modal #color").html(color);
	jQuery3("#gem_modal #grade").html(grade);
	jQuery3("#gem_modal #mining_rate").html(miningRate + "%");
	jQuery3("#gem_modal #energy_level").html(grade.startsWith("A")? "calculating...": "0%");
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
			jQuery3("#gem_modal #energy_level").html(energyLevel + "%");
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
	return WEB_BASE + "gems/thumbnails/" + color.substr(0, 3) + " " + level.substr(-1, 1) + " " + grade + ".png";
}

function gemURL(color, level, grade) {
	return WEB_BASE + "gems/" + color.substr(0, 3) + " " + level.substr(-1, 1) + " " + grade + ".png";
}
