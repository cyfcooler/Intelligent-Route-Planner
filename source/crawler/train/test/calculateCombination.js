var mongo = require('./lib/mongo.js'),
	station = require('./data/station.js');

var station_station_map = {};
function calculateCombinations(){
	mongo.findAll('train', function(key, data) {
		console.log('get all train done, total: ' + data.length);
		for(var i = 0; i < data.length; i++) {
			var stations = data[i].value.data;
			for(var j = 0; j < stations.length - 1; j++) {
				var station1 = stations[j];
				for(var k = j + 1; k < stations.length; k++) {
					var station2 = stations[k];
					var station1_code = station.name2code[station1.station_name],
						station2_code = station.name2code[station2.station_name];
					if(station1_code != null && station2_code != null) {
						station_station_map[station1_code + '_' + station2_code] = true;
					}
				}
			}
		}
		console.log('total combinations: ' + Object.keys(station_station_map).length);
		mongo.closeDb();
	});
}

calculateCombinations();