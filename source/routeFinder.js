var pathHelper = require(__dirname + '/lib/pathHelper.js');

var https = require(pathHelper.getLibFile('clientget.js')),
	mongo = require(pathHelper.getLibFile('mongo.js')),
	utility = require(pathHelper.getLibFile('utility.js')),
	station = require(pathHelper.getDataFile('station.js')),
	seat = require(pathHelper.getDataFile('seat.js')),
	assert = require('assert');
	
var error_file = pathHelper.getLogErrorFile('routeFinder.err'),
	log_file = pathHelper.getLogMessageFile('routeFinder.log');

var seat_num_code = Object.keys(seat.num_code2name),
	start_time = new Date(),
	same_station_map = {},
	static_run;

var default_values = {
	consider_transfer: true,
	min_wait_time: 60,
	max_wait_time: 120,
	same_station_transfer: false,
	start_time_range: [0,24],
	end_time_range: [0,24],
	seat_type: [1,1,1,1,1,1,1,1,1,1,1],
	ticket_num: 1,
	max_solutions: 10,
	max_duration: Infinity,
	max_price: Infinity
}

function checkRequiredFieldsType(input_param) {
	return checkRequiredFieldType(input_param, "date", "string")
		&& checkRequiredFieldType(input_param, "from", "string")
		&& checkRequiredFieldType(input_param, "to", "string")
		&& checkRequiredFieldType(input_param, "order_by", "string");
}

function checkRequiredFieldType(input_param, field, type) {
	return input_param[field] != null && typeof input_param[field] === type;
}

function checkOptionalFieldsType(input_param) {
	return checkOptionalFieldType(input_param, "consider_transfer", "boolean")
		&& checkOptionalFieldType(input_param, "min_wait_time", "number")
		&& checkOptionalFieldType(input_param, "max_wait_time", "number")
		&& checkOptionalFieldType(input_param, "same_station_transfer", "boolean")
		&& checkOptionalFieldType(input_param, "start_time_range", Array)
		&& checkOptionalFieldType(input_param, "end_time_range", Array)
		&& checkOptionalFieldType(input_param, "seat_type", Array)
		&& checkOptionalFieldType(input_param, "ticket_num", "number")
		&& checkOptionalFieldType(input_param, "max_solutions", "number")
		&& checkOptionalFieldType(input_param, "max_duration", "number")
		&& checkOptionalFieldType(input_param, "max_price", "number");
}

function checkOptionalFieldType(input_param, field, type) {
	if(input_param[field] == null) {
		input_param[field] = default_values[field];
	}
	return typeof input_param[field] === type || (typeof input_param[field] === "object" && input_param[field] instanceof type);
}

function checkTimeRange(time_range) {
	return time_range.length === 2 && typeof time_range[0] === 'number' && typeof time_range[1] === 'number' && time_range[0] <= time_range[1] && time_range[0] >= 0 && time_range[0] <= 24 && time_range[1] >= 0 && time_range[1] <= 24;
}

function checkSeatType(seat_type) {
	if(seat_type.length !== seat_num_code.length) {
		setErrorMessage('[seat_type] should be length ' + seat_num_code.length);
		return false;
	}
	for(var i = 0; i < seat_type.length; i++) {
		if(typeof seat_type[i] !== 'number') {
			setErrorMessage('all data in [seat_type] should be of type number');
			return false;
		}
	}
	return true;
}

function check(input_param) {
	// check field type
	if(!checkRequiredFieldsType(input_param) || !checkOptionalFieldsType(input_param)) {
		setErrorMessage('field type error !');
		return false;
	}
	
	if(input_param.order_by !== 'time' && input_param.order_by !== 'price') {
		setErrorMessage('[order_by] should be "time" or "price".');
		return false;
	}
	
	if(!checkTimeRange(input_param.start_time_range) || !checkTimeRange(input_param.end_time_range)){
		setErrorMessage('format of [start_time_range] or [end_time_range] should be like [XX,YY] where XX and YY are both valid hours (0~24), and XX should <= YY');
		return false;
	}
	
	if(!checkSeatType(input_param.seat_type)) {
		return false;
	}
	
	if(station.code2name[input_param.from] == null || station.code2name[input_param.to] == null) {
		setErrorMessage('please input 2 valid stations !');
		return false;
	}
	
	input_param.max_price *= 10;
	return true;
}

function findAllRoutes(result_handler, error_handler) {
	var remaining = 2;
	
	mongo.findOne('station', input_param.from, function(key, data){
		same_station_map[key] = data.value.data.sameStations;
		if(--remaining === 0) {
			findFeasibleRoutes(input_param.from, input_param.to, result_handler, error_handler);
		}
	});
	
	mongo.findOne('station', input_param.to, function(key, data){
		same_station_map[key] = data.value.data.sameStations;
		if(--remaining === 0) {
			findFeasibleRoutes(input_param.from, input_param.to, result_handler, error_handler);
		}
	});
}

function findFeasibleRoutes(from, to, result_handler, error_handler) {
	var direct_routes = [],
		routes1 = [],
		routes2 = [],
		remaining = input_param.consider_transfer ? 3 : 1;
	
	findDirectRoute(from, to, function(routes) {
		direct_routes = routes;
		if(--remaining === 0) {
			processRoutes(direct_routes, routes1, routes2, result_handler, error_handler);
		}
	});
	
	if(input_param.consider_transfer) {
		findRoute1(from, function(routes) {
			routes1 = routes;
			if(--remaining === 0) {
				processRoutes(direct_routes, routes1, routes2, result_handler, error_handler);
			}
		});
		
		findRoute2(to, function(routes) {
			routes2 = routes;
			if(--remaining === 0) {
				processRoutes(direct_routes, routes1, routes2, result_handler, error_handler);
			}
		});
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
	train_code: "",
	start_time: "",
	end_time: "",
	duration: "",
	seat_price: []
 */
function processRoutes(dr, r1, r2, result_handler, error_handler) {
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

	if(input_param.consider_transfer) {
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
	}
	
	if(input_param.order_by === "time") {
		result.sort(sortByDuration);
	} else if(input_param.order_by === "price") {
		result.sort(sortByPrice);
	}

	if(static_run){
		typeof result_handler === 'function' && result_handler(result);
		console.log("\nTotal query cost: " + (new Date() - start_time) + " ms");
		//mongo.closeDb();
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
			//mongo.closeDb();
		});
	}
}

function getRequiredSeatPrice(seat_price) {
	var result = {min_price: Infinity};
	
	// get only required seat price (specified by seat_type). other seat price will be ignored.
	for(var prop in seat_price) {
		if(input_param.seat_type[seat.price_2_num_index[prop]] > 0 && seat_price[prop] <= input_param.max_price) {
			result.min_price = Math.min(seat_price[prop], result.min_price);
			result[prop] = seat_price[prop];
		}
	}
	
	return result;
}
 
function canTransfer(r1, r2) {
	if(input_param.same_station_transfer) {
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
	return hasTicket(seat_price)
		&& duration <= input_param.max_duration
		&& seat_price.min_price <= input_param.max_price
		&& start_time_hour >= input_param.start_time_range[0]
		&& start_time_hour < input_param.start_time_range[1]
		&& end_time_hour >= input_param.end_time_range[0]
		&& end_time_hour < input_param.end_time_range[1];
}
 
function isTransferQualified(duration1, wait_time, duration2, seat_price1, seat_price2, start_time, end_time) {
	var total_duration = duration1 + wait_time + duration2,
		total_min_price = seat_price1.min_price + seat_price2.min_price,
		start_time_hour = new Date('2015-03-15,' + start_time).getHours(),
		end_time_hour = new Date('2015-03-15,' + end_time).getHours();
	return hasTicket(seat_price1)
		&& hasTicket(seat_price2)
		&& wait_time >= input_param.min_wait_time
		&& wait_time <= input_param.max_wait_time
		&& total_duration <= input_param.max_duration
		&& total_min_price <= input_param.max_price
		&& start_time_hour >= input_param.start_time_range[0]
		&& start_time_hour < input_param.start_time_range[1]
		&& end_time_hour >= input_param.end_time_range[0]
		&& end_time_hour < input_param.end_time_range[1];
}

function sortByDuration(r1, r2) {
	return (r1.total_duration !== r2.total_duration) ? (r1.total_duration - r2.total_duration) : (r1.min_price - r2.min_price);
}

function sortByPrice(r1, r2) {
	return (r1.min_price !== r2.min_price) ? (r1.min_price - r2.min_price) : (r1.total_duration - r2.total_duration);
}

function pushAsBackup(solution, backup_solutions) {
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
	var backup_solutions = [];
	var ticket_cache = {};
	logMessage("[queryTicket] start to query maximum " + input_param.max_solutions + " solutions");
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
		
		if(solution == null || current_index >= input_param.max_solutions) {
			//solution == null means all candidate solutions have been searched.
			for(var i = 0; i < (input_param.max_solutions - current_index) && i < backup_solutions.length; i++) {
				// if solution number doesn't reach to max_solutions, and backup_solutions has remained solutions, then add them to the final solution
				logMessage("[queryTicket] find available solution " + (i + current_index + 1) + " from backup solutions: " + JSON.stringify(backup_solutions[i]));
				all_solutions.push(backup_solutions[i]);
			}
			logMessage("[queryTicket] all query done. find total " + all_solutions.length + " solutions.", true);
			typeof callback === 'function' && callback.call(this, all_solutions);
		} else {
			queryTicketRecur(current_index, routes, cb, backup_solutions, ticket_cache);
		}
	};
	
	queryTicketRecur(current_index, routes, cb, backup_solutions, ticket_cache);
}

function queryTicketRecur(i, routes, callback, backup_solutions, ticket_cache) {
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
				
				if(input_param.order_by === "price") {
					// if price preference is selected, then need special treatment.
					if(actual_min_price !== routes[i].min_price) {
						// if min_price doesn't keep same as original, then backup this solution, and query next ticket
						logMessage("[queryTicketRecur] min_price changed, will store it as backup solution !");
						logMessage("[queryTicketRecur] original min_price: " + routes[i].min_price);
						logMessage("[queryTicketRecur] actual min_price: " + actual_min_price);
						assert(actual_min_price > routes[i].min_price);
						pushAsBackup(current_solution, backup_solutions);
						routes.splice(i, 1);
						queryTicketRecur(i, routes, callback, backup_solutions, ticket_cache);
					} else {
						if(backup_solutions.length > 0 && compareBackupSolution(backup_solutions[0], current_solution)){
							// if backup_solutions[0] is better than current solution, then get backup_solutions[0] as result, and update related record
							logMessage("[queryTicketRecur] backup solution is better than current solution, will return backup solution !");
							logMessage("[queryTicketRecur] backup: " + JSON.stringify(backup_solutions[0]));
							logMessage("[queryTicketRecur] current: " + JSON.stringify(current_solution));
							routes.splice(i, 1, backup_solutions[0].route);
							var previous_solution = current_solution;
							current_solution = backup_solutions.shift().ticket;
							pushAsBackup(previous_solution, backup_solutions);
						}
						typeof callback === 'function' && callback.call(this, current_solution);
					}
				} else {
					typeof callback === 'function' && callback.call(this, current_solution);
				}
			} else {
				// no ticket for current route. query next route
				routes.splice(i, 1);
				queryTicketRecur(i, routes, callback, backup_solutions, ticket_cache);
			}
		}
	};
	
	if(i < routes.length) {
		logMessage("[queryTicketRecur] start to query solution " + (i + 1));
		if(routes[i].transfer != null) {
			tickets_need_query = 2;
			logMessage("[queryTicketRecur] query transfer for " + routes[i].train_code[0] + " and " + routes[i].train_code[1]);
			queryTicketInternal(input_param.date, routes[i].start, routes[i].transfer[0], routes[i].train_code[0], routes[i].seat_price[0], 0, cb, ticket_cache);
			queryTicketInternal(utility.getActualDate(input_param.date, routes[i].start_time[0], routes[i].duration[0] + routes[i].wait_time), routes[i].transfer[1], routes[i].end, routes[i].train_code[1], routes[i].seat_price[1], 1, cb, ticket_cache);
		} else {
			tickets_need_query = 1;
			logMessage("[queryTicketRecur] query direct for " + routes[i].train_code);
			queryTicketInternal(input_param.date, routes[i].start, routes[i].end, routes[i].train_code, routes[i].seat_price, 0, cb, ticket_cache);
		}
	} else {
		typeof callback === 'function' && callback.call(this, null);
	}
}

function queryTicketInternal(date, from, to, train_code, seat_price, index, cb, cache) {
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
				var total_ticket_num = 0;
				for(var prop in seat_price) {
					if(prop !== 'min_price') {
						var index = seat.price_2_num_index[prop],
							ticket_num = parseInt(ticket_info[i][seat_num_code[index]]);
						if(!isNaN(ticket_num) && ticket_num > 0) {
							total_ticket_num += ticket_num;
							num[seat_num_code[index]] = ticket_num;
							price[prop] = seat_price[prop];
							// need recalculate actual min_price due to the variation of the ticket number
							min_price = Math.min(min_price, seat_price[prop]);
						}
					}
				}
				
				// total_ticket_num should not be less than required ticket_num, or just return an empty result
				if(total_ticket_num >= input_param.ticket_num) {
					// assign an actual min_price in min_price field
					price['min_price'] = min_price;
					result.num = num;
					result.price = price;
				}
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

var error_msg = "";
function setErrorMessage(msg) {
	error_msg = msg;
	logError(msg);
}

var input_param;
function run(input, get_static_result, result_handler, error_handler) {
	static_run = (get_static_result === true);
	
	start_time = new Date();
	if(check(input)){
		input_param = input;
		findAllRoutes(result_handler, error_handler);
	} else {
		typeof error_handler === 'function' && error_handler(error_msg);
	}
}

exports.run = run;