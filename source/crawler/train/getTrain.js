// get train from train_list.js

var path = require('path');
var pathHelper = require(path.resolve(__dirname, '../..', 'lib/pathHelper.js'));

var mongo = require(pathHelper.getLibFile('mongo.js')),
	utility = require(pathHelper.getLibFile('utility.js')),
	https = require(pathHelper.getLibFile('clientget.js')),
	train = require(pathHelper.getDataFile('train_list.js')),
	station = require(pathHelper.getDataFile('station.js'));

var args = process.argv.splice(2),
	code = args[0],
	date = args[1],
	start = args[2] || 0,
	end = args[3],
	frequency = args[4] || 50;

var file = pathHelper.getLogErrorFile('getTrain.err'),
	remaining;
	
function getAllTrainsInOneDay(train_list, date) {
	if(train_list == null || date == null) {
		console.log('please input valid train_list and date');
		return;
	}
	
	var len = 0;
	for(var p in train_list[date]) {
		// p is the catalogue of the train, like 'D', 'G', 'K', etc.
		len += train_list[date][p].length;
	}
	console.log('total trains: ' + len);
	
	end = (end == null || end > (len - 1)) ? (len - 1) : end;
	remaining = end - start + 1;
	
	for(var p in train_list[date]) {
		// p is the catalogue of the train, like 'D', 'G', 'K', etc.
		(function() {
			var i = -1,
				trains = train_list[date][p],
				length = trains.length;
				
			var interval = setInterval(function() {
				if(++i === length) {
					clearInterval(interval);
				} else {
					(function(){
						var train = trains[i],
							train_code = train.station_train_code.replace(/\(.*\)/, '');
						getTrainInternal(train_code, train.train_no, function(){
							console.log('train ' + train_code + ' done. Remaining: ' + (--remaining));
							if(remaining === 0) {
								mongo.closeDb();
								console.log('All done !');
							}
						});
					})();
				}
			}, frequency);
		})();
	}
}

function getTrainInternal(train_code, train_no, cb){
	mongo.findOne('train', train_code, function(key, train_info){
		if(train_info == null) {
			queryTrain(train_no, train_code, function(new_train_info, new_train_code){
				if(new_train_info != null) {
					mongo.updateDb('train', {key:key}, {key:key, value:new_train_info, train_no: train_no}, true, function(){
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
		Cookie: '__NRF=C80D2A08614D1C32FED3C2D5D2417BF9; JSESSIONID=0A02F012C4FB9953902648D5BFC02975C97781A330; _jc_save_zwdch_fromStation=%u5317%u4EAC%2CBJP; _jc_save_zwdch_cxlx=1; BIGipServerotn=317719050.50210.0000; _jc_save_czxxcx_toStation=%u5F90%u5DDE%2CXCH; _jc_save_czxxcx_fromDate=2015-05-05; _jc_save_fromStation=%u5F90%u5DDE%2CXCH; _jc_save_toStation=%u8FDE%u4E91%u6E2F%u4E1C%2CUKH; _jc_save_toDate=; _jc_save_wfdc_flag=dc; current_captcha_type=C; _jc_save_fromDate=2015-04-10'
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

function logError(msg) {
	utility.logError(file, msg, "getTrain");
}

getAllTrainsInOneDay(train.train_list, date);