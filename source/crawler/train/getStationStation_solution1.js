// Solution 1:
// use this entry point https://kyfw.12306.cn/otn/leftTicket/queryTicketPrice?train_no=240000G10108&from_station_no=01&to_station_no=10&seat_types=OM9&train_date=2015-04-01 to get price data, but it seems this entry point has flow rate control (will return 403 if send request too frequently)

var path = require('path');
var pathHelper = require(path.resolve(__dirname, '../..', 'lib/pathHelper.js'));

var mongo = require(pathHelper.getLibFile('mongo.js')),
	utility = require(pathHelper.getLibFile('utility.js')),
	https = require(pathHelper.getLibFile('clientget.js')),
	seat = require(pathHelper.getDataFile('seat.js')),
	station = require(pathHelper.getDataFile('station.js')),
	assert = require('assert');

var args = process.argv.splice(2),
	frequency = args[0] || 200,
	date = args[1] || '2015-04-01';
	
var train_index,
	len,
	all_trains,
	error_file = pathHelper.getLogErrorFile('getStationStation_solution1.err'),
	seat_price_code = Object.keys(seat.price_code2name);

function processAllTrains(){
	var i = -1;
	mongo.findAll('train', function(key, data) {
		console.log('get all train done, total: ' + data.length);
		train_index = 0;
		len = data.length;
		all_trains = data;
		processTrain(all_trains[train_index]);
	});
}

/*
	key: "",
	value: {
		data: []
	}
	train_no: ""
 */
function processTrain(train_info) {
	var stations = train_info.value.data;
	if(stations.length > 0) {
		processTrainInternal(train_info, 0, 1);
	} else {
		logError("train " + train_code + " has 0 station !");
		console.log("train " + train_code + " processed. Remaining: " + (len - (++train_index)));
		checkEndingStatus();
	}
}

var seat_type_cache = {};
function processTrainInternal(train_info, i, j){
	var stations = train_info.value.data;
	var train_code = train_info.key;
	if(i === stations.length - 1) {
		console.log("train " + train_code + " processed. Remaining: " + (len - (++train_index)));
		checkEndingStatus();
	} else {
		var seat_type = seat_type_cache[train_code];
		if(seat_type == null) {
			// there is one assumption here: one train should sell same seat type tickets (e.g. 二等座， 一等座) for all stations, so use seat_type_cache to prevent duplicate calculation.
			seat_type_cache[train_code] = seat_type = parseSeatTypes(stations[j]);
			if(seat_type === '') {
				// put if here in order to log message only once for this train.
				console.log('train ' + train_code + ' has no ticket price information !', true);
			}
		}
		
		if(seat_type !== '') {
			//console.log("train_no: " + train_info.train_no + ", station[" + i + "]: " + stations[i] + ", station[" + j + "]: " + stations[j]);
			queryTicketPrice(train_info.train_no, stations[i].station_no, stations[j].station_no, seat_type, function(seat_price) {
				if(seat_price == null) {
					// seat_price == null means some errors happened in queryTicketPrice(), will try this recursion again.
					setTimeout(function(){
						processTrainInternal(train_info, i, j)
					}, frequency);
				} else {
					insertIntoDb(train_code, stations[i], stations[j], seat_price, function(){
						stepForward(train_info, i, j);
					});
				}
			});
		} else {
			// no seat price information
			insertIntoDb(train_code, stations[i], stations[j], {}, function(){
				stepForward(train_info, i, j);
			});
		}
	}
}

function parseSeatTypes(station) {
	var seat_types = '',
		len = seat_price_code.length;
	for(var i = 0; i < len - 1; i++) {
		if(station[seat_price_code[i]] != null) {
			seat_types += seat_price_code[i];
		}
	}
	
	// special treatment for other seat type
	var other_seat = station['OT'];
	assert.ok(other_seat instanceof Array, '[parseSeatTypes] Cannot find OT field, or OT field is not an array !');
	if(other_seat.length > 0) {
		var special_seat_code = seat_price_code[len - 1];
		assert.ok(station[special_seat_code] != null, '[parseSeatTypes] Other seat type is not ' + special_seat_code + ': ' + JSON.stringify(station));
		seat_types += special_seat_code;
	}
	
	return seat_types;
}

function queryTicketPrice(train_no, from_station_no, to_station_no, seat_types, cb) {
	var url = 'https://kyfw.12306.cn/otn/leftTicket/queryTicketPrice?train_no=' + train_no + '&from_station_no=' + from_station_no + '&to_station_no=' + to_station_no + '&seat_types=' + seat_types + '&train_date=' + date;
	https.getHttpsData(url, train_no + ': ' + from_station_no + '->' + to_station_no, {
		Connection: 'keep-alive',
		Referer: 'https://kyfw.12306.cn/otn/lcxxcx/init'
	}, function(key, msg) {
		if(msg.indexOf('<!') != -1) {
			frequency += 50;
			logError('query train ' + train_no + ' price from ' + from_station_no + ' to ' + to_station_no + ' too frequent. will reduce frequency to ' + frequency + ' ms !');
		} else {
			msg = JSON.parse(msg);
			if (!msg.status) {
				logError('query train ' + train_no + ' price from ' + from_station_no + ' to ' + to_station_no + ' is not ready. try again later !');
			} else if (msg.data == null) {
				logError('no ticket price info of train ' + train_no + ' from ' + from_station_no + ' to ' + to_station_no);
			}
		}
		typeof cb === 'function' && cb.call(this, msg.data);
	});
}

function insertIntoDb(train_code, from_station, to_station, seat_price, cb) {
	var from = station.name2code[from_station.station_name],
		to = station.name2code[to_station.station_name];
	if(from != null && to != null) {
		mongo.insertDb('station_station', null, {
			start: from,
			end: to,
			edge: from + '_' + to,
			train_code: train_code,
			start_time: from_station.start_time,
			end_time: to_station.arrive_time,
			duration: calculateMins(from_station.start_time, to_station.arrive_time,
									to_station.arrive_day_diff - getStartDayDiff(from_station.arrive_time, from_station.start_time, from_station.arrive_day_diff)),
			seat_price: seat_price
		}, function(){
			typeof cb === 'function' && cb.call(this);
		});
	} else {
		// 12306 has wrong station data, which doesn't have station code in its station list (e.g. train: 4471, station: 猴山), and it cannot buy ticket from this station online, so just ignore this station data.
		typeof cb === 'function' && cb.call(this);
	}
}

function stepForward(train_info, i, j) {
	var stations = train_info.value.data;
	if(++j === stations.length) {
		++i;
		j = i + 1;
	}
	
	setTimeout(function(){
		processTrainInternal(train_info, i, j)
	}, frequency);
}

function getStartDayDiff(arrive_time, start_time, arrive_day_diff) {
	// we only have arrive_day_diff data, no start_day_diff data, so need calculate the start_day_diff data.
	var start_day_diff = arrive_day_diff,
		a = new Date("2015/10/15," + arrive_time),
		s = new Date("2015/10/15," + start_time),
		diff = s - a;
		
	// arrive_time could possibly be "----", so need check isNaN(diff)
	if(!isNaN(diff) && diff < 0) {
		// there is one assumption here: train can't stop at one station more than one day, so
		//		1. if diff >= 0, then arrive time and start time must be at the same day.
		//		2. if diff < 0, then arrive time and start time must be at the different day, and day difference must be 1
		start_day_diff++;
	}
	return start_day_diff;
}

var mins_per_day = 24 * 60;
function calculateMins(start, end, day_diff) {
	var s = new Date("2015/10/15," + start),
		e = new Date("2015/10/15," + end),
		diff = ((e - s) / 60000) + day_diff * mins_per_day;
	return diff;
}

function logError(msg) {
	utility.logError(error_file, msg, "getStationStation");
}

function checkEndingStatus() {
	if(train_index === len) {
		console.log('All done !');
		mongo.closeDb();
	} else {
		setTimeout(function(){
			processTrain(all_trains[train_index]);
		}, frequency);
	}
}

processAllTrains();