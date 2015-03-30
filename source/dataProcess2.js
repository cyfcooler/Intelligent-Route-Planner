var mongo = require('./lib/mongo.js'),
	station = require('./data/station.js');
	
var station_codes = Object.keys(station.code2name),
	remaining = station_codes.length;

function generateIntermediateTable(){
	var i = -1,
		completed = 0,
		route_map = {};
	console.log('total station: ' + station_codes.length);
	var interval = setInterval(function(){
		if(++i === station_codes.length) {
			clearInterval(interval);
		} else {
			mongo.find('station_station', {start: station_codes[i]}, function(key, data) {
				// mongo.find would return an array, so no need to check data != null
				route_map[key.start] = data;
				if(++completed === station_codes.length) {
					console.log("all results stored in memory, start writing to DB !");
					mongo.insertDb('station_route_map', null, route_map, function(){
						console.log("successfully insert station_route_map into DB !");
					});
				} else {
					console.log('station ' + key.start + ' done. Remaining: ' + (station_codes.length - completed));
				}
			});
		}
	}, 10);
}

generateIntermediateTable();