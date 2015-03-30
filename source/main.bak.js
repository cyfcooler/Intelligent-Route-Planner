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
	preference = args[5],								// valid value: "time" or "price"
	start_time_range = args[6],							// optional parameter. e.g. [8,10] which means 8:00 - 10:00
	end_time_range = args[7],							// optional parameter. same as above.
	required_seat_num = args[8],						// optional parameter. format like [2,3,0,0,5,0,0,0,2,0,0], corresponds to seat definition in data/seat.js. default value: all 1
	max_solutions = (args[9] || 5),						// optional parameter. default value: 5.
	max_duration = args[10] || Infinity,				// optional parameter
	max_price = args[11] || Infinity,					// optional parameter
	same_station_transfer = (args[11] === 'true');		// optional parameter (compared to same_city_transfer). default value: false.

var seat_num_code = Object.keys(seat.num_code2name),
	start_time = new Date(),
	same_station_map = {};

function findAllRoutes() {
	var remaining = 2;
	
	if(from != null && to != null && station.code2name[from] != null && station.code2name[to] != null) {
		mongo.findOne('station', from, function(key, data){
			same_station_map[key] = data.value.data.sameStations;
			if(--remaining === 0) {
				findFeasibleRoutes(from, to);
			}
		});
		
		mongo.findOne('station', to, function(key, data){
			same_station_map[key] = data.value.data.sameStations;
			if(--remaining === 0) {
				findFeasibleRoutes(from, to);
			}
		});
	} else {
		console.log('please input 2 valid stations !');
	}
}

function findFeasibleRoutes(from, to) {
	var direct_routes = [],
		routes1 = [],
		routes2 = [],
		remaining = 3;
	
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
		var seat_price = getRequiredSeatPrice(dr[i].seat_price);
		if(isDirectQualified(dr[i].duration, seat_price, dr[i].start_time, dr[i].end_time)) {
			result.push({
				start: dr[i].start,
				end: dr[i].end,
				train_code: dr[i].train_code,
				start_time: dr[i].start_time,
				end_time: dr[i].end_time,
				total_duration: dr[i].duration,
				seat_price: seat_price,
				min_price: seat_price.min_price
			});
		}
	}

	// process transfer route
	for(var i = 0; i < r1.length; i++) {
		for(var j = 0; j < r2.length; j++) {
			if(r1[i].train_code !== r2[j].train_code && canTransfer(r1[i], r2[j])) {
				var wait_time = calculateMins(r1[i].end_time, r2[j].start_time),
					seat_price1 = getRequiredSeatPrice(r1[i].seat_price),
					seat_price2 = getRequiredSeatPrice(r2[j].seat_price);
				if(isTransferQualified(r1[i].duration, wait_time, r2[j].duration, seat_price1, seat_price2, r1[i].start_time, r2[j].end_time)) {
					result.push({
						start: r1[i].start,
						end: r2[j].end,
						transfer: [r1[i].end, r2[j].start],
						wait_time: wait_time,
						train_code: [r1[i].train_code, r2[j].train_code],
						start_time: [r1[i].start_time, r2[j].start_time],
						end_time: [r1[i].end_time, r2[j].end_time],
						duration: [r1[i].duration, r2[j].duration],
						total_duration: r1[i].duration + wait_time + r2[j].duration,
						seat_price: [seat_price1, seat_price2],
						min_price: seat_price1.min_price + seat_price2.min_price
					});
				}
			}
		}
	}
	
	if(preference === "time") {
		result.sort(sortByDuration);
	} else if(preference === "price") {
		result.sort(sortByPrice);
	}

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
	return (r1.total_duration !== r2.total_duration) ? (r1.total_duration - r2.total_duration) : (r1.min_price - r2.min_price);
}

function sortByPrice(r1, r2) {
	return (r1.min_price !== r2.min_price) ? (r1.min_price - r2.min_price) : (r1.total_duration - r2.total_duration);
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
					ticket_info_1, (definition of this data structure can be found in the comment inside queryTicketRecur().)
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
				num: {
					yz_num: ...
					rz_num: ...
					...: ... (required and available seat number)
				},
				price: {
					min_price: ... (must-have field)
					yz_price: ...
					rz_price: ...
					...: ... (required and available seat price)
				}
			}
		*/
		success = (success && hasTicket(result.price));
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
			logMessage("[queryTicketRecur] query transfer for " + routes[i].train_code[0] + " and " + routes[i].train_code[1]);
			queryTicketInternal(date, routes[i].start, routes[i].transfer[0], routes[i].train_code[0], routes[i].seat_price[0], 0, cb);
			queryTicketInternal(getActualDate(date, routes[i].start_time[0], routes[i].duration[0] + routes[i].wait_time), routes[i].transfer[1], routes[i].end, routes[i].train_code[1], routes[i].seat_price[1], 1, cb);
		} else {
			tickets_need_query = 1;
			logMessage("[queryTicketRecur] query direct for " + routes[i].train_code);
			queryTicketInternal(date, routes[i].start, routes[i].end, routes[i].train_code, routes[i].seat_price, 0, cb);
		}
	} else {
		typeof callback === 'function' && callback.call(this, all_tickets);
	}
}

function getActualDate(date, start_time, duration) {
	var d = new Date(date + ',' + start_time);
	d.setMinutes(d.getMinutes() + duration);
	var month = d.getMonth() + 1,
		date = d.getDate();
	var month_str = month < 10 ? ('0' + month) : (month + ''),
		date_str = date < 10 ? ('0' + date) : (date + '');
	return d.getFullYear() + '-' + month_str + '-' + date_str;
}
 
var cache = {};
function queryTicketInternal(date, from, to, train_code, seat_price, index, cb) {
	var result = {},
		key = date + ':' + from + '_' + to;
	if(cache[key] == null) {
		var url = 'https://kyfw.12306.cn/otn/lcxxcx/query?purpose_codes=ADULT&queryDate=' + date + '&from_station=' + from + '&to_station=' + to;
		https.getHttpsData(url, key, {}, function(key, msg) {
			msg = JSON.parse(msg);
			if (!msg.status) {
				logError('query ticket from ' + from + ' to ' + to + ' is not ready. try again later !');
				logError('received data: ' + JSON.stringify(msg));
			} else if (msg.data == null || !msg.data.flag) {
				logError('no ticket data from ' + from + ' to ' + to);
				logError('received data: ' + JSON.stringify(msg));
			}
			
			// for no ticket data condition, set cache to [] to prevent query data from 12306 again.
			// for query error, set cache to null so it can query again next time.
			cache[key] = msg.data.flag === false ? [] : ((msg.data != null && msg.status) ? msg.data.datas : null);
			result = getTrainTicketInfo(train_code, cache[key], seat_price);
			logMessage('[queryTicketInternal] get ticket info ' + date + ': ' + from + ' -> ' + to + ' from 12306: ' + JSON.stringify(result));
			typeof cb === 'function' && cb.call(this, index, result);
		});
	} else {
		result = getTrainTicketInfo(train_code, cache[key], seat_price);
		logMessage('[queryTicketInternal] get ticket info ' + date + ': ' + from + ' -> ' + to + ' from cache: ' + JSON.stringify(result));
		typeof cb === 'function' && cb.call(this, index, result);
	}
}
 
function getTrainTicketInfo(train_code, ticket_info, seat_price) {
	var result = {},
		num = {},
		price = {};
	result.train_code = train_code;
	if(ticket_info != null) {
		for(var i = 0; i < ticket_info.length; i++) {
			if(ticket_info[i].station_train_code === train_code) {
				// search required seat ticket
				for(var prop in seat_price) {
					if(prop !== 'min_price') {
						var index = seat.price_2_num_index[prop],
							ticket_num = parseInt(ticket_info[i][seat_num_code[index]]);
						if(!isNaN(ticket_num) && ticket_num >= required_seat_num[index]) {
							num[seat_num_code[index]] = ticket_num;
							price[prop] = seat_price[prop];
						}
					} else {
						price[prop] = seat_price[prop];
					}
				}
				result.num = num;
				result.price = price;
				break;
			}
		}
	}
	return result;
}
 
function isDirectQualified(duration, seat_price, start_time, end_time) {
	var start_time_hour = new Date('2015-03-15,' + start_time).getHours(),
		end_time_hour = new Date('2015-03-15,' + end_time).getHours();
	return hasTicket(seat_price) && duration <= max_duration && start_time_hour >= start_time_range[0] && start_time_hour < start_time_range[1] && end_time_hour >= end_time_range[0] && end_time_hour < end_time_range[1];
}
 
function isTransferQualified(duration1, wait_time, duration2, seat_price1, seat_price2, start_time, end_time) {
	var total_duration = duration1 + wait_time + duration2,
		total_min_price = seat_price1.min_price + seat_price2.min_price,
		start_time_hour = new Date('2015-03-15,' + start_time).getHours(),
		end_time_hour = new Date('2015-03-15,' + end_time).getHours();
	return hasTicket(seat_price1) && hasTicket(seat_price2) && wait_time >= min_wait_time && wait_time <= max_wait_time && total_duration <= max_duration && total_min_price <= max_price && start_time_hour >= start_time_range[0] && start_time_hour < start_time_range[1] && end_time_hour >= end_time_range[0] && end_time_hour < end_time_range[1];
}
 
function getRequiredSeatPrice(seat_price) {
	var result = {min_price: Infinity};
	
	// get only required seat price (specified by required_seat_num). other seat price will be ignored.
	for(var prop in seat_price) {
		if(required_seat_num[seat.price_2_num_index[prop]] > 0 && seat_price[prop] <= max_price) {
			result.min_price = Math.min(seat_price[prop], result.min_price);
			result[prop] = seat_price[prop];
		}
	}
	
	return result;
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
	
	// route 1:
	console.log('\t1. Take ' + route.train_code[0] + ' at [' + date + ',' + route.start_time[0] + '] from station ' + station.code2name[route.start] + ', arrive at [' + getActualDate(date, route.start_time[0], route.duration[0]) + ',' + route.end_time[0] + '] at station ' + station.code2name[route.transfer[0]] + ', time consumption: ' + route.duration[0] + ' minutes.');
	console.log('\t\tQualified tickets: \n\t\t\t' + generateTicketInfoString(ticket[0]));
	
	// transfer:
	if(route.transfer[0] === route.transfer[1]) {
		console.log('\t2. Wait ' + route.wait_time + ' minutes at station ' + station.code2name[route.transfer[0]]);
	} else {
		console.log('\t2. Go to transfer station ' + station.code2name[route.transfer[1]] + ' within ' + route.wait_time + ' minutes');
	}
	
	// route 2:
	var date2 = getActualDate(date, route.start_time[0], route.duration[0] + route.wait_time);
	console.log('\t3. Take ' + route.train_code[1] + ' at [' + date2 + ',' + route.start_time[1] + '] from station ' + station.code2name[route.transfer[1]] + ', arrive at [' + getActualDate(date2, route.start_time[1], route.duration[1]) + ',' + route.end_time[1] + '] at station ' + station.code2name[route.end] + ', time consumption: ' + route.duration[1] + ' minutes.');
	console.log('\t\tQualified tickets: \n\t\t\t' + generateTicketInfoString(ticket[1]));
	
	console.log('Total consumption: ' + route.total_duration + " minutes, ￥" + (ticket[0].price.min_price + ticket[1].price.min_price) / 10.0);
}

function printDirectRoute(route, ticket) {
	console.log('Direct solution:');
	console.log('\tTake ' + route.train_code + ' at [' + date + ',' + route.start_time + '] from station ' + station.code2name[route.start] + ', arrive at [' + getActualDate(date, route.start_time, route.total_duration) + ',' + route.end_time + '] at station ' + station.code2name[route.end] + ', time consumption: ' + route.total_duration + ' minutes.');
	console.log('\t\tQualified tickets: \n\t\t\t' + generateTicketInfoString(ticket[0]));
	console.log('Total consumption: ' + route.total_duration + " minutes, ￥" + ticket[0].price.min_price / 10.0);
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
	console.log('\t1. Take ' + route.train_code[0] + ' at ' + route.start_time[0] + ' from station ' + station.code2name[route.start] + ', arrive at station ' + station.code2name[route.transfer[0]] + ' at ' + route.end_time[0] + ', time consumption: ' + route.duration[0] + ' minutes.');
	console.log('\t2. Wait ' + route.wait_time + ' minutes at station ' + station.code2name[route.transfer[1]]);
	console.log('\t3. Take ' + route.train_code[1] + ' at ' + route.start_time[1] + ' from station ' + station.code2name[route.transfer[1]] + ', arrive at station ' + station.code2name[route.end] + ' at ' + route.end_time[1] + ', time consumption: ' + route.duration[1] + ' minutes.');
	console.log('Total time consumption: ' + route.total_duration + " minutes");
}

function printCandidateDirectRoute(route) {
	console.log('Direct solution:');
	console.log('\tTake ' + route.train_code + ' at ' + route.start_time + ' from station ' + station.code2name[route.start] + ', arrive at station ' + station.code2name[route.end] + ' at ' + route.end_time);
	console.log('Total time consumption: ' + route.total_duration + " minutes");
}

function generateTicketInfoString(ticket) {
	var str = '';
	for(var prop in ticket.price) {
		if(prop !== 'min_price') {
			var seat_code = seat_num_code[seat.price_2_num_index[prop]],
				seat_name = seat.num_code2name[seat_code],
				seat_num = ticket.num[seat_code],
				seat_price = ticket.price[prop] / 10.0;
			str += (seat_name + ': (number: ' + seat_num + ', price: ￥' + seat_price + '), ');
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

function init() {
	required_seat_num = required_seat_num || '[1,1,1,1,1,1,1,1,1,1,1]';
	required_seat_num = JSON.parse(required_seat_num);
	if(required_seat_num.length !== seat_num_code.length) {
		console.log('[required_seat_num] should be length ' + seat_num_code.length);
		return false;
	}
	
	if(preference !== 'time' && preference !== 'price') {
		console.log('[preference] should be "time" or "price".');
		return false;
	}
	
	start_time_range = start_time_range || '[0,24]';
	start_time_range = JSON.parse(start_time_range);
	end_time_range = end_time_range || '[0,24]';
	end_time_range = JSON.parse(end_time_range);
	if(start_time_range.length !== 2 || end_time_range.length !== 2 || start_time_range[0] > start_time_range[1] || end_time_range[0] > end_time_range[1]) {
		console.log('format of [start_time_range] or [end_time_range] should be like [XX,YY] where XX and YY are both valid hours (0~24), and XX should <= YY');
		return false;
	}
	
	start_time_range[0] = start_time_range[0] < 0 ? 0 : (start_time_range[0] > 24 ? 24 : start_time_range[0]);
	start_time_range[1] = start_time_range[1] < 0 ? 0 : (start_time_range[1] > 24 ? 24 : start_time_range[1]);
	end_time_range[0] = end_time_range[0] < 0 ? 0 : (end_time_range[0] > 24 ? 24 : end_time_range[0]);
	end_time_range[1] = end_time_range[1] < 0 ? 0 : (end_time_range[1] > 24 ? 24 : end_time_range[1]);
	
	max_price *= 10;
	return true;
}

function run() {
	if(args.length < 6) {
		console.log('usage: node main.js [date] [from] [to] [min_wait_time] [max_wait_time] [preference] [start_time_range] [end_time_range] [required_seat_num] [max_solutions] [max_duration] [max_price] [same_station_transfer]');
		return;
	}
	
	if(init()){
		findAllRoutes();
	}
}

run();