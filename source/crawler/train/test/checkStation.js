// check the zero-train station, sameStations field, and the redundant or missing station from station.js

var path = require('path');
var pathHelper = require(path.resolve(__dirname, '../../..', 'lib/pathHelper.js'));

var assert = require('assert'),
	mongo = require(pathHelper.getLibFile('mongo.js')),
	stations = require(pathHelper.getDataFile('station.js')),
	station_codes = Object.keys(stations.code2name);
	
/*
	key: ""
	value: {
		data: {
			data: [],
			sameStations: ""
		}
	}
 */
function checkStation(){
	var station_map = {},
		redundant = 0,
		missing = 0,
		zero_train_station = [],
		same_station_missing = 0,
		same_station_error = 0;
	
	mongo.findAll('station', function(key, data) {
		console.log('get total ' + data.length + ' stations !');
		data.forEach(function(station){
			if(station_map[station.key] != null) {
				redundant++;
			}
			station_map[station.key] = 1;
			if(station.value.data.data.length === 0) {
				zero_train_station.push(station.key);
				if(station.value.data.sameStations == null) {
					same_station_missing++;
				} else if(station.value.data.sameStations !== "[]" && station.value.data.sameStations !== "") {
					console.log('same_station_error for station ' + station.key + ': same station should be empty when station has 0 train');
					same_station_error++;
				}
			} else if(station.value.data.sameStations == null) {
				same_station_missing++;
			} else if(typeof station.value.data.sameStations !== 'string') {
				console.log('same_station_error for station ' + station.key + ': same station type error');
				same_station_error++;
			} else if(station.value.data.sameStations === "[]" || station.value.data.sameStations === "") {
				console.log('same_station_error for station ' + station.key + ': same station should not be empty when station has non-zero train');
				same_station_error++;
			}
		});
		
		station_codes.forEach(function(station_code){
			if(station_map[station_code] == null) {
				missing++;
			}
		});
		
		console.log('All done ! redundant train: ' + redundant + ', missing train: ' + missing);
		console.log(zero_train_station.length + ' stations has zero train: ' + JSON.stringify(zero_train_station));
		console.log('same_station_missing: ' + same_station_missing + ', same_station_error: ' + same_station_error);
		mongo.closeDb();
	});
}

checkStation();