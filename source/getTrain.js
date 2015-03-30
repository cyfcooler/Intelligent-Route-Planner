var https = require('./lib/clientget.js'),
	mongo = require('./lib/mongo.js'),
	utility = require('./lib/utility.js'),
	station = require('./data/station.js');

var args = process.argv.splice(2),
	code = args[0],
	start = args[1],
	end = args[2],
	frequency = args[3],
	date = args[4] || '2015-04-01';

var start = (start || 0),
	request_index = start - 1,
	response_index = request_index,
	station_names = Object.keys(station.name2code),
	station_codes = Object.keys(station.code2name),
	len = station_names.length,
	end = (end || (len - 1)),
	remaining = end - start + 1,
	file = '../log/error/getTrain.err',
	frequency = (frequency || 200);

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
		console.log('get train for station ' + station_info.key + ' done. Remaining: ' + (--remaining));
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
		if(train_info == null) {
			queryTrain(train.train_no, train.station_train_code, function(new_train_info, new_train_code){
				if(new_train_info != null) {
					mongo.updateDb('train', {key:key}, {key:key, value:new_train_info, train_no: train.train_no}, function(){
						//console.log('train ' + key + ' inserted !');
						typeof cb === 'function' && cb.call(this);
					});
				} else{
					typeof cb === 'function' && cb.call(this);
				}
			});
		}
		else {
			//console.log('train ' + key + ' exists !');
			typeof cb === 'function' && cb.call(this);
		}
	});
}

function queryTrain(train_no, train_code, cb) {
	var train_url = 'https://kyfw.12306.cn/otn/queryTrainInfo/query?leftTicketDTO.train_no=' + train_no + '&leftTicketDTO.train_date=' + date + '&rand_code=' + code;
	https.getHttpsData(train_url, train_code, {
		Cookie: 'JSESSIONID=E931EF9CA038222829B9DBD5EE93AA00; BIGipServerotn=1357906442.38945.0000; _jc_save_zwdch_fromStation=%u5317%u4EAC%2CBJP; _jc_save_zwdch_cxlx=1; _jc_save_czxxcx_toStation=%u91CD%u5E86%2CCQW; _jc_save_czxxcx_fromDate=2015-04-01; _jc_save_fromStation=%u5317%u4EAC%2CBJP; _jc_save_toStation=%u4E0A%u6D77%2CSHH; _jc_save_toDate=; _jc_save_wfdc_flag=dc; current_captcha_type=C; _jc_save_fromDate=2015-04-01'
	}, function(key, msg) {
		msg = JSON.parse(msg);
		if (!msg.status) {
			logError('error in query train ' + key + ', url: ' + train_url);
		} else if (msg.data.data == null) {
			logError('no train data for ' + key + ', url: ' + train_url);
			if(msg.data.message != null) {
				logError('error message: ' + msg.data.message);
			}
			msg.data = null;
		}
		
		typeof cb === 'function' && cb.call(this, msg.data, key);
	});
}

function checkEndingStatus() {
	if(remaining === 0) {
		mongo.closeDb();
		console.log('All done !');
	}
}

function logError(msg) {
	utility.logError(file, msg, "getTrain");
}

getAllTrains();
