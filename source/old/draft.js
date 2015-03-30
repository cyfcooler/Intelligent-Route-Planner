var t = require('./clientget.js'),
	station = require('./station.js'),
	mongo = require('./mongo.js'),
	assert = require('assert');

	fs = require('fs');

var args = process.argv.splice(2),
	code = args[0],
	start = args[1],
	end = args[2];

var start = (start || 0),
	request_index = start,
	response_index = request_index,
	station_names = Object.keys(station.name2code),
	station_codes = Object.keys(station.code2name),
	len = station_names.length,
	end = (end || (len - 1)),
	remaining = end - start + 1,
	file = './miss.log';

// 获取站点的车次信息使用12306出行向导 车站车次查询接口，需验证码，验证码有效时间5分钟，暂时命令行参数输入
function getStation() {
	var url = 'https://kyfw.12306.cn/otn/czxx/query?train_start_date=2015-03-18&train_station_name=' + encodeURIComponent(station_names[request_index]) + '&train_station_code=' + station_codes[request_index] + '&randCode=' + code;
	//console.log("send request " + request_index + ": " + url + " for station " + station_codes[request_index]);
	t.getHttpsData(url, function(msg, station_code) {
		msg = JSON.parse(msg);
		if (msg.status === false) {
			console.log(' !!!!!!!!!!!!! rand code error');
			// fs.appendFile(file, station_names[response_index] + '|', function(err) {
				// if (err) {
					// console.log(err);
				// }
			// });
		} else {
			console.log("receive response " + response_index + " for station " + station_code);
			if (msg.data.flag) {
				mongo.findOne('station', station_code, function(key, data) {
					if(data == null) {
						// if no data, then insert
						mongo.insertDb('station', key, {data: msg.data}, function() {
							//console.log('station ' + key + ' inserted !');
						});
					}
					else {
						//console.log('station ' + key + ' exist !');
					}
				});
			} else {
				console.log(" !!!!!!!!!!!! cookie error");
				// fs.appendFile('./lose.log', station_codes[response_index] + '|', function(err) {
					// if (err) {
						// console.log(err);
					// }
				// });
			}
		}
		
		response_index++;
		if(response_index > end) {
			console.log("receive response done");
		}
		
	}, {
		Cookie: '__NRF=C82F6687407F37009407A3B3F3CF440D; JSESSIONID=C493BC5F0C8158499B8E852F16495E7D; BIGipServerotn=1055916554.24610.0000; _jc_save_fromStation=%u4E0A%u6D77%2CSHH; _jc_save_toStation=%u8861%u5C71%2CHSQ; _jc_save_toDate=2015-03-17; _jc_save_wfdc_flag=dc; _jc_save_fromDate=2015-03-22; current_captcha_type=C; _jc_save_czxxcx_toStation=%u4E0A%u6D77%2CSHH; _jc_save_czxxcx_fromDate=2015-03-18'
	}, station_codes[request_index]);
	
	request_index++;
	if (request_index > end) {
		console.log('send request done. from ' + start + ' to ' + end);
		clearInterval(intervalID);
	}
}

var train_url,
	price_url;

/*
	key: "",
	value: {
		data: {
			data: []
			sameStations: []
		}
	}
 */

function getAllTrains() {
	mongo.findAll('station', function(data) {
		console.log('get all station done !');
		var i = start;
		var interval = setInterval(function(){
			getTrain(data[i]);
			if(++i > end) {
				console.log(' --------------------- Total station need get: ' + remaining);
				clearInterval(interval);
			}
		}, 200);
	});
}

var trainsInProcessing = 0;

function getTrain(station_info){
	var i = 0;
	if(station_info.value.data.data.length !== 0){
		var interval = setInterval(function(){
			getTrainInternal(station_info.value.data.data[i], function(train_info){
				if(++i === station_info.value.data.data.length) {
					console.log('get train for station ' + station_info.key + ' done. Processed: ' + (++trainsInProcessing));
					clearInterval(interval);
				}
			});
		}, 200);
	} else {
		console.log("Station " + station_info.key + " has no train. Processed: " + (++trainsInProcessing));
	}
}

function getTrainInternal(train, cb){
	mongo.findOne('train', train.station_train_code, function(key, train_info){
		if(train_info == null) {
			queryTrain(train.train_no, train.station_train_code, train.start_station_telecode, train.end_station_telecode, function(new_train_info, new_train_code){
				assert.equal(new_train_code, key);
				mongo.insertDb('train', key, new_train_info, function(){
					//console.log('train ' + key + ' inserted !');
					typeof cb === 'function' && cb.call(this, new_train_info);
				});
			});
		}
		else {
			//console.log('train ' + key + ' exists !');
			typeof cb === 'function' && cb.call(this, train_info);
		}
	});
}

function queryTrain(train_no, train_code, from_station_code, to_station_code, cb) {
	var train_url = 'https://kyfw.12306.cn/otn/czxx/queryByTrainNo?train_no=' + train_no + '&from_station_telecode=' + from_station_code + '&to_station_telecode=' + to_station_code + '&depart_date=2015-03-20';

	t.getHttpsData(train_url, function(msg, key) {
		if (msg.indexOf('<!') != -1) {
			console.log('!!!!!!!!! error in query train !');
			fs.appendFile('./queryTrain.err', train_url + ' error\n', function(err) {
				if (err) {
					console.log(err);
				}
			});
		} else {
			msg = JSON.parse(msg);
			typeof cb === 'function' && cb.call(this, msg.data, key);
		}
	}, {}, train_code);
}

function getPrice(train_no, seat_types, from_no, to_no) {
	price_url = 'https://kyfw.12306.cn/otn/leftTicket/queryTicketPrice?train_no=' + train_no + '&from_station_no=' + from_no + '&to_station_no=' + to_no + '&seat_types=' + seat_types + '&train_date=2014-02-26';

	t.getHttpsData(price_url, function(data) {
		if (data.indexOf('<!') != -1) {
			fs.appendFile(file, price_url + '|', function(err) {
				if (err) {
					console.log(err);
				}
			});
		} else {
			data = JSON.parse(data);
			mongo.insertDb('price', from_no + '_' + to_no, data.data);
		}
		
	});
}

var j = -1;
function getLine() {
	 j ++;
	 if (j > len) {
		j = 0;
		i ++;
	}
	if(i > len) {
		mongo.closeDb();
		console.log('over');
		clearInterval(intervalID);
		return false;
	}

	url = 'https://kyfw.12306.cn/otn/leftTicket/query?leftTicketDTO.train_date=2015-03-22&leftTicketDTO.from_station=' + station.name2code[station_names[i]] + '&leftTicketDTO.to_station=' + station.name2code[station_names[j]] + '&purpose_codes=ADULT';
	t.getHttpsData(url, function(msg) {
		
		if (msg.indexOf('<!') != -1) {
			console.log('error');
			fs.appendFile(file, station_names[i] + '|', function(err) {
				if (err) {
					console.log(err);
				}
			});
		} else {
			msg = JSON.parse(msg);
			//console.log(msg.data);
			// if (msg.data != {}) {
				mongo.insertDb('line', {from:station.name2code[station_names[i]], to:station.name2code[station_names[j]]}, {data: msg.data});
				//console.log('data between ' + station.name2code[station_names[i]] + ' and ' + station.name2code[station_names[j]] + ' inserted');
			// } else {
				// console.log('no data between ' + station.name2code[station_names[i]] + ' and ' + station.name2code[station_names[j]]);
				// // return false;
				// // fs.appendFile('./lose.log', station.name2code[station_names[i]] + '|', function(err) {
					// // if (err) {
						// // console.log(err);
					// // }
				// // });
			// }
		}
	});
}

// run
// var d = new Date();
//getLine();

//var intervalID = setInterval(getStation, 100);

getAllTrains();
		 
// mongo.findOne('city', 'SHH', function(msg) {
	// console.log(new Date() - d);
	// console.log(msg.data.length)
	// // msg.data.forEach(function(v) {
	// // 	console.log(v.station_train_code)
	// // });
	
// });