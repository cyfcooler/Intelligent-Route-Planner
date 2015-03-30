// add start_same_stations and end_same_stations field in station_station table

var mongo = require('./lib/mongo.js');

var updated = 0,
	len,
	same_station_map = {};
	
function updateStationStation() {
	var combination = {};
	
	mongo.findAll('station', function(key, stations){
		console.log('get total stations: ' + stations.length);
		for(var i = 0; i < stations.length; i++) {
			same_station_map[stations[i].key] = stations[i].value.data.sameStations;
		}
		
		mongo.findAll('station_station', function(key, station_station) {
			len = station_station.length;
			console.log('total station_station need process: ' + len);
			var j = -1;
			var interval = setInterval(function(){
				if(++j === len) {
					console.log('send update request done !');
					clearInterval(interval);
				} else {
					updateStationStationInternal(station_station[j].train_code, station_station[j].start, station_station[j].end);
				}
			}, 0);
		});
	});
}

function updateStationStationInternal(train_code, start, end) {
	mongo.updateDb('station_station', {train_code: train_code, edge:start + '_' + end}, {$set:{start_same_stations: same_station_map[start], end_same_stations: same_station_map[end]}}, function(){
		console.log('train ' + train_code + ' from ' + start + ' to ' + end + ' updated. Remaining: ' + (len - (++updated)));
		if(updated === len) {
			console.log('All done !');
			mongo.closeDb();
		}
	});
}

updateStationStation();