var routeFinder = require('./routeFinder.js');

var callback;

function getResponse(routes, tickets) {
	var response = [];
	for(var i = 0; i < tickets.length; i++){
		var res = {};
		res.start = routes[i].start;
		res.end = routes[i].end;
		if(routes[i].transfer != null) {
			res.transfer = routes[i].transfer;
			res.wait_time = routes[i].wait_time;
		}
		res.train_code = routes[i].train_code;
		res.start_time = routes[i].start_time;
		res.end_time = routes[i].end_time;
		res.total_duration = routes[i].total_duration;
		tickets[i].forEach(function(ticket) {
			adjustPrice(ticket.price);
			delete ticket.train_code;
		});
		res.ticket_info = tickets[i];
		response.push(res);
	}
	typeof callback === 'function' && callback.call(this, response);
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
	routeFinder.run(args, false /* static_run */, getResponse);
}