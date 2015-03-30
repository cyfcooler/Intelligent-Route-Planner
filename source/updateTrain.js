// add train_no field in train table

var mongo = require('./lib/mongo.js'),
	station = require('./data/station.js');

var args = process.argv.splice(2),
	start = args[0],
	end = args[1],
	frequency = args[2];

var start = (start || 0),
	request_index = start - 1,
	response_index = request_index,
	station_names = Object.keys(station.name2code),
	station_codes = Object.keys(station.code2name),
	len = station_names.length,
	end = (end || (len - 1)),
	remaining = end - start + 1,
	file = '../log/error/updateTrain.err',
	frequency = (frequency || 20);

function getAllTrains() {
	mongo.findAll('station', function(key, data) {
		console.log('get all station done !');
		console.log('total station need process: ' + remaining);
		var interval = setInterval(function(){
			if(++request_index > end) {
				clearInterval(interval);
			} else {
				getTrain(data[request_index], 0);
			}
		}, frequency);
	});
}

/*
	key: "",
	value: {
		data: {
			data: []
			sameStations: []
		}
	}
 */
function getTrain(station_info, index){
	if(index === station_info.value.data.data.length){
		console.log('update train for station ' + station_info.key + ' done. Remaining: ' + (--remaining));
		checkEndingStatus();
	} else {
		getTrainInternal(station_info.value.data.data[index], function(){
			// get train serially
			getTrain(station_info, ++index);
		});
	}
}

function getTrainInternal(train, cb){
	mongo.findOne('train', train.station_train_code, function(key, train_info){
		if(train_info != null) {
			mongo.updateDb('train', {key:key}, {key:key, value:train_info.value, train_no: train.train_no}, function(){
				//console.log('train ' + key + ' inserted !');
				typeof cb === 'function' && cb.call(this);
			});
		}
		else {
			console.log('train ' + key + " doesn't exist !");
			typeof cb === 'function' && cb.call(this);
		}
	});
}

function checkEndingStatus() {
	if(remaining === 0) {
		mongo.closeDb();
		console.log('All done !');
	}
}

getAllTrains();
