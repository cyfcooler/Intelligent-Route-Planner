// add start_same_stations and end_same_stations field in station_station table

var mongo = require('../../lib/mongo.js');

var args = process.argv.splice(2),
	start = args[0] || 0,
	end = args[1],
	updated = start,
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
			end = (end == null || end > (len - 1)) ? (len - 1) : end;
			console.log('process train from ' + start + ' to ' + end);
			var j = start-1;
			var interval = setInterval(function(){
				if(++j > end) {
					console.log('send update request done !');
					clearInterval(interval);
				} else {
					updateStationStationInternal(station_station[j].train_code, station_station[j].start, station_station[j].end);
				}
			}, 10);
		});
	});
}

function updateStationStationInternal(train_code, start_station, end_station) {
	mongo.updateDb('station_station', {train_code: train_code, edge:start_station + '_' + end_station}, {$set:{start_same_stations: same_station_map[start_station], end_same_stations: same_station_map[end_station]}}, false, function(){
		console.log('train ' + train_code + ' from ' + start_station + ' to ' + end_station + ' updated. Remaining: ' + (end - (updated++)));
		if(updated > end) {
			console.log('All done !');
			mongo.closeDb();
		}
	});
}

updateStationStation();