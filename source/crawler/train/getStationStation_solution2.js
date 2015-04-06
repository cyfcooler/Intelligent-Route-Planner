// Solution 2:
// use this entry point https://kyfw.12306.cn/otn/leftTicketPrice/query?leftTicketDTO.train_date=2015-04-01&leftTicketDTO.from_station=BJP&leftTicketDTO.to_station=SHH&purpose_codes=ADULT&randCode=4wnz to get price data

var path = require('path');
var pathHelper = require(path.resolve(__dirname, '../..', 'lib/pathHelper.js'));

var mongo = require(pathHelper.getLibFile('mongo.js')),
	utility = require(pathHelper.getLibFile('utility.js')),
	https = require(pathHelper.getLibFile('clientget.js')),
	seat = require(pathHelper.getDataFile('seat.js')),
	station = require(pathHelper.getDataFile('station.js')),
	assert = require('assert');

var args = process.argv.splice(2),
	code = args[0],
	async = args[1],
	start = args[2] || 0,
	end = args[3],
	frequency = args[4] || 50,
	date = args[5] || '2015-04-01';
	
var train_index,
	all_trains,
	error_file = pathHelper.getLogErrorFile('getStationStation_solution2.err'),
	special_seat_file = pathHelper.getLogMessageFile('specialSeat_solution2.log'),
	seat_price_code = Object.keys(seat.price_code2name_2);

function processAllTrains(){
	async = async === 'false' ? false : true;
	mongo.findAll('train', function(key, data) {
		all_trains = data;
		end = end || (data.length - 1);
		console.log('get all train done, total: ' + data.length);
		console.log('process train from index ' + start + ' to index ' + end);
		train_index = start;
		if(async) {
			var i = train_index - 1;
			var interval = setInterval(function(){
				if(++i > end) {
					clearInterval(interval);
					console.log('send request done !');
				} else {
					processTrain(all_trains[i]);
				}
			}, frequency);
		} else {
			processTrain(all_trains[train_index]);
		}
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
		console.log("train " + train_code + " processed. Remaining: " + (end - (train_index++)));
		checkEndingStatus();
	}
}

function processTrainInternal(train_info, i, j){
	var stations = train_info.value.data;
	var train_code = train_info.key;
	if(i === stations.length - 1) {
		console.log("train " + train_code + " processed. Remaining: " + (end - (train_index++)));
		checkEndingStatus();
	} else {
		var from = station.name2code[stations[i].station_name],
			to = station.name2code[stations[j].station_name];
		if(from != null && to != null) {
			mongo.findOne('station_station', {edge: from + '_' + to, train_code: train_code}, function(key, result) {
				if(result == null) {
					queryTicketPrice(from, to, function(all_price) {
						if(all_price == null) {
							// all_price == null means some errors happened in queryTicketPrice(), will try this recursion again.
							processTrainInternal(train_info, i, j)
						} else {
							// all_price can be [] in some query, like 北京 -> 延庆. in this case, {} would be inserted into DB.
							// some train may have different train_code.
							// for example, query 新沂 to 芜湖, the train is K8414.
							//				query 合肥 to 芜湖, the train is K8411.
							// K8414 and K8411 is actually the same train.
							// in this case, findTrainTicketPrice() may return empty result {}, because 
							var seat_price = findTrainTicketPrice(train_code, all_price);
							insertIntoDb(train_code, stations[i], stations[j], seat_price, function(){
								stepForward(train_info, i, j);
							});
						}
					});
				} else {
					//console.log('skip ' + train_code + ' ' + from + ' ' + to);
					stepForward(train_info, i, j);
				}
			});
		} else {
			// 12306 has wrong station data, which doesn't have station code in its station list (e.g. train: 4471, station: 猴山), and it cannot buy ticket from this station online, so just ignore this station data.
			stepForward(train_info, i, j);
		}
	}
}

var seat_price_cache = {};
function queryTicketPrice(from_station_code, to_station_code, cb) {
	var key = from_station_code + '_' + to_station_code;
	if(seat_price_cache[key] == null) {
		var url = 'https://kyfw.12306.cn/otn/leftTicketPrice/query?leftTicketDTO.train_date=' + date + '&leftTicketDTO.from_station=' + from_station_code + '&leftTicketDTO.to_station=' + to_station_code + '&purpose_codes=ADULT&randCode=' + code;
		https.getHttpsData(url, key, {
			Cookie: 'JSESSIONID=A162DCF5322B765FED936FB27CCA8873; BIGipServerotn=1357906442.38945.0000; _jc_save_zwdch_fromStation=%u5317%u4EAC%2CBJP; _jc_save_zwdch_cxlx=1; _jc_save_czxxcx_toStation=%u65B0%u6C82%2CVIH; _jc_save_czxxcx_fromDate=2015-04-01; current_captcha_type=C; _jc_save_fromStation=%u7ECD%u5174%2CSOH; _jc_save_toStation=%u676D%u5DDE%2CHZH; _jc_save_fromDate=2015-04-01; _jc_save_toDate=; _jc_save_wfdc_flag=dc'
		}, function(key, msg) {
			msg = JSON.parse(msg);
			if (!msg.status) {
				logError('query price from ' + from_station_code + ' to ' + to_station_code + ' is not ready. try again later !');
				if(msg.messages != null && msg.messages.length > 0) {
					logError('messages: ' + JSON.stringify(msg.messages));	//'系统忙，请稍后重试'
				}
			} else if (msg.data == null || !(msg.data instanceof Array)) {
				logError('no ticket price data from ' + from_station_code + ' to ' + to_station_code);
				if(msg.data != null && msg.data.message != null) {
					logError('message: ' + msg.data.message);	//'验证码错误'
				}
				msg.data = null;
			} else {
				seat_price_cache[key] = msg.data;
			}
			
			// msg.data can be [] in some query, like 北京 -> 延庆
			typeof cb === 'function' && cb.call(this, msg.data);
		}, function(key, error) {
			typeof cb === 'function' && cb.call(this, null);
		});
	} else {
		typeof cb === 'function' && cb.call(this, seat_price_cache[key]);
	}
}

function findTrainTicketPrice(train_code, all_price) {
	for(var i = 0; i < all_price.length; i++) {
		if(all_price[i].queryLeftNewDTO.station_train_code === train_code) {
			return parsePrice(all_price[i].queryLeftNewDTO);
		}
	}
	return {};
}

function parsePrice(train_info) {
	var result = {};
	for(var i = 0; i < seat_price_code.length; i++) {
		var key = seat_price_code[i],
			value = parseInt(train_info[key]);
		if(!isNaN(value)) {
			result[key] = value;
			if(i >= 11) {
				logSpecialSeat('find special seat ' + key + ' for train ' + train_info.station_train_code);
			}
		}
	}
	
	return result;
}

function insertIntoDb(train_code, from_station, to_station, seat_price, cb) {
	var from = station.name2code[from_station.station_name],
		to = station.name2code[to_station.station_name];

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
}

function stepForward(train_info, i, j) {
	var stations = train_info.value.data;
	if(++j === stations.length) {
		++i;
		j = i + 1;
	}
	
	processTrainInternal(train_info, i, j)
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
	utility.logError(error_file, "train_index: " + train_index + ", " + msg, "getStationStation");
}

function logSpecialSeat(msg) {
	utility.logMessage(special_seat_file, msg, "getStationStation", true);
}

var start_time = new Date();
function checkEndingStatus() {
	if(train_index > end) {
		console.log('All done ! Total time: ' + (new Date() - start_time) + ' ms');
		mongo.closeDb();
	} else if (!async) {
		processTrain(all_trains[train_index]);
	}
}

processAllTrains();