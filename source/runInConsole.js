var pathHelper = require(__dirname + '/lib/pathHelper.js');

var routeFinder = require(pathHelper.getRootFile('routeFinder.js')),
	utility = require(pathHelper.getLibFile('utility.js')),
	station = require(pathHelper.getDataFile('station.js')),
	seat = require(pathHelper.getDataFile('seat.js'));
	
var seat_num_code = Object.keys(seat.num_code2name);

/* 
	format of solution should be like
	{
		route:  {} // route info
		ticket: {} // ticket info
		min_price: // dynamic actual min price
	}
*/
function printRoutes(solutions) {
	for(var i = 0; i < solutions.length; i++){
		console.log('\nSolution ' + (i + 1) + ':');
		var route = solutions[i].route,
			ticket = solutions[i].ticket;
		if(route.transfer != null) {
			printTranserRoute(route, ticket);
		} else {
			printDirectRoute(route, ticket);
		}
	}
}

function printTranserRoute(route, ticket) {
	console.log('Transfer solution:');
	
	// route 1:
	console.log('\t1. Take ' + route.train_code[0] + ' at [' + date + ',' + route.start_time[0] + '] from station ' + station.code2name[route.start] + ', arrive at [' + utility.getActualDate(date, route.start_time[0], route.duration[0]) + ',' + route.end_time[0] + '] at station ' + station.code2name[route.transfer[0]] + ', time consumption: ' + route.duration[0] + ' minutes.');
	console.log('\t\tQualified tickets: \n\t\t\t' + generateTicketInfoString(ticket[0]));
	
	// transfer:
	if(route.transfer[0] === route.transfer[1]) {
		console.log('\t2. Wait ' + route.wait_time + ' minutes at station ' + station.code2name[route.transfer[0]]);
	} else {
		console.log('\t2. Go to transfer station ' + station.code2name[route.transfer[1]] + ' within ' + route.wait_time + ' minutes');
	}
	
	// route 2:
	var date2 = utility.getActualDate(date, route.start_time[0], route.duration[0] + route.wait_time);
	console.log('\t3. Take ' + route.train_code[1] + ' at [' + date2 + ',' + route.start_time[1] + '] from station ' + station.code2name[route.transfer[1]] + ', arrive at [' + utility.getActualDate(date2, route.start_time[1], route.duration[1]) + ',' + route.end_time[1] + '] at station ' + station.code2name[route.end] + ', time consumption: ' + route.duration[1] + ' minutes.');
	console.log('\t\tQualified tickets: \n\t\t\t' + generateTicketInfoString(ticket[1]));
	
	console.log('Total consumption: ' + route.total_duration + " minutes, ￥" + (ticket[0].price.min_price + ticket[1].price.min_price) / 10.0);
}

function printDirectRoute(route, ticket) {
	console.log('Direct solution:');
	console.log('\tTake ' + route.train_code + ' at [' + date + ',' + route.start_time + '] from station ' + station.code2name[route.start] + ', arrive at [' + utility.getActualDate(date, route.start_time, route.total_duration) + ',' + route.end_time + '] at station ' + station.code2name[route.end] + ', time consumption: ' + route.total_duration + ' minutes.');
	console.log('\t\tQualified tickets: \n\t\t\t' + generateTicketInfoString(ticket[0]));
	console.log('Total consumption: ' + route.total_duration + " minutes, ￥" + ticket[0].price.min_price / 10.0);
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

function setField(obj, field, value) {
	if(value != null && (typeof value !== 'number' || !isNaN(value))) {
		obj[field] = value;
	}
}

function checkAndConvertArgs(args) {
	var ret = {};
	
	if(args.length < 4) {
		console.log('please provide arguments in following order:')
		console.log('required: [date] [from] [to] [preference]');
		console.log('optional: [max_solutions] [consider_transfer] [min_wait_time] [max_wait_time] [same_station_transfer] [max_duration] [max_price] [start_time_range] [end_time_range] [required_seat_type] [required_ticket_num]');
		return ret;
	}
	
	setField(ret, 'date', args[0]);
	setField(ret, 'from', args[1]);
	setField(ret, 'to', args[2]);
	setField(ret, 'order_by', args[3]);
	setField(ret, 'max_solutions', parseInt(args[4]));
	setField(ret, 'consider_transfer', args[5] != null ? args[5] === 'true' : args[5]);
	setField(ret, 'min_wait_time', parseInt(args[6]));
	setField(ret, 'max_wait_time', parseInt(args[7]));
	setField(ret, 'same_station_transfer', args[8] != null ? args[8] === 'true' : args[8]);
	setField(ret, 'max_duration', parseInt(args[9]));
	setField(ret, 'max_price', parseInt(args[10]));
	setField(ret, 'start_time_range', args[11] != null ? JSON.parse(args[11]) : args[11]);
	setField(ret, 'end_time_range', args[12] != null ? JSON.parse(args[12]) : args[12]);
	setField(ret, 'seat_type', args[13] != null ? JSON.parse(args[13]) : args[13]);
	setField(ret, 'ticket_num', parseInt(args[14]));
	
	return ret;
}

function errorHandler(msg) {
	console.log('run failed: ' + msg);
}

function run(args, result_handler, error_handler) {
	var input_param = checkAndConvertArgs(args)
	
	if(Object.keys(input_param).length > 0){
		routeFinder.run(input_param, false /* static_run */, result_handler, error_handler);
	}
}

var args = process.argv.splice(2),
	date = args[0];
	
run(args, printRoutes, errorHandler);