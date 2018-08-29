// inject all the required modal windows
document.write(`
<div id="geode_qty_modal" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<h1>Buying Geodes</h1>
		<div class="content">
			<select id="geodes_num" class="responsive_margin" style="margin-bottom: 1em;">
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
			<input type="text" id="referral_address" placeholder="Referral Address (Optional)"/>
			<span id="ref_addr_err_msg"></span>
			<input type="button" class="responsive_margin2" value="Buy" onclick="buyGeodes()" style="width: 100%;"/>
		</div>
	</div>
</div>
<div id="gem_modal" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<div class="content">
			<img id="picture" class="centerImg" src="https://www.cryptominerworld.com/wp-content/uploads/Temp_Gems/Top-1-C.png"/>
			<video id="video"
				autoplay loop muted preload="auto"
				style="display: none;"
				src=""
				poster="https://www.cryptominerworld.com/wp-content/uploads/Temp_Gems/Top-1-C.png">
				<source src="" type="video/mp4"/>
			</video>
			<table id="gemModalFooterTable">
				<tr><td class="gemInfoModalWorkshop">
					Mining rate &nbsp;+<span class="mining_rate">25%</span>
				</td><td class="energyGemInfoModalWorkshop energy_level">
					Energy level &nbsp;0%
				</td><td class="gemInfoModalWorkshop">
					Grade <span class="grade_type">B</span>
				</td><td class="gemInfoModalWorkshop level">
					Baby, Level 1
				</td><td class="gemInfoModalWorkshop color">
					Amethyst (Febuary)
				</td></tr>
			</table>
			<table id="gemModalFooterTableMobile">
				<tr><td class="gemInfoModalWorkshop">
					Mining rate &nbsp;+<span class="mining_rate">25%</span>
				</td></tr><tr><td class="energyGemInfoModalWorkshop energy_level">
					Energy level &nbsp;0%
				</td></tr><tr><td class="gemInfoModalWorkshop">
					Grade <span class="grade_type">B</span>
				</td></tr><tr><td class="gemInfoModalWorkshop level">
					Baby, Level 1
				</td></tr><tr><td class="gemInfoModalWorkshop color">
					Amethyst (Febuary)
				</td></tr>
			</table>
		</div>
	</div>
</div>
<div id="geode_bought_modal" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<div class="content">
			<h1>Purchase Complete!</h1>
			<h5 class="responsive_margin">
				Successfully bought <span class="geodes_bought"></span> geode<span class="geodes_bought_plural"></span><br/>
				containing <span class="gems_received"></span> gems<br/>
				and <span class="geodes_bought"></span> Founder&apos;s Plot<span class="geodes_bought_plural"></span> of Land
			</h5>
			<input id="goto_workshop_btn" type="button" value="" onclick="location.replace('/workshop');"/>
		</div>
	</div>
</div>
<div id="points_used_modal" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<div class="content">
			<h1><span class="coupons_used"></span> Points Used!</h1>
			<h5 class="responsive_margin">
				Successfully obtained<br/>
				<span id="points_geodes">
					<span id="geodes_obtained"></span> Geode<span id="geodes_obtained_plural"></span>
				</span>
				<span id="points_and"> and </span>
				<span id="points_gems">1 Gem</span>
			</h5>
			<input id="goto_workshop_btn" type="button" value="" onclick="location.replace('/workshop');"/>
		</div>
	</div>
</div>
<div id="no_metamask" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<div class="content">
			<h1>MetaMask Required</h1>
			<h5 class="responsive_margin">
				Seems like you don't have MetaMask installed. Click the button below for more info.
			</h5>
			<input type="button" value="More Info" onclick="location.replace('https://www.cryptominerworld.com/game_info#GameInfoMetaMask');"/>
		</div>
	</div>
</div>
<div id="locked_metamask" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<div class="content">
			<h1>MetaMask is Locked</h1>
			<h5 class="responsive_margin">
				Seems like your MetaMask is locked. Click the button below for more info.
			</h5>
			<input type="button" value="More Info" onclick="location.replace('https://www.cryptominerworld.com/game_info#GameInfoMetaMask');"/>
		</div>
	</div>
</div>
<div id="wrong_network_modal" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<div class="content">
			<h1>Wrong Network</h1>
			<h5 class="responsive_margin">
				Seems like you are connected to a wrong network. Please connect to network <span id="required_network_id">1: Mainnet</span>
			</h5>
			<input type="button" value="More Info" onclick="location.replace('https://www.cryptominerworld.com/game_info#GameInfoMetaMask');"/>
		</div>
	</div>
</div>
<div id="add_coupon_modal" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<h3>Adding a Coupon</h3>
		<div class="content">
			<input id="coupon_code" type="text" value="" placeholder="Coupon Code" style="margin: 1em 0;"/>
			<input type="button" value="Generate Random Code" onclick="document.getElementById('coupon_code').value = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);"/><br/>
			<select id="free_gems" class="responsive_margin" style="margin-bottom: 0;">
				<option value="">Free Gems it Contains</option>
				<option value="1">One (1)</option>
				<option value="3">Three (3)</option>
			</select><br/>
			<select id="free_geodes" class="responsive_margin">
				<option value="">Land Plots it Contains</option>
				<option value="0">None (0)</option>
				<option value="1">One (1)</option>
			</select><br/>
			<input type="button" value="Add a Coupon" onclick="addCoupon()" style="width: 100%;"/>
		</div>
	</div>
</div>
<div id="use_coupon_modal" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<h3>Using a Coupon</h3>
		<div class="content">
			<input id="use_coupon" type="text" value="" placeholder="Coupon Code" class="responsive_margin" style="width: 100%;"/><br/>
			<input type="button" value="Use this Coupon" onclick="useCoupon()" style="width: 100%;"/>
		</div>
	</div>
</div>
<div id="use_points_modal" class="overlay">
	<a class="cancel" href="javascript:location.replace('#')"></a>
	<div class="modal">
		<h1>Use Referral Points</h1>
		<div class="content">
			<table style="table-layout: fixed;">
				<tr><td>10 per Gem</td><td>20 per Geode</td></tr>
				<tr><td colspan="2"><input id="points_to_spend" type="range" min="0" max="10" step="10" value="0"/></td></tr>
				<tr><td colspan="2" style="text-align: center;"><span id="points_selected">0</span> points of <span id="points_available">10</span></td></tr>
				<tr><td><span id="referral_gems">No</span> Gem<span id="referral_gems_plural">s</span></td>
				<td><span id="referral_geodes">No</span> Geode<span id="referral_geodes_plural">s</span></td></tr>
				<tr><td colspan="2"><input id="use_points_btn" type="button" value="Buy" onclick="usePoints()" disabled/></td></tr>
			</table>
		</div>
	</div>
</div>

`);

const WEB_BASE = "https://rawgit.com/CryptoMinerWorld/crypto-miner/master/web/";
const IMAGE_BASE = "https://cryptominerworld.com/wp-content/uploads/Gem_Images/";
const THUMB_BASE = "https://cryptominerworld.com/wp-content/uploads/Gem_Images/Gem_Images_Thumbnails/";
const VIDEO_BASE = "https://www.cryptominerworld.com/wp-content/uploads/Gems_Video/";
const MIS_IMG_BASE = "https://www.cryptominerworld.com/wp-content/uploads/Imgs_for_presale_code_import/";

const TEST_MODE = location.search.indexOf("test_mode=true") > 0;
console.log("TEST_MODE: " + TEST_MODE);
const REQUIRED_NETWORK_ID = TEST_MODE? 4: 1;
const REQUIRED_NETWORK_NAME = TEST_MODE? "4: Rinkeby": "1: Mainnet";
const CONFIG = TEST_MODE?
{
	// Rinkeby Settings
	token: {
		address: "0x82ff6bbd7b64f707e704034907d582c7b6e09d97",
		abi_url: WEB_BASE + "abi/ERC721.json"
	},
	presale: {
		address: "0x10a0f683304b6878e5e70295445fb03eeb6dec75",
		abi_url: WEB_BASE + "abi/Presale2.json"
	},
	chestVault: "0xEd6003e7A6494Db4ABabEB7bDf994A3951ac6e69"
}:
{
	// Mainnet Settings
	token: {
		address: "0xeae9d154da7a1cd05076db1b83233f3213a95e4f",
		abi_url: WEB_BASE + "abi/ERC721.json"
	},
	presale: {
		address: "0xe0a21044eeeb9efc340809e35dc0e9d82dc87dd1",
		abi_url: WEB_BASE + "abi/Presale2.json"
	},
	chestVault: "0xc352f692f55def49f0b736ec1f7ca0f862eabd23"
};

const jQuery3 = jQuery.noConflict();

// configure bootstrap notify instance
if(jQuery3.notifyDefaults) {
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
}

// define a logger
const logger = {
	error: function(...msg) {
		if(jQuery3.notify) {
			jQuery3.notify(msg.join("").replace(/\n/g, '<br/>'), {
				type: "danger",
				delay: 8500,
			});
		}
		else {
			console.error(msg);
		}
	},
	warning: function(...msg) {
		if(jQuery3.notify) {
			jQuery3.notify(msg.join("").replace(/\n/g, '<br/>'), {
				type: "warning",
				delay: 5500,
			});
		}
		else {
			console.warn(msg);
		}
	},
	success: function(...msg) {
		if(jQuery3.notify) {
			jQuery3.notify(msg.join("").replace(/\n/g, '<br/>'), {
				type: "success",
				delay: 1500,
			});
		}
		else {
			console.info(msg);
		}
	},
};

// create an API client
const presale = new PresaleApi(logger, jQuery3);

function addCoupon() {
	const code = document.getElementById("coupon_code").value;
	const freeGems = document.getElementById("free_gems").value;
	const freeGeodes = document.getElementById("free_geodes").value;

	const errCode = presale.addCoupon(code, freeGems, freeGeodes, function(err, result) {
		if(err) {
			return;
		}
		if(result.event === "transaction_sent") {
			logger.success("Add Coupon transaction sent");
		}
	});
	if(errCode > 0) {
		alert("Error: " + errCode);
	}
}

function usePoints() {
	const points = document.getElementById("points_to_spend").value;

	const errCode = presale.usePoints(points, function(err, result) {
		if(err) {
			return;
		}
		if(result.event === "transaction_sent") {
			logger.success("Use Referral Points transaction sent");
		}
	});
	if(errCode > 0) {
		alert("Error: " + errCode);
	}

	// hide the modal
	location.replace('#');
}

function useCoupon() {
	const code = document.getElementById("use_coupon").value;

	const errCode = presale.useCoupon(code, function(err, result) {
		if(err) {
			return;
		}
		if(result.event === "transaction_sent") {
			logger.success("Use Coupon transaction sent");
		}
	});
	if(errCode > 0) {
		alert("Error: " + errCode);
	}

	// hide the modal
	location.replace('#');
}

function buyGeodes() {
	const qty = jQuery3("#geodes_num").val();
	const ref = jQuery3("#referral_address").val().trim();
	const errCode = presale.buyGeodes(qty, ref, function (err, result) {
		if(err) {
			return;
		}
		if(result.event === "transaction_sent") {
			logger.success("Buy Geode(s) transaction sent");
		}
	});
	if(errCode > 0) {
		location.replace("https://www.cryptominerworld.com/game_info#GameInfoMetaMask");
	}
	// hide the modal
	location.replace('#');
}

jQuery3(document).on("keyup", function(e) {
	if(e.keyCode == 27) {
		location.replace('#');
	}
});

jQuery3(document).ready(function() {
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
		console.log(`updating counters: sold(${data.sold}), left(${data.left}), price(${data.currentPrice}), priceIncreaseIn(${data.priceIncreaseIn})`);

		jQuery3(".counter").html(data.sold);
		jQuery3("#geodePriceETH").html(data.currentPrice);
		jQuery3("#priceIncrease").html(data.priceIncreaseIn);

		const discount = Math.round(1000 * (0.1 - data.currentPrice));
		jQuery3("#geodeDiscountAmount").html(discount);
		jQuery3("#discountContainer").toggle(discount > 0);
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
			return y.gradeType - x.gradeType;
		});

		const columns = jQuery3(window).width() > 640? 4: 2;
		const rows = Math.ceil(collection.length / columns);
		let html = `
			<div id="WorkshopLoading">
			<h1 id="my_geodes_header">${collection.length} &dash; Gemstone Worker Buddies</h1>
			<h1 id="my_geodes_subheader"></h1>
			<h2 id="my_points_subheader"></h2>
			<h2 id="create_ref_link_subheader">
				${ref_link_btn_html}
			</h2>
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
			const miningRate = calcMiningRate(gradeType, gradeValue);
			const miningRateDisplay = miningRate.toFixed(2);

			const color = colorName(colorId);
			const level = levelName(levelId);
			const grade = gradeName(gradeType);
			const thumbnail = gemThumbnailURL(color, level, grade);

			return `
				<a href="javascript:display_gem(\'${gem.id}\', \'${color}\', \'${level}\', ${gradeType}, \'${miningRateDisplay}\')">
					<img style="padding: 0;" width="250" height="250" src="${thumbnail}"/>
				</a><br/>Lvl ${levelId} ${color.substr(0, color.indexOf(" "))}<br/>Grade ${grade} &nbsp;+${miningRateDisplay}%
			`;
		}

		for(let i = 0; i < rows; i++) {
			html += "<tr>\n";
			for(let j = 0; j < columns; j++) {
				const idx = i * columns + j;
				if(idx < collection.length) {
					html += `\t<td id='${idx}'>\n`;

					// inject gem data
					html += compile_gem_html(collection[idx]);
				}
				else {
					html += "\t<td>\n";
				}
				html += "\t</td>";
			}
			html += "</tr>\n";
		}
		html += "</table>\n</div>\n";
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
					return byColor(x, y) * 0x100000000 + byLevel(x, y) * 0x10000000 + byGradeType(x, y) * 0x100000 + byGradeValue(x, y);
				}; break;
				case "level": fn = (x, y) => {
					return byLevel(x, y) * 0x100000000 + byGradeType(x, y) * 0x1000000 + byGradeValue(x, y) * 0x10 + byColor(x, y);
				}; break;
				case "grade": fn = (x, y) => {
					return byGradeType(x, y) * 0x10000000 + byGradeValue(x, y) * 0x100 + byLevel(x, y) * 0x10 + byColor(x, y);
				}; break;
			}
			if(fn) {
				const cmp = order.toLowerCase().startsWith("asc")? fn: (x, y) => {
					return -1 * fn(x, y);
				};
				collection.sort(cmp);
				for(let i = 0; i < collection.length; i++) {
					const element = jQuery3(`#${i}`);
					if(!element.length) {
						console.warn(`#${i} doesn't exist!`);
					}
					element.html(compile_gem_html(collection[i]));
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
		// configuration
		CONFIG,

		// callback handler
		function(errCode, result) {
			if(errCode > 0) {
				// update workshop page to look properly
				if(!TEST_MODE && presale.getNetworkId() != REQUIRED_NETWORK_ID) {
					workshop_wrong_network(presale.getNetworkName(), REQUIRED_NETWORK_NAME);
				}
				load_default_counters();
				return;
			}
			if(result.infura) {
				workshop_no_web3();
			}
			else if(!result.defaultAccount) {
				workshop_account_locked();
			}

			// load counters (presale state)
			presale.presaleState(function(err, result) {
				if(err) {
					load_default_counters();
					return;
				}
				update_counters(result);
				setTimeout(update_counters, 1023, result);
			});

			// update referral points counters and modal
			function update_referral_points(value) {
				const subheader = jQuery3("#my_points_subheader");
				// prepare modal data
				jQuery3("#points_available").html(value);
				jQuery3("#points_to_spend").val("0");
				jQuery3("#points_to_spend").prop("max", value);
				jQuery3("#referral_geodes").html("No");
				jQuery3("#referral_geodes_plural").html("s");
				jQuery3("#referral_gems").html("No");
				jQuery3("referral_gems_plural").html("s");
				jQuery3("#points_selected").html("0");
				let points_html = ``;
				if(value > 0) {
					points_html += `${value} &dash; Referral Point${value > 1? 's': ''} Available`;
					if(value >= 10) {
						// prepare the button
						points_html += `<br/><input id="my_points_btn" type="button" onclick="window.location = '#use_points_modal'" value="Use Referral Points"/>`;
					}
				}
				subheader.html(points_html);
			}

			// load workshop
			function reload_workshop() {
				presale.getCollection(function(err, result) {
					if(err) {
						return;
					}
					if(result.length > 0) {
						// display the collection of gems
						workshop_display_gems(result);

						// inject number of geodes, referral points owned
						presale.getBalances(function(err, result) {
							if(err) {
								return;
							}
							jQuery3("#my_geodes_subheader").html(result.geodes + " &dash; Founder&apos;s Plot" + (result.geodes > 1? "s": "") + " of Land");
							update_referral_points(result.pointsLeft);

							// enable / disable referral address input depending on the geodes balance
							const referral_address = jQuery3("#referral_address");
							referral_address.prop("disabled", result.geodes > 0);
							referral_address.toggle(result.geodes == 0);
							jQuery3("#ref_addr_err_msg").toggle(result.geodes == 0);
							if(result.geodes > 0) {
								referral_address.val("");
							}
						});
					}
					else {
						// display "no gems" screen
						workshop_no_gems();
					}
				});
			}
			if(result.defaultAccount) {
				reload_workshop();
			}

			// load chest vault balance
			presale.getChestVaultValueUSD(function(err, result) {
				if(err) {
					return;
				}
				jQuery3("#founder_chest_total_amount_eth").html(result.balance_eth);
				jQuery3("#founder_chest_total_amount_usd").html(result.balance_usd);
			});

			if(result.defaultAccount) {
				// update counters each time a PresaleStateChanged event is received
				presale.registerPresaleStateChangedEventListener(function(err, result) {
					if(err) {
						return;
					}
					update_counters(result);
				});

				// show success notification when coupon is created
				presale.registerCouponAddedEventListener(function(err, result) {
					if(err) {
						return;
					}
					logger.success("coupon added (expires ", result.expires, ")");
				});

				// show success notification when coupon is consumed
				presale.registerCouponConsumedEventListener(function(err, result) {
					if(err) {
						return;
					}
					logger.success("received ", result.gems, " free gem(s)");
					reload_workshop();
				});

				// show success notification when geode is bought
				presale.registerPurchaseCompleteEventListener(function(err, result) {
					if(err) {
						return;
					}
					logger.success("successfully bought ", result.geodes, " geode(s) (" + result.gems + " gems)");
					reload_workshop();
					display_geode_bought_modal(result.geodes, result.gems);
				});

				// show notification when referral points received
				presale.registerReferralPointsIssuedEventListener(function(err, result) {
					if(err) {
						return;
					}
					logger.success("received ", result.amount, " referral points");
					update_referral_points(result.left);
				});

				// show notification when referral points consumed
				presale.registerReferralPointsConsumedEventListener(function(err, result) {
					if(err) {
						return;
					}
					logger.success("spent ", result.amount, " points for ", result.gems, " gems and ", result.geodes, " geodes");
					reload_workshop();
					display_points_used_modal(result.geodes, result.gems);
				});

			}

			// pre-fill referral address
			const urlParams = new URLSearchParams(location.search);
			const ref = urlParams.get("ref");
			if(ref) {
				const referral_address = jQuery3("#referral_address");
				referral_address.val(ref);
				referral_address.trigger("change");
			}
		}
	);

	// MetaMask is not installed, display proper workshop screen
	if(errorCode > 0) {
		workshop_no_web3();
		load_default_counters();
	}

	// bind an action to a "get geodes button"
	jQuery3("#GetGeodeButton").css("cursor", "pointer").on("click", function () {
		// infura or no web3 - redirect to info modal
		if(presale.isInfura() || !presale.getWeb3()) {
			location.href = "#no_metamask";
			return;
		}
		if(!presale.getDefaultAccount()) {
			location.href = "#locked_metamask";
			return;
		}
		// MetaMask connected to wrong network
		if(!TEST_MODE && presale.getNetworkId() != REQUIRED_NETWORK_ID) {
			jQuery3("#required_network_id").html(REQUIRED_NETWORK_NAME);
			location.href = "#wrong_network_modal";
			return;
		}
		// everything is good, pass to the geode quantity chooser modal
		location.href = "#geode_qty_modal";
	});

	jQuery3("#referral_address").on("change", function(e) {
		if(!presale.initialized()) {
			logger.error("Web3 is not initialized. Please reload the page.");
		}
		const element = jQuery3(this);
		const val = element.val().trim();
		const err_container = jQuery3("#ref_addr_err_msg");
		err_container.html("");
		element.removeClass("wrong_input");
		if(val) {
			if(!presale.getWeb3().isAddress(val)) {
				element.addClass("wrong_input");
				err_container.html("not a valid Ethereum address");
			}
			else {
				// get balance for the address input as referral and check if its a valid referral
				presale.getBalancesFor(val, function(err, result) {
					if(err) {
						return;
					}
					if(result.geodes == 0) {
						element.addClass("wrong_input");
						err_container.html("this address cannot be used as a referral");
					}
				});
			}
		}
	});

	jQuery3("#points_to_spend").on("input", function(e) {
		const th = jQuery3(this);
		const points = parseInt(th.val());
		const geodes = Math.floor(points / 20);
		const gems = Math.floor((points % 20) / 10);
		jQuery3("#referral_geodes").html(geodes > 0? geodes: "No");
		jQuery3("#referral_geodes_plural").html(geodes == 1? "": "s");
		jQuery3("#referral_gems").html(gems > 0? gems: "No");
		jQuery3("referral_gems_plural").html(gems == 1? "": "s");
		jQuery3("#points_selected").html(points);
		jQuery3("#use_points_btn").prop("disabled", geodes == 0 && gems == 0);
	});
});

// Auxiliary function to open a pop up when geode is bought
function display_geode_bought_modal(geodes, gems) {
	jQuery3(".geodes_bought").html(geodes);
	jQuery3(".geodes_bought_plural").html(geodes > 1? "": "s");
	jQuery3(".gems_received").html(gems);
	if(location.pathname.indexOf("workshop") < 0) {
		location.href = "#geode_bought_modal";
	}
}

// Auxiliary function to open a pop up when referral points are used
function display_points_used_modal(geodes, gems) {
	jQuery3("#points_geodes").toggle(geodes > 0);
	jQuery3("#geodes_obtained").html(geodes);
	jQuery3("#geodes_obtained_plural").html(geodes > 1? "": "s");
	jQuery3("#points_and").toggle(geodes > 0 && gems > 0);
	jQuery3("#points_gems").toggle(gems > 0);
	if(location.pathname.indexOf("workshop") < 0) {
		location.href = "#points_used_modal";
	}
}

// create referral link function
function show_ref_link() {
	jQuery3("#create_ref_link_subheader").html(`<input id="ref_link_text" type="text" value="https://cryptominerworld.com/founders_geode_pre-sale/?ref=${presale.getDefaultAccount()}#geode_qty_modal" onclick="copy_ref_link()" title='Click to Copy to Clipboard' readonly/>`);
}

// copy ref link to clipboard
function copy_ref_link() {
	jQuery3("#ref_link_text").select();
	document.execCommand('copy');
	const subheader = jQuery3("#create_ref_link_subheader");
	subheader.html("<span id='ref_link_copied'>Copied!</span>");
	jQuery3("#ref_link_copied").animate({
		top: "-1em",
		opacity: 0
	}, 494, "linear", () => subheader.html(ref_link_btn_html));
}

// ref link button html
const ref_link_btn_html = `<input id="create_ref_link_btn" type="button" onclick="show_ref_link()" value="Show Referral Link"/>`;

// Auxiliary functions to draw gems list in a workshop
function display_gem(gemId, color, level, gradeType, miningRate) {
	const grade = gradeName(gradeType);
	console.log("display_gem(%s, %s, %s, %s, %s)", gemId, color, level, grade, miningRate);
	const energyLevelContainer = jQuery3("#gem_modal .energy_level");
	jQuery3("#gem_modal .level").html(level);
	jQuery3("#gem_modal .color").html(color);
	jQuery3("#gem_modal .grade_type").html(grade);
	jQuery3("#gem_modal .mining_rate").html(miningRate + "%");
	energyLevelContainer.html(grade.startsWith("A")? "Energy level – calculating...": "");
	jQuery3("#gem_modal #picture").each(function(i, e) {
		e.src = gemURL(color, level, grade);
		e.onload = function() {
			location.href = "#gem_modal";
		}
	});
	if(grade.startsWith("A")) {
		presale.getTokenCreationTime(gemId, function(err, result) {
			if(err) {
				return;
			}
			const ageSeconds = (Date.now() / 1000 | 0) - result;
			const oneDaySeconds = 24 * 3600;
			const oneMonthSeconds = 30 * oneDaySeconds;
			const ageDays = Math.floor(ageSeconds / oneDaySeconds);
			const restingEnergyMinutes = Math.round((17280 / ((2 + (6 - gradeType) / 4) * (11 + ageDays)))*(1 + (11 * Math.log(1 + (ageDays - 1) / 11))));
			console.log(`gem ${gemId} grade ${grade} rate ${miningRate}% age ${ageDays} days, resting energy is ${restingEnergyMinutes} minutes`);
			let energyLevel = Math.round(100 * ageSeconds / oneMonthSeconds);
			if(energyLevel > 100) {
				energyLevel = 100;
			}
			energyLevelContainer.html("Energy level &nbsp;" + energyLevel + "%");
		});
	}
}

function preloadGemGraphics() {
	const thumbs = [];
	for(let colorIdx = 0; colorIdx < 4; colorIdx++) {
		for(let levelId = 1; levelId <= 2; levelId++) {
			for(let gradeType = 1; gradeType <= 6; gradeType++) {
				const thumb = new Image();
				const color = colorName(((8 + colorIdx) % 10) + 1);
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

function calcMiningRate(gradeType, gradeValue) {
	switch(gradeType) {
		case 1: return gradeValue / 200000;
		case 2: return 10 + gradeValue / 200000;
		case 3: return 20 + gradeValue / 200000;
		case 4: return 40 + 3 * gradeValue / 200000;
		case 5: return 100 + gradeValue / 40000;
		case 6: return 300 + gradeValue / 10000;
	}
}

function gemThumbnailURL(color, level, grade) {
	return THUMB_BASE + color.substr(0, 3) + "-" + level.substr(-1, 1) + "-" + grade + "-250.png";
}

function gemURL(color, level, grade) {
	return IMAGE_BASE + color.substr(0, 3) + "-" + level.substr(-1, 1) + "-" + grade + ".png";
}
