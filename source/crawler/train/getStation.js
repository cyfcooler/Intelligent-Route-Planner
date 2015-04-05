var https = require('../../lib/clientget.js'),
	mongo = require('../../lib/mongo.js'),
	utility = require('../../lib/utility.js'),
	station = require('./data/station.js');

var args = process.argv.splice(2),
	code = args[0],
	start = args[1],
	end = args[2],
	frequency = args[3],
	date = args[4] || '2015-04-10';

var start = (start || 0),
	request_index = start,
	response_index = request_index,
	station_names = Object.keys(station.name2code),
	station_codes = Object.keys(station.code2name),
	len = station_names.length,
	end = (end || (len - 1)),
	remaining = end - start + 1,
	file = '../log/error/getStation.err',
	frequency = (frequency || 100);

// 获取站点的车次信息使用12306出行向导 车站车次查询接口，需验证码，验证码有效时间5分钟，暂时命令行参数输入
function getStation() {
	var url = 'https://kyfw.12306.cn/otn/czxx/query?train_start_date=' + date + '&train_station_name=' + encodeURIComponent(station_names[request_index]) + '&train_station_code=' + station_codes[request_index] + '&randCode=' + code;
	//console.log("send request " + request_index + ": " + url + " for station " + station_codes[request_index]);
	https.getHttpsData(url, station_codes[request_index], {
		Cookie: 'JSESSIONID=04C28C10F2FDF66EA6CE9D106E599460; BIGipServerotn=1005584906.64545.0000; _jc_save_fromStation=%u4E0A%u6D77%2CSHH; _jc_save_toStation=%u5317%u4EAC%2CBJP; _jc_save_fromDate=2015-04-01; _jc_save_toDate=2015-03-19; _jc_save_wfdc_flag=dc; current_captcha_type=C; _jc_save_czxxcx_toStation=%u4E0A%u6D77%2CSHH; _jc_save_czxxcx_fromDate=2015-04-01'
	}, function(station_code, msg) {
		console.log("receive response " + response_index + " for station " + station_code);
		msg = JSON.parse(msg);
		if (msg.status === false) {
			logError('rand code error for station ' + station_code);
			checkEndingStatus();
		} else {
			if (msg.data.flag) {
				mongo.findOne('station', station_code, function(key, data) {
					if(data == null) {
						// if no data, then insert
						// Note: some stations in the station list has no train, e.g. 春湾, 达拉特旗, etc. so msg.data could possibly be null
						mongo.insertDb('station', key, {data: msg.data}, function() {
							checkEndingStatus();
						});
					}
					else {
						checkEndingStatus();
					}
				});
			} else {
				logError('cookie error for station ' + station_code);
				checkEndingStatus();
			}
		}
		
		if(++response_index > end) {
			console.log("receive response done");
		}
	});
	
	if (++request_index > end) {
		console.log('send request done. from ' + start + ' to ' + end);
		clearInterval(intervalID);
	}
}

function checkEndingStatus() {
	if(--remaining === 0) {
		mongo.closeDb();
		console.log('All done !');
	}
}

function logError(msg) {
	utility.logError(file, msg, "getStation");
}

var intervalID = setInterval(getStation, frequency);
