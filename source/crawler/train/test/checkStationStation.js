var mongo = require('../../../lib/mongo.js'),
	station = require('../data/station.js'),
	assert = require('assert');
	
var station_station_map = {};
	
var duplicated = 0,
	missing = 0;
	
var args = process.argv.splice(2),
	fix = args[0];
	
function checkStationStation(){
	fix = fix === 'true';
	
	mongo.findAll('train', function(key, all_trains) {
		console.log('get all train done, total: ' + all_trains.length);
		mongo.findAll('station_station', function(key, data){
			console.log('get all station_station done. total: ' + data.length);
			
			data.forEach(function(station_station){
				var key = station_station.train_code + ':' + station_station.edge;
				if(station_station_map[key] != null) {
					duplicated++;
					console.log('found duplicated: train ' + station_station.train_code + ' from ' + station_station.start + ' to ' + station_station.end);
					station_station_map[key]._id = 0;
					station_station._id = 0;
					assert.equal(JSON.stringify(station_station_map[key]), JSON.stringify(station_station));
					if(fix) {
						mongo.removeOne('station_station', {train_code: station_station.train_code, edge: station_station.edge});
					}
				}
				station_station_map[key] = station_station;
			});
			
			var count = 0;
			for(var i = 0; i < all_trains.length; i++) {
				var stations = all_trains[i].value.data,
					train_code = all_trains[i].key;
				for(var j = 0; j < stations.length - 1; j++) {
					var from = station.name2code[stations[j].station_name];
					if(from != null) {
						for(var k = j + 1; k < stations.length; k++) {
							var to = station.name2code[stations[k].station_name];
							if(to != null) {
								count++;
								if(station_station_map[train_code + ':' + from + '_' + to] == null) {
									missing++;
									console.log('missing train ' + train_code + ' from ' + from + ' to ' + to);
								}
							}
						}
					}
				}
			}
			
			console.log('station station length: expected: ' + count + ', actual: ' + data.length);
			console.log('All check done ! duplicated: ' + duplicated + ', missing: ' + missing);
			if(!fix) {
				mongo.closeDb();
			}
		});
	});
}

checkStationStation();