var mongo = require('../lib/mongo.js');

var missing = 0,
	reduntant = 0,
	error = 0,
	count = 0,
	checked = {},
	train_map = {};

function checkAllTrains() {
	mongo.findAll('station', function(key, all_stations) {
		/*
			key: "",
			value: {
				data: {
					data: []
					sameStations: []
				}
			}
		 */
		console.log('get all station done ! total: ' + all_stations.length);
		mongo.findAll('train', function(key, all_trains){
			/*
				key: "",
				value: {
					data: []
				}
				train_no: ""
			 */
			console.log('get all train done ! total: ' + all_trains.length);
			for(var i = 0; i < all_trains.length; i++) {
				if(train_map[all_trains[i].key] != null) {
					console.log('reduntant train ' + (++reduntant) + ', train_code: ' + all_trains[i].key);
				}
				train_map[all_trains[i].key] = all_trains[i];
			}
			
			
			for(var i = 0; i < all_stations.length; i++) {
				var trains = all_stations[i].value.data.data;
				for(var j = 0; j < trains.length; j++) {
					var train_code = trains[j].station_train_code;
					if(!checked[train_code]) {
						if(train_map[train_code] == null) {
							console.log('missing train ' + (++missing) + ', train_code: ' + train_code);
						} else if(train_map[train_code].value.data == null || train_map[train_code].value.data.length == 0) {
							console.log('error train ' + (++error) + ', train_code: ' + train_code);
						}
						count++;
						checked[train_code] = true;
					}
				}
			}
			
			console.log('All done ! Missing: ' + missing + ', Redundant: ' + reduntant + ', Error: ' + error);
			console.log('Train length: expected: '　+ count + ', actual: ' + all_trains.length);
			mongo.closeDb();
		});
	});
}

checkAllTrains();
