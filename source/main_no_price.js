var https = require('./lib/clientget.js'),
	mongo = require('./lib/mongo.js'),
	utility = require('./lib/utility.js'),
	station = require('./data/station.js'),
	seat = require('./data/seat.js'),
	assert = require('assert');
	
var error_file = '../log/error/main.err',
	log_file = '../log/message/main.log',
	args = process.argv.splice(2),
	date = args[0],
	from = args[1],
	to = args[2],
	min_wait_time = args[3],
	max_wait_time = args[4],
	required_seat_num = args[5],						// optional parameter, format like [2,3,0,0,5,0,0,0,2,0,0], corresponds to seat definition in data/seat.js
	max_solutions = (args[6] || 5),						// optional parameter
	max_duration = args[7],								// optional parameter
	same_station_transfer = (args[8] === 'true');		// optional parameter (compared to same_city_transfer). default value: false.

var seat_num_code = Object.keys(seat.num_code2name),
	seat_price_code = Object.keys(seat.price_code2name),
	start_time = new Date(),
	same_station_map = {};

function findAllRoutes() {
	var direct_routes = [],
		routes1 = [],
		routes2 = [],
		remaining = 3;
	
	if(from != null && to != null && station.code2name[from] != null && station.code2name[to] != null) {
		mongo.findAll('station', function(key, stations){
			stations.forEach(function(station_info){
				same_station_map[station_info.key] = station_info.value.data.sameStations;
			});
			
			findDirectRoute(from, to, function(routes) {
				direct_routes = routes;
				if(--remaining === 0) {
					processRoutes(direct_routes, routes1, routes2);
				}
			});
			
			findRoute1(from, function(routes) {
				routes1 = routes;
				if(--remaining === 0) {
					processRoutes(direct_routes, routes1, routes2);
				}
			});
			
			findRoute2(to, function(routes) {
				routes2 = routes;
				if(--remaining === 0) {
					processRoutes(direct_routes, routes1, routes2);
				}
			});
		});
	} else {
		console.log('please input 2 valid stations !');
	}
}

function findDirectRoute(from, to, cb) {
	mongo.find('station_station', {start_same_stations: same_station_map[from], end_same_stations: same_station_map[to]}, function(key, data) {
		// mongo.find would return an array, so no need to check data != null
		typeof cb === 'function' && cb.call(this, data);
	});
}

function findRoute1(from, cb) {
	mongo.find('station_station', {start_same_stations: same_station_map[from]}, function(key, data) {
		// mongo.find would return an array, so no need to check data != null
		typeof cb === 'function' && cb.call(this, data);
	});
}

function findRoute2(to, cb) {
	mongo.find('station_station', {end_same_stations: same_station_map[to]}, function(key, data) {
		// mongo.find would return an array, so no need to check data != null
		typeof cb === 'function' && cb.call(this, data);
	});
}

/*
	start: "",
	end: "",
	edge: "",
	train_code: "",
	start_time: "",
	end_time: "",
	duration: "",
	seat_price: []
 */
 function processRoutes(dr, r1, r2) {
	var result = [];
	
	// process direct route
	for(var i = 0; i < dr.length; i++) {
		if(isDirectQualified(dr[i].duration)) {
			result.push(dr[i]);
		}
	}
	
	// process transfer route
	for(var i = 0; i < r1.length; i++) {
		for(var j = 0; j < r2.length; j++) {
			if(r1[i].train_code !== r2[j].train_code && canTransfer(r1[i], r2[j])) {
				var wait_time = calculateMins(r1[i].end_time, r2[j].start_time);
				if(isTransferQualified(r1[i].duration, wait_time, r2[j].duration)) {
					result.push({
						start: r1[i].start,
						end: r2[j].end,
						transfer: r1[i].end,
						edge: r1[i].start + '_' + r2[j].end,
						wait_time: wait_time,
						train_code_1: r1[i].train_code,
						train_code_2: r2[j].train_code,
						start_time_1: r1[i].start_time,
						end_time_1: r1[i].end_time,
						start_time_2: r2[j].start_time,
						end_time_2: r2[j].end_time,
						duration1: r1[i].duration,
						duration2: r2[j].duration,
						duration: r1[i].duration + wait_time + r2[j].duration
					});
				}
			}
		}
	}
	
	result.sort(sortByDuration);
	
	//printCandidateRoutes(result);
	//mongo.closeDb();
	
	queryTicket(result, function(all_tickets){
		printRoutes(result, all_tickets);
		mongo.closeDb();
		console.log("\nTotal query cost: " + (new Date() - start_time) + " ms");
	});
 }
 
 function canTransfer(r1, r2) {
	 if(same_station_transfer) {
		 return r1.end === r2.start;
	 } else {
		 // all start_same_stations.length or end_same_stations.length are > 0 (checked by test/checkEmptySameStations.js), so no need to check (r1.end_same_stations.length > 0 && r2.start_same_stations.length > 0) here
		 return r1.end === r2.start || JSON.stringify(r1.end_same_stations) === JSON.stringify(r2.start_same_stations);
	 }
 }
 
 function sortByDuration(r1, r2) {
	 return r1.duration - r2.duration;
 }
 
 function sortByPrice(r1, r2) {
 }
 
 function queryTicket(routes, callback) {
	var current_index = 0;
	var all_tickets = [];
	logMessage("[queryTicket] start to query maximum " + max_solutions + " solutions");
	var cb = function(result){
		 /* 
			format of result should be like
			 [
				[
					ticket_info_1,
					ticket_info_2
				]
				or
				[
					ticket_info
				]
			 ]
		*/
		if(result.length !== 0) {
			all_tickets.push(result);
			++current_index;
			logMessage("[queryTicket] find available solution " + current_index + ": " + JSON.stringify(result));
		}
		if(result.length === 0 || current_index >= max_solutions) {
			//result.length === 0 means all candidate routes have been searched.
			logMessage("[queryTicket] all query done. find total " + all_tickets.length + " solutions.", true);
			typeof callback === 'function' && callback.call(this, all_tickets);
		} else {
			queryTicketRecur(current_index, routes, cb);
		}
	};
	
	queryTicketRecur(current_index, routes, cb);
 }
 
 function queryTicketRecur(i, routes, callback) {
	 var tickets_need_query = 0;
	 var success = true;
	 var all_tickets = [];
	 var cb = function(index, result) {
		 /* 
			format of result should be like
			 {
				train_code: ... (must-have field)
				yz_num: ...
				rz_num: ...
				...: ... (required and available seat number)
			 }	
		*/
		 success = (success && hasTicket(result));
		 all_tickets[index] = result;
		 if(--tickets_need_query === 0) {
			 // all ticket data coming. do next step
	 		 if(success) {
				 // get the ticket for current route
				 typeof callback === 'function' && callback.call(this, all_tickets);
			 } else {
				 // no ticket for current route. query next route
				routes.splice(i, 1);
				queryTicketRecur(i, routes, callback);
			 }
		 }
	 };
	 
	 if(i < routes.length) {
		logMessage("[queryTicketRecur] start to query solution " + (i + 1));
		if(routes[i].transfer != null) {
			tickets_need_query = 2;
			logMessage("[queryTicketRecur] query transfer for " + routes[i].train_code_1 + " and " + routes[i].train_code_2);
			queryTicketInternal(date, routes[i].start, routes[i].transfer, routes[i].train_code_1, 0, cb);
			queryTicketInternal(date, routes[i].transfer, routes[i].end, routes[i].train_code_2, 1, cb);
		} else {
			tickets_need_query = 1;
			logMessage("[queryTicketRecur] query direct for " + routes[i].train_code);
			queryTicketInternal(date, routes[i].start, routes[i].end, routes[i].train_code, 0, cb);
		}
	 } else {
		typeof callback === 'function' && callback.call(this, all_tickets);
	 }
 }
 
 var cache = {};
 function queryTicketInternal(date, from, to, train_code, index, cb) {
	 var result = {},
		key = from + '_' + to;
	 if(cache[key] == null) {
		var url = 'https://kyfw.12306.cn/otn/lcxxcx/query?purpose_codes=ADULT&queryDate=' + date + '&from_station=' + from + '&to_station=' + to;
		https.getHttpsData(url, key, {}, function(key, msg) {
			msg = JSON.parse(msg);
			if (!msg.status) {
				logError('query ticket from ' + from + ' to ' + to + ' is not ready. try again later !');
			} else if (msg.data == null || !msg.data.flag) {
				logError('no ticket data from ' + from + ' to ' + to);
			}
			
			// for no ticket data condition, set cache to [] to prevent query data from 12306 again.
			// for query error, set cache to null so it can query again next time.
			cache[key] = msg.data.flag === false ? [] : ((msg.data != null && msg.status) ? msg.data.datas : null);
			result = getTrainTicketInfo(train_code, cache[key]);
			logMessage('[queryTicketInternal] get ticket info ' + from + ' -> ' + to + ' from 12306: ' + JSON.stringify(result));
			typeof cb === 'function' && cb.call(this, index, result);
		});
	 } else {
		 result = getTrainTicketInfo(train_code, cache[key]);
		 logMessage('[queryTicketInternal] get ticket info ' + from + ' -> ' + to + ' from cache: ' + JSON.stringify(result));
		 typeof cb === 'function' && cb.call(this, index, result);
	 }
 }
 
 function getTrainTicketInfo(train_code, ticket_info) {
	 var result = {};
	 result.train_code = train_code;
	 if(ticket_info != null) {
		 for(var i = 0; i < ticket_info.length; i++) {
			if(ticket_info[i].station_train_code === train_code) {
				 // search required ticket in 11 seat types
				 for(var j = 0; j < seat_num_code.length; j++) {
					 var ticket_num = parseInt(ticket_info[i][seat_num_code[j]]);
					 if(required_seat_num[j] > 0 && isNaN(ticket_num) === false && ticket_num >= required_seat_num[j]) {
						 result[seat_num_code[j]] = ticket_num;
					 }
				 }
				 break;
			}
		 }
	 }
	 return result;
 }
 
 function isDirectQualified(duration) {
	 return (max_duration == null || duration <= max_duration);
 }
 
 function isTransferQualified(duration1, wait_time, duration2) {
	 var total = duration1 + wait_time + duration2;
	 return wait_time >= min_wait_time && wait_time <= max_wait_time && (max_duration == null || total <= max_duration);
 }
 
 function hasTicket(obj) {
	 return typeof obj === 'object' && Object.getOwnPropertyNames(obj).length > 1;
 }
 
 function printRoutes(routes, tickets) {
	 //console.log('Total feasible solutions (from best to worst): ' + routes.length);
	 for(var i = 0; i < tickets.length; i++){
		 console.log('\nSolution ' + (i + 1) + ':');
		 if(routes[i].transfer != null) {
			printTranserRoute(routes[i], tickets[i]);
		 } else {
			printDirectRoute(routes[i], tickets[i]);
		 }
	 }
 }
 
 function printTranserRoute(route, ticket) {
	 console.log('Transfer solution:');
	 console.log('\t1. Take ' + route.train_code_1 + ' at ' + route.start_time_1 + ' from station ' + station.code2name[route.start] + ', arrive at station ' + station.code2name[route.transfer] + ' at ' + route.end_time_1 + ', time consumption: ' + route.duration1 + ' minutes.');
	 console.log('\t\tAvailable tickets: ' + generateTicketInfoString(ticket[0]));
	 console.log('\t2. Wait ' + route.wait_time + ' minutes at station ' + station.code2name[route.transfer]);
	 console.log('\t3. Take ' + route.train_code_2 + ' at ' + route.start_time_2 + ' from station ' + station.code2name[route.transfer] + ', arrive at station ' + station.code2name[route.end] + ' at ' + route.end_time_2 + ', time consumption: ' + route.duration2 + ' minutes.');
	 console.log('\t\tAvailable tickets: ' + generateTicketInfoString(ticket[1]));
	 console.log('Total time consumption: ' + route.duration + " minutes");
 }
 
 function printDirectRoute(route, ticket) {
	 console.log('Direct solution:');
	 console.log('\tTake ' + route.train_code + ' at ' + route.start_time + ' from station ' + station.code2name[route.start] + ', arrive at station ' + station.code2name[route.end] + ' at ' + route.end_time);
	 console.log('\t\tAvailable tickets: ' + generateTicketInfoString(ticket[0]));
	 console.log('Total time consumption: ' + route.duration + " minutes");
 }
 
  function printCandidateRoutes(routes) {
	 console.log('Total feasible solutions (from best to worst): ' + routes.length);
	 for(var i = 0; i < routes.length; i++){
		 console.log('\nSolution ' + (i + 1) + ':');
		 if(routes[i].transfer != null) {
			printCandidateTranserRoute(routes[i]);
		 } else {
			printCandidateDirectRoute(routes[i]);
		 }
	 }
 }
 
 function printCandidateTranserRoute(route) {
	 console.log('Transfer solution:');
	 console.log('\t1. Take ' + route.train_code_1 + ' at ' + route.start_time_1 + ' from station ' + station.code2name[route.start] + ', arrive at station ' + station.code2name[route.transfer] + ' at ' + route.end_time_1 + ', time consumption: ' + route.duration1 + ' minutes.');
	 console.log('\t2. Wait ' + route.wait_time + ' minutes at station ' + station.code2name[route.transfer]);
	 console.log('\t3. Take ' + route.train_code_2 + ' at ' + route.start_time_2 + ' from station ' + station.code2name[route.transfer] + ', arrive at station ' + station.code2name[route.end] + ' at ' + route.end_time_2 + ', time consumption: ' + route.duration2 + ' minutes.');
	 console.log('Total time consumption: ' + route.duration + " minutes");
 }
 
 function printCandidateDirectRoute(route) {
	 console.log('Direct solution:');
	 console.log('\tTake ' + route.train_code + ' at ' + route.start_time + ' from station ' + station.code2name[route.start] + ', arrive at station ' + station.code2name[route.end] + ' at ' + route.end_time);
	 console.log('Total time consumption: ' + route.duration + " minutes");
 }
 
 function generateTicketInfoString(ticket) {
	 var str = '';
	 for(var prop in ticket) {
		 if(prop !== 'train_code') {
			 str += (seat.num_code2name[prop] + ': ' + ticket[prop] + ', ');
		 }
	 }
	 return str;
 }

var mins_per_day = 24 * 60;
function calculateMins(start, end) {
	var s = new Date("2015/10/15," + start),
		e = new Date("2015/10/15," + end),
		diff = ((e - s) / 60000);
	return diff >= 0 ? diff : (diff + mins_per_day);
}

function logError(msg) {
	utility.logError(error_file, msg, "main");
}

function logMessage(msg, display_in_console) {
	var display = display_in_console != null ? display_in_console : false;
	utility.logMessage(log_file, msg, "main", display);
}

function run() {
	if(args.length < 5) {
		console.log('usage: node main.js [date] [from] [to] [min_wait_time] [max_wait_time] [required_seat_num] [max_solutions] [max_duration]');
		return;
	}
	
	required_seat_num = required_seat_num || '[1,1,1,1,1,1,1,1,1,1,1]';
	required_seat_num = JSON.parse(required_seat_num);
	if(required_seat_num.length !== seat_num_code.length) {
		console.log('[required_seat_num] should be length ' + seat_num_code.length);
		return;
	}
	findAllRoutes();
}

run();