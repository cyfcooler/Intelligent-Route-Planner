// parse the train_list and generate the MD5 to ensure the train schedule is not changed.

var path = require('path');
var pathHelper = require(path.resolve(__dirname, '../../..', 'lib/pathHelper.js'));

var args = process.argv.splice(2),
	date = args[0];

var train = require(pathHelper.getDataFile('train_list_' + date + '.js')),
	md5 = require('MD5');

function calculateLength(train_list) {
	var station_map = {},
		md5_map = {},
		date_map = {};
	var dates = Object.getOwnPropertyNames(train_list).sort();
	for(var p = 0; p < dates.length; p++) {
		var key = dates[p];
		var length = 0;
		for(var q in train_list[key]) {
			var trains = train_list[key][q];
			length += trains.length;
			trains.forEach(function(t) {
				if(station_map[t.station_train_code] == null) {
					station_map[t.station_train_code] = [key];
				} else {
					station_map[t.station_train_code].push(key);
				}
			});
		}
		date_map[key] = length;
		md5_map[key] = md5(JSON.stringify(train_list[key]));
	}
	
	console.log("total dates: " + dates.length);
	for(var p in station_map) {
		console.log('train ' + p + ' length: ' + station_map[p].length + ': ' + JSON.stringify(station_map[p]));
	}
	
	console.log('\nMD5:')
	for(var p in md5_map) {
		console.log('date ' + p + ' length: ' + date_map[p] + ', md5: ' + md5_map[p]);
	}
}

calculateLength(train.train_list);