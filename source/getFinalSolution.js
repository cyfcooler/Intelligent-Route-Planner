var pathHelper = require(__dirname + '/lib/pathHelper.js');

var routeFinder = require(pathHelper.getRootFile('routeFinder.js'));

var callback;

/* 
	format of solution should be like
	{
		route:  {} // route info
		ticket: {} // ticket info
		min_price: // dynamic actual min price
	}
	
	format of direct route should be like
	{
		start: "",
		end: "",
		train_code: "",
		start_time: "",
		end_time: "",
		total_duration: number,
		seat_price: Array,
		min_price: seat_price.min_price (static min price)
	}
	
	format of transfer route (only transfer once) should be like
	{
		start: "",
		end: "",
		transfer: Array[2],
		wait_time: number,
		train_code: Array[2],
		start_time: Array[2],
		end_time: Array[2],
		duration: Array[2],
		total_duration: number,
		seat_price: Array[2],
		min_price: seat_price[0].min_price + seat_price[1].min_price (static min price)
	}
	
	format of ticket should be like
	{
		train_code: ... (must-have field)
		num: {
			yz_num: ...
			rz_num: ...
			...: ... (required and available seat number)
		},
		price: {
			min_price: ... (must-have field, actual min price, dynamic min price)
			yz_price: ...
			rz_price: ...
			...: ... (required and available seat price)
		}
	}
*/
function generateResponse(solutions) {
	var response = [];
	for(var i = 0; i < solutions.length; i++){
		if(solutions[i].route.transfer != null) {
			response.push(generateTransferResult(solutions[i].route, solutions[i].ticket));
		} else {
			response.push(generateDirectResult(solutions[i].route, solutions[i].ticket));
		}
	}
	typeof callback === 'function' && callback.call(this, response);
}

function generateTransferResult(route, ticket) {
	var train_info = [{}, {}]; // Array of 2 empty objects
	
	//1st train
	train_info[0].train_code = route.train_code[0];
	train_info[0].start = route.start;
	train_info[0].end = route.transfer[0];
	train_info[0].start_time = route.start_time[0];
	train_info[0].end_time = route.end_time[0];
	train_info[0].duration = route.duration[0];
	train_info[0].ticket_info = adjustTicket(ticket);
	
	//2nd train
	train_info[1].train_code = route.train_code[1];
	train_info[1].start = route.transfer[1];
	train_info[1].end = route.end;
	train_info[1].start_time = route.start_time[1];
	train_info[1].end_time = route.end_time[1];
	train_info[1].duration = route.duration[1];
	train_info[1].ticket_info = adjustTicket(ticket);

	var ret = {};
	ret.train_info = train_info;
	ret.wait_time = [route.wait_time];
	ret.total_duration = route.total_duration;
	
	return ret;
}

function generateDirectResult(route, ticket) {
	var train_info = [{}]; // Array of 1 empty object
	
	train_info[0].train_code = route.train_code;
	train_info[0].start = route.start;
	train_info[0].end = route.end;
	train_info[0].start_time = route.start_time;
	train_info[0].end_time = route.end_time;
	train_info[0].duration = route.duration;
	train_info[0].ticket_info = adjustTicket(ticket);
	
	var ret = {};
	ret.train_info = train_info;
	ret.wait_time = [];
	ret.total_duration = route.total_duration;
	
	return ret;
}

function adjustTicket(ticket) {
	ticket.forEach(function(ticket) {
		adjustPrice(ticket.price);
		delete ticket.train_code;
	});
	return ticket;
}

function adjustPrice(price) {
	adjustOneSeatPrice(price, 'yrrb_price', 'qt_price');	// 一人软包 -> 其它
	adjustOneSeatPrice(price, 'bxyw_price', 'qt_price');	// 包厢硬卧 -> 其它
	adjustOneSeatPrice(price, 'ydrz_price', 'zy_price');	// 一等软座 -> 一等座
	adjustOneSeatPrice(price, 'edrz_price', 'ze_price');	// 二等软座 -> 二等座
}

function adjustOneSeatPrice(price, source_seat_price_code, target_seat_price_code) {
	if(price[source_seat_price_code] != null) {
		price[target_seat_price_code] = price[source_seat_price_code];
		delete price[source_seat_price_code];
	}
}

exports.getFinalSolution = function(args, cb) {
	callback = cb;
	routeFinder.run(args, false /* static_run */, generateResponse);
}