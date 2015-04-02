var mongo = require('./lib/mongo.js'),
	utility = require('./lib/utility.js'),
	station = require('./data/station.js');

/*
	key: "",
	value: {
		data: {
			data: []
			sameStations: []
		}
	}
 */
 
// sameStations field from 12306 can't totally match to the station list, so we update this information by ourselves.
// 	e.g. 	sameStations of station 桂平 contains '**'.
//			sameStations of station 沈阳 contains '沈阳西', which can't be found on station list
//			sameStations of station 包头 contains '包头北' and '包头西', both of which can't be found on station list
//	The root cause is that these stations can be found from train schedule, but they can't be found in the station list (so can't buy ticket of these station online).
//	We follow the station list, because our system should choose one solution which can buy ticket online. We should update this train list with 12306 in time.
function updateStation() {
	var updated = 0;
	mongo.findAll('station', function(key, data) {
		console.log('total stations need process: ' + data.length);
		for(var i = 0; i < data.length; i++) {
			var trains = data[i].value.data.data;
			var same_stations = {};
			for(var j = 0; j < trains.length; j++) {
				if(station.code2name[trains[j].station_telecode] != null && same_stations[trains[j].station_telecode] == null) {
					same_stations[trains[j].station_telecode] = true;
				}
			}
			
			data[i].value.data.sameStations = JSON.stringify(Object.keys(same_stations));
			(function () {
				// use function() scope to store the local variable station_key value
				var station_key = data[i].key;
				mongo.updateDb('station', {key: data[i].key}, data[i], function() {
					console.log('station ' + station_key + ' updated. Remaining: ' + (data.length - (++updated)));
					if(updated === data.length) {
						console.log('all done !');
						mongo.closeDb();
					}
				});
			})();
		}
	});
}

updateStation();