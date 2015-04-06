var pathHelper = require(__dirname + '/lib/pathHelper.js');

var routeFinder = require(pathHelper.getRootFile('routeFinder.js')),
	utility = require(pathHelper.getLibFile('utility.js')),
	station = require(pathHelper.getDataFile('station.js')),
	seat = require(pathHelper.getDataFile('seat.js'));
	
var seat_num_code = Object.keys(seat.num_code2name);

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
	// route 1:
	console.log('\t1. Take ' + route.train_code[0] + ' at [' + date + ',' + route.start_time[0] + '] from station ' + station.code2name[route.start] + ', arrive at [' + utility.getActualDate(date, route.start_time[0], route.duration[0]) + ',' + route.end_time[0] + '] at station ' + station.code2name[route.transfer[0]] + ', time consumption: ' + route.duration[0] + ' minutes.');
	console.log('\t\tQualified tickets: \n\t\t\t' + generateTicketInfoString(route.seat_price[0]));
	
	// transfer:
	if(route.transfer[0] === route.transfer[1]) {
		console.log('\t2. Wait ' + route.wait_time + ' minutes at station ' + station.code2name[route.transfer[0]]);
	} else {
		console.log('\t2. Go to transfer station ' + station.code2name[route.transfer[1]] + ' within ' + route.wait_time + ' minutes');
	}
	
	// route 2:
	var date2 = utility.getActualDate(date, route.start_time[0], route.duration[0] + route.wait_time);
	console.log('\t3. Take ' + route.train_code[1] + ' at [' + date2 + ',' + route.start_time[1] + '] from station ' + station.code2name[route.transfer[1]] + ', arrive at [' + utility.getActualDate(date2, route.start_time[1], route.duration[1]) + ',' + route.end_time[1] + '] at station ' + station.code2name[route.end] + ', time consumption: ' + route.duration[1] + ' minutes.');
	console.log('\t\tQualified tickets: \n\t\t\t' + generateTicketInfoString(route.seat_price[1]));
	
	console.log('Total consumption: ' + route.total_duration + " minutes, ￥" + (route.seat_price[0].min_price + route.seat_price[1].min_price) / 10.0);
}

function printCandidateDirectRoute(route) {
	console.log('Direct solution:');
	console.log('\tTake ' + route.train_code + ' at [' + date + ',' + route.start_time + '] from station ' + station.code2name[route.start] + ', arrive at [' + utility.getActualDate(date, route.start_time, route.total_duration) + ',' + route.end_time + '] at station ' + station.code2name[route.end] + ', time consumption: ' + route.total_duration + ' minutes.');
	console.log('\t\tQualified tickets: \n\t\t\t' + generateTicketInfoString(route.seat_price));
	console.log('Total consumption: ' + route.total_duration + " minutes, ￥" + route.seat_price.min_price / 10.0);
}

function generateTicketInfoString(all_seat_price) {
	var str = '';
	for(var prop in all_seat_price) {
		if(prop !== 'min_price') {
			var seat_code = seat_num_code[seat.price_2_num_index[prop]],
				seat_name = seat.num_code2name[seat_code],
				seat_price = all_seat_price[prop] / 10.0;
			str += (seat_name + ': (price: ￥' + seat_price + '), ');
		}
	}
	return str;
}

var args = process.argv.splice(2),
	date = args[0];

routeFinder.run(args, true /* static_run */, printCandidateRoutes);