var mongo = require('./lib/mongo.js'),
	utility = require('./lib/utility.js'),
	station = require('./data/station.js'),
	assert = require('assert');
	
var args = process.argv.splice(2),
	wait_threshold = args[0] || (4 * 60);
	
var file = '../log/error/dataProcess2.err',
	station_codes = Object.keys(station.code2name),
	remaining = station_codes.length;

function find2HopRoute(){
	var i = -1,
		completed = 0,
		route_map = {};
	console.log('total station: ' + station_codes.length);
	var interval = setInterval(function(){
		if(++i === station_codes.length) {
			clearInterval(interval);
		} else {
			mongo.find('station_station', {start: station_codes[i]}, function(key, data) {
				// mongo.find would return an array, so no need to check data != null
				route_map[key.start] = data;
				if(++completed === station_codes.length) {
					console.log("all results stored in memory, jump into stage 2 !");
					processRoute(route_map);
				} else {
					console.log('station ' + key.start + ' done. Remaining: ' + (station_codes.length - completed));
				}
			});
		}
	}, 10);
}

/*
	start: "",
	end: "",
	edge: "",
	train_code: "",
	start_time: "",
	end_time: "",
	duration: ""
 */
 function processRoute(route_map) {
	var i = -1;
	var interval = setInterval(function(){
		if(++i === station_codes.length) {
			clearInterval(interval);
		} else {
			var routes1 = route_map[station_codes[i]];
			if(routes1.length === 0) {
				checkEndingStatus(station_codes[i]);
			} else {
				var j = 0;
				var cb = function(station_code){
					if(++j === routes1.length) {
						checkEndingStatus(station_code);
					} else {
						processRoute2(routes1[j], route_map[routes1[j].end], 0, cb);
					}
				};
				processRoute2(routes1[j], route_map[routes1[j].end], 0, cb);
			}
		}
	}, 100);
 }

function processRoute2(route1, routes2, i, cb) {
	// process route serially
	if(i === routes2.length) {
		typeof cb == 'function' && cb.call(this, route1.start);
	} else {
		assert.equal(route1.end, routes2[i].start);
		if(route1.start !== routes2[i].end && route1.train_code !== routes2[i].train_code) {
			var wait_time = calculateMins(route1.end_time, routes2[i].start_time);
			if(wait_time > wait_threshold) {
				processRoute2(route1, routes2, ++i, cb);
			} else {
				mongo.insertDb('station_station_2_hops', null, {
					start: route1.start,
					end: routes2[i].end,
					transfer: route1.end,
					edge: route1.start + '_' + routes2[i].end,
					wait_time: wait_time,
					train_code_1: route1.train_code,
					train_code_2: routes2[i].train_code,
					start_time: route1.start_time,
					end_time: routes2[i].end_time,
					duration: route1.duration + wait_time + routes2[i].duration
				}, function(){
					processRoute2(route1, routes2, ++i, cb);
				});
			}
		} else {
			processRoute2(route1, routes2, ++i, cb);
		}
	}
}

var mins_per_day = 24 * 60;
function calculateMins(start, end) {
	var s = new Date("2015/10/15," + start),
		e = new Date("2015/10/15," + end),
		diff = ((e - s) / 60000);
	return diff >= 0 ? diff : (diff + mins_per_day);
}

function logError(msg) {
	utility.logError(file, msg, "dataProcess");
}

function checkEndingStatus(station_code) {
	console.log('station ' + station_code + ' done. Remaining: ' + (--remaining));
	if(remaining === 0) {
		console.log('All done !');
		mongo.closeDb();
	}
}

find2HopRoute();