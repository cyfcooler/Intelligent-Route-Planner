// this file is to check there is no station contains empty same stations in station_station table, or if exists, fix it

var mongo = require('../lib/mongo.js'),
	assert = require('assert');
	
var args = process.argv.splice(2),
	fix = args[0];

function checkSameStationsOrder() {
	fix = fix === 'true';
	
	var start_count = 0,
		end_count = 0;
		
	mongo.findAll('station_station', function(key, data){
		console.log('get all station_station. length: ' + data.length);
		
		data.forEach(function(station_station){
			assert(typeof station_station.start_same_stations === 'string');
			assert(typeof station_station.end_same_stations === 'string');
			
			if(station_station.start_same_stations == null || station_station.start_same_stations === '[]' || station_station.start_same_stations === '') {
				start_count++;
				console.log('start station ' + station_station.start + ' has 0 same stations');
				if(fix) {
					var start_same_stations = '["' + station_station.start + '"]';
					mongo.updateAll('station_station', {start: station_station.start}, {$set:{start_same_stations: start_same_stations}});
					// update station table at the same time because online route-finder algorithm depends on this.
					mongo.updateAll('station', {key: station_station.start}, {$set:{'value.data.sameStations': start_same_stations}});
				}
			}
			
			if(station_station.end_same_stations == null || station_station.end_same_stations === '[]' || station_station.end_same_stations === '') {
				end_count++;
				console.log('end station ' + station_station.end + ' has 0 same stations');
				if(fix) {
					var end_same_stations = '["' + station_station.end + '"]';
					mongo.updateAll('station_station', {end: station_station.end}, {$set:{end_same_stations: end_same_stations}});
					// update station table at the same time because online route-finder algorithm depends on this.
					mongo.updateAll('station', {key: station_station.end}, {$set:{'value.data.sameStations': end_same_stations}});
				}
			}
		});
		
		console.log('all done ! ' + start_count + ' start stations has 0 same stations. ' + end_count + ' end stations has 0 same stations. ');
		
		if(!fix) {
			mongo.closeDb();
		}
	});
}

checkSameStationsOrder();