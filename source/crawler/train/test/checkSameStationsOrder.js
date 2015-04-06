// this file is to check the order of sameStations is same across all same stations

var path = require('path');
var pathHelper = require(path.resolve(__dirname, '../../..', 'lib/pathHelper.js'));

var mongo = require(pathHelper.getLibFile('mongo.js'));

/*
	key: ""
	value: {
		data: {
			data: [],
			sameStations: ""
		}
	}
 */
function checkSameStationsOrder() {
	var same_station_count = {},
		zero_train_station = [],
		station_in_same_stations = {},
		station_not_in_same_stations = {};
		
	mongo.findAll('station', function(key, stations){
		console.log('get all stations. length: ' + stations.length);
		
		stations.forEach(function(station_info){
			var same_stations = JSON.parse(station_info.value.data.sameStations);
			if(same_stations.length > 0) {
				// some stations are not in the sameStations array, e.g. sameStations of RNH(金华南) is only JBH(金华), no RNH(金华南), so some logic below is to handle this case.
				var in_same_stations = false;
				for(var i = 0; i < same_stations.length; i++) {
					if(station_info.key === same_stations[i]) {
						in_same_stations = true;
						break;
					}
				}
				
				if(!in_same_stations) {
					station_not_in_same_stations[station_info.key] = same_stations;
				} else {
					var same_station_count_key = JSON.stringify(same_stations);
					if(same_station_count[same_station_count_key] == null) {
						same_station_count[same_station_count_key] = 1;
					} else {
						same_station_count[same_station_count_key]++;
					}
					station_in_same_stations[station_info.key] = same_stations;
				}
			} else {
				zero_train_station.push(station_info.key);
			}
		});
		
		stations.forEach(function(station_info){
			var same_stations = JSON.parse(station_info.value.data.sameStations);
			if(same_stations.length > 0) {
				if(station_not_in_same_stations[station_info.key] != null) {
					var expected = JSON.stringify(station_in_same_stations[station_not_in_same_stations[station_info.key][0]]),
						actual = JSON.stringify(same_stations);
					if(expected !== actual) {
						console.log('order incorrect for station ' + station_info.key + ', expected: ' + expected + ', actual: ' + actual);
					}
				} else {
					var same_station_count_key = JSON.stringify(same_stations);
					if(same_station_count[same_station_count_key] != same_stations.length) {
						console.log('order incorrect for station ' + station_info.key + ', expected: ' + same_stations.length + ', actual: ' + same_station_count[same_station_count_key]);
					}
				}
			}
		});
		
		console.log('all done !\n' + zero_train_station.length + ' stations has 0 same station: ' + JSON.stringify(zero_train_station));
		console.log(Object.keys(station_not_in_same_stations).length + ' stations are not in their sameStations field: ' + JSON.stringify(Object.keys(station_not_in_same_stations)));
		mongo.closeDb();
	});
}

checkSameStationsOrder();