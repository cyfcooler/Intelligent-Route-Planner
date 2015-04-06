// add sameTrains field in train table

var path = require('path');
var pathHelper = require(path.resolve(__dirname, '../..', 'lib/pathHelper.js'));

var mongo = require(pathHelper.getLibFile('mongo.js'));

var remaining;

function updateAllTrains() {
	mongo.findAll('train', function(key, data) {
		console.log('get all train done !');
		console.log('total trains need process: ' + data.length);
		remaining = data.length;
		var i = -1;
		var interval = setInterval(function(){
			if(++i === data.length) {
				clearInterval(interval);
			} else {
				updateTrain(data[i], data[i].key);
			}
		}, 0);
	});
}

/*
	key: "",
	value: {
		data: []
	}
 */
function updateTrain(train, train_code){
	if(train.value.data.length > 0) {
		var stations = train.value.data,
			prev_train_code = stations[0].station_train_code,
			same_trains = [prev_train_code];
		for(var i = 1; i < stations.length; i++) {
			if(stations[i].station_train_code !== prev_train_code) {
				prev_train_code = stations[i].station_train_code;
				same_trains.push(prev_train_code);
			}
		}
		
		mongo.updateDb('train', {key:train_code}, {$set:{sameTrains: JSON.stringify(same_trains)}}, false, function(){
			console.log('update train ' + train_code + ' done. Remaining: ' + (--remaining));
			checkEndingStatus();
		});
	}
}

function checkEndingStatus() {
	if(remaining === 0) {
		mongo.closeDb();
		console.log('All done !');
	}
}

updateAllTrains();