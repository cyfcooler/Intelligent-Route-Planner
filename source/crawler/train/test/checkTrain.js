// first stage: check redundant or missing from train_list
// second stage: check all trains in train table has 0 stations or not, and check status of sameTrains field.

var mongo = require('../lib/mongo.js'),
	trains = require('../data/train_list.js');
	
var args = process.argv.splice(2),
	date = args[0];

/*
	key: "",
	value: {
		data: []
	}
 */
function checkUpdateTrain() {
	var train_map = {};
	if(date == null) {
		console.log('please input a date with format: YYYY-MM-DD');
		return;
	}
	
	mongo.findAll('train', function(key, data) {
		var zero_station_trains = [],
			same_train_missing = 0,
			same_train_type_error = 0,
			redundant_train = 0,
			missing_train = 0;
		console.log('get all train done !');
		console.log('total trains need process: ' + data.length);
		
		// first stage: check redundant or missing from train_list;
		data.forEach(function(train){
			if(train_map[train.key] != null) {
				redundant_train++;
			}
			train_map[train.key] = 1;
		});
		
		var one_day_trains = trains.train_list[date];
		for(var p in one_day_trains) {
			// p is the catalogue of the train, like 'D', 'G', 'K', etc.
			one_day_trains[p].forEach(function(train_info) {
				var train_code = train_info.station_train_code.replace(/\(.*\)/, '');
				if(train_map[train_code] == null) {
					missing_train++;
				}
			});
		}
		
		console.log('first stage done ! redundant train: ' + redundant_train + ', missing train: ' + missing_train);
		
		// second stage: check all trains in train table has 0 stations or not, and check status of sameTrains field.
		data.forEach(function(train){
			if(train.value.data.length === 0) {
				zero_station_trains.push(train.key);
			} else if(train.sameTrains == null){
				same_train_missing++;
			} else if(typeof train.sameTrains !== 'string') {
				same_train_type_error++;
			}
		});
		
		console.log('All done ! ' + zero_station_trains.length + ' trains have zero station: ' + JSON.stringify(zero_station_trains));
		console.log('sameTrains missing: ' + same_train_missing + ', sameTrains type error: ' + same_train_type_error);
		mongo.closeDb();
	});
}

checkUpdateTrain();