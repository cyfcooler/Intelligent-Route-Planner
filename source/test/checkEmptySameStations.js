// this file is to check there is no station contains empty same stations in station_station table

var mongo = require('../lib/mongo.js');

function checkSameStationsOrder() {
	var start_count = 0,
		end_count = 0;
		
	mongo.findAll('station_station', function(key, data){
		console.log('get all station_station. length: ' + data.length);
		
		data.forEach(function(station_station){
			if(station_station.start_same_stations == null || station_station.start_same_stations.length === 0) {
				start_count++;
				console.log('start station ' + station_station.start + ' has 0 same stations');
			}
			
			if(station_station.end_same_stations == null || station_station.end_same_stations === 0) {
				end_count++;
				console.log('end station ' + station_station.end + ' has 0 same stations');
			}
		});
		
		console.log('all done ! ' + start_count + ' start stations has 0 same stations. ' + end_count + ' end stations has 0 same stations. ');
		mongo.closeDb();
	});
}

checkSameStationsOrder();