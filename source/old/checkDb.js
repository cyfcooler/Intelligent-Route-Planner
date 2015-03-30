var t = require('./clientget.js'),
	station = require('./station.js'),
	mongo = require('./mongo.js'),
	station_names = Object.keys(station.name2code),
	station_codes = Object.keys(station.code2name),
	i = 0,
	j = i,
	missing = 0;

function checkDbMissing() {
	mongo.findOne('station', station_codes[i], function(key, data){
		if(data == null) {
			console.log('station ' + key + ' missing !');
			for(var k = 0; k < station_codes.length; k++) {
				if(station_codes[k] === key) {
					console.log('number: ' + k);
					break;
				}
			}
			missing++;
		}
		j++;
		if(j === station_codes.length) {
			console.log('all check done. missing: ' + missing);
		}
	});
	i++;
	if(i === station_codes.length) {
		console.log('all db query sent !');
		clearInterval(interval);
	}
}

function checkDbRedundant() {
	mongo.findAll('station', function(data){
		data.forEach(function(obj){
			var station_code = obj.key;
			var exist = false;
			for(var index = 0; index < station_codes.length; index++) {
				if(station_codes[index] === station_code) {
					exist = true;
					break;
				}
			}
			
			if(!exist) {
				console.log(station_code + " doesn't exist !");
			}
		});
		
		console.log("checkDbRedundant done !");
	});
}

var interval = setInterval(checkDbMissing, 10);
checkDbRedundant();