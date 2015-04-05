var https = require('./lib/clientget.js'),
	mongo = require('./lib/mongo.js'),
	utility = require('./lib/utility.js'),
	station = require('./crawler/train/data/station.js'),
	seat = require('./crawler/train/data/seat.js'),
	assert = require('assert');
	
var error_file = '../log/error/routeFinder.err',
	log_file = '../log/message/routeFinder.log';

var seat_num_code = Object.keys(seat.num_code2name),
	start_time = new Date(),
	same_station_map = {};

function findAllRoutes(result_handler) {
	var remaining = 2;
	
	if(from != null && to != null && station.code2name[from] != null && station.code2name[to] != null) {
		mongo.findOne('station', from, function(key, data){
			same_station_map[key] = data.value.data.sameStations;
			if(--remaining === 0) {
				findFeasibleRoutes(from, to, result_handler);
			}
		});
		
		mongo.findOne('station', to, function(key, data){
			same_station_map[key] = data.value.data.sameStations;
			if(--remaining === 0) {
				findFeasibleRoutes(from, to, result_handler);
			}
		});
	} else {
		console.log('please input 2 valid stations !');
	}
}

function findFeasibleRoutes(from, to, result_handler) {
	var direct_routes = [],
		routes1 = [],
		routes2 = [],
		remaining = 3;
	
	findDirectRoute(from, to, function(routes) {
		direct_routes = routes;
		if(--remaining === 0) {
			processRoutes(direct_routes, routes1, routes2, result_handler);
		}
	});
	
	findRoute1(from, function(routes) {
		routes1 = routes;
		if(--remaining === 0) {
			processRoutes(direct_routes, routes1, routes2, result_handler);
		}
	});
	
	findRoute2(to, function(routes) {
		routes2 = routes;
		if(--remaining === 0) {
			processRoutes(direct_routes, routes1, routes2, result_handler);
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
function processRoutes(dr, r1, r2, result_handler) {
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
			if(r1[i].same_trains !== r2[j].same_trains && canTransfer(r1[i], r2[j])) {
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
	

	if(static_run){
		typeof result_handler === 'function' && result_handler(result);
		console.log("\nTotal query cost: " + (new Date() - start_time) + " ms");
		mongo.closeDb();
	} else{
		queryTicket(result, function(all_solutions){
			/* 
				format of one solution should be like
				{
					route:  {} // route info
					ticket: {} // ticket info
					min_price: // dynamic actual min price
				}
			*/
			typeof result_handler === 'function' && result_handler(all_solutions);
			console.log("\nTotal query cost: " + (new Date() - start_time) + " ms");
			mongo.closeDb();
		});
	}
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
 
function canTransfer(r1, r2) {
	if(same_station_transfer) {
		return r1.end === r2.start;
	} else {
		// all start_same_stations.length and end_same_stations.length are > 0 (checked by test/checkEmptySameStations.js)
		// the same_stations order won't affect the result (checked by test/checkSameStationsOrder.js)
		return r1.end_same_stations === r2.start_same_stations;
	}
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

function sortByDuration(r1, r2) {
	return (r1.total_duration !== r2.total_duration) ? (r1.total_duration - r2.total_duration) : (r1.min_price - r2.min_price);
}

function sortByPrice(r1, r2) {
	return (r1.min_price !== r2.min_price) ? (r1.min_price - r2.min_price) : (r1.total_duration - r2.total_duration);
}

var backup_solutions = [];
function pushAsBackup(solution) {
	var len = backup_solutions.length;
	if(len === 0 || compareBackupSolution(backup_solutions[len - 1], solution)) {
		backup_solutions.push(solution);
		return;
	}
	
	// backup_solutions should store solutions in ascending order
	for(var i = 0; i < backup_solutions.length; i++) {
		if(compareBackupSolution(solution, backup_solutions[i])) {
			backup_solutions.splice(i, 0, solution);
			return;
		}
	}
}

function compareBackupSolution(solution1, solution2) {
	// if solution1 is better than solution2, then return true
	return solution1.min_price < solution2.min_price || (solution1.min_price === solution2.min_price && solution1.route.total_duration < solution2.route.total_duration);
}

function queryTicket(routes, callback) {
	var current_index = 0;
	var all_solutions = [];
	logMessage("[queryTicket] start to query maximum " + max_solutions + " solutions");
	var cb = function(solution){
		/* 
			format of solution should be like
			{
				route:  {} // route info
				ticket: {} // ticket info
				min_price: // dynamic actual min price
			}
		*/
		if(solution != null) {
			all_solutions.push(solution);
			++current_index;
			logMessage("[queryTicket] find available solution " + current_index + ": " + JSON.stringify(solution));
		}
		
		if(solution == null || current_index >= max_solutions) {
			//solution == null means all candidate solutions have been searched.
			for(var i = 0; i < (max_solutions - current_index) && i < backup_solutions.length; i++) {
				// if solution number doesn't reach to max_solutions, and backup_solutions has remained solutions, then add them to the final solution
				logMessage("[queryTicket] find available solution " + (i + current_index + 1) + " from backup solutions: " + JSON.stringify(backup_solutions[i]));
				all_solutions.push(backup_solutions[i]);
			}
			logMessage("[queryTicket] all query done. find total " + all_solutions.length + " solutions.", true);
			typeof callback === 'function' && callback.call(this, all_solutions);
		} else {
			queryTicketRecur(current_index, routes, cb);
		}
	};
	
	queryTicketRecur(current_index, routes, cb);
}

function queryTicketRecur(i, routes, callback) {
	var tickets_need_query = 0;
	var success = true;
	var route_tickets = [];
	var actual_min_price = 0;
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
		route_tickets[index] = result;
		// need recalculate actual min_price due to the variation of the ticket number
		actual_min_price += (result.price != null ? result.price.min_price : Infinity);
		if(--tickets_need_query === 0) {
			// all ticket data coming. do next step
			if(success) {
				// get the ticket for current route
				var current_solution = {};
				current_solution.route = routes[i];
				current_solution.ticket = route_tickets;
				current_solution.min_price = actual_min_price;
				
				if(preference === "price") {
					// if price preference is selected, then need special treatment.
					if(actual_min_price !== routes[i].min_price) {
						// if min_price doesn't keep same as original, then backup this solution, and query next ticket
						logMessage("[queryTicketRecur] min_price changed, will store it as backup solution !");
						logMessage("[queryTicketRecur] original min_price: " + routes[i].min_price);
						logMessage("[queryTicketRecur] actual min_price: " + actual_min_price);
						assert(actual_min_price > routes[i].min_price);
						pushAsBackup(current_solution);
						routes.splice(i, 1);
						queryTicketRecur(i, routes, callback);
					} else {
						if(backup_solutions.length > 0 && compareBackupSolution(backup_solutions[0], current_solution)){
							// if backup_solutions[0] is better than current solution, then get backup_solutions[0] as result, and update related record
							logMessage("[queryTicketRecur] backup solution is better than current solution, will return backup solution !");
							logMessage("[queryTicketRecur] backup: " + JSON.stringify(backup_solutions[0]));
							logMessage("[queryTicketRecur] current: " + JSON.stringify(current_solution));
							routes.splice(i, 1, backup_solutions[0].route);
							var previous_solution = current_solution;
							current_solution = backup_solutions.shift().ticket;
							pushAsBackup(previous_solution);
						}
						typeof callback === 'function' && callback.call(this, current_solution);
					}
				} else {
					typeof callback === 'function' && callback.call(this, current_solution);
				}
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
			queryTicketInternal(utility.getActualDate(date, routes[i].start_time[0], routes[i].duration[0] + routes[i].wait_time), routes[i].transfer[1], routes[i].end, routes[i].train_code[1], routes[i].seat_price[1], 1, cb);
		} else {
			tickets_need_query = 1;
			logMessage("[queryTicketRecur] query direct for " + routes[i].train_code);
			queryTicketInternal(date, routes[i].start, routes[i].end, routes[i].train_code, routes[i].seat_price, 0, cb);
		}
	} else {
		typeof callback === 'function' && callback.call(this, null);
	}
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
		price = {},
		min_price = Infinity;
	result.train_code = train_code;
	if(ticket_info != null) {
		for(var i = 0; i < ticket_info.length; i++) {
			// it is probably that we can't find the specified train_code across all trains, e.g. K533 from 上海南 to 金华 is only opened in 2015-04-01, so when date change to 2015-04-02, we can't find K533 any more
			if(ticket_info[i].station_train_code === train_code) {
				// search required seat ticket
				for(var prop in seat_price) {
					if(prop !== 'min_price') {
						var index = seat.price_2_num_index[prop],
							ticket_num = parseInt(ticket_info[i][seat_num_code[index]]);
						if(!isNaN(ticket_num) && ticket_num >= required_seat_num[index]) {
							num[seat_num_code[index]] = ticket_num;
							price[prop] = seat_price[prop];
							// need recalculate actual min_price due to the variation of the ticket number
							min_price = Math.min(min_price, seat_price[prop]);
						}
					}
				}
				
				// assign an actual min_price in min_price field
				price['min_price'] = min_price;
				result.num = num;
				result.price = price;
				break;
			}
		}
	}
	return result;
}
 
function hasTicket(obj) {
	return typeof obj === 'object' && Object.getOwnPropertyNames(obj).length > 1;
}

var mins_per_day = 24 * 60;
function calculateMins(start, end) {
	var s = new Date("2015/10/15," + start),
		e = new Date("2015/10/15," + end),
		diff = ((e - s) / 60000);
	return diff >= 0 ? diff : (diff + mins_per_day);
}

function logError(msg) {
	utility.logError(error_file, msg, "routeFinder");
}

function logMessage(msg, display_in_console) {
	var display = display_in_console != null ? display_in_console : false;
	utility.logMessage(log_file, msg, "routeFinder", display);
}

var date,
	from,
	to,
	min_wait_time,
	max_wait_time,
	preference,
	start_time_range,
	end_time_range,
	required_seat_num,
	max_solutions,
	max_duration,
	max_price,
	same_station_transfer;
function init(args) {
	date = args[0];
	from = args[1];
	to = args[2];
	min_wait_time = args[3];
	max_wait_time = args[4];
	preference = args[5];								// valid value: "time" or "price"
	max_solutions = (args[6] || 5);						// optional parameter. default value: 5.
	same_station_transfer = (args[7] === 'true');		// optional parameter (compared to same_city_transfer). default value: false.
	max_duration = args[8] || Infinity;					// optional parameter
	max_price = args[9] || Infinity;					// optional parameter
	start_time_range = args[10];							// optional parameter. e.g. [8,10] which means 8:00 - 10:00
	end_time_range = args[11];							// optional parameter. same as above.
	required_seat_num = args[12];						// optional parameter. format like [2,3,0,0,5,0,0,0,2,0,0], corresponds to seat definition in data/seat.js. default value: all 1
	
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

var static_run;
function run(args, get_static_result, result_handler) {
	static_run = (get_static_result === true);
	
	if(args.length < 6) {
		console.log('please provide following arguments: [date] [from] [to] [min_wait_time] [max_wait_time] [preference] [max_solutions] [same_station_transfer] [max_duration] [max_price] [start_time_range] [end_time_range] [required_seat_num]');
		return;
	}
	
	if(init(args)){
		findAllRoutes(result_handler);
	}
}

exports.run = run;