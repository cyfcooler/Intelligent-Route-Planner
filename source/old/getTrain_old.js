var t = require('./clientget.js'),
	mongo = require('./mongo.js'),

	fs = require('fs');

var args = process.argv.splice(2);

var i = -1,
	keys,
	len,
	url,
	file = './miss.log';

function getData() {
	i += 1;
	if (i > len) {
		mongo.closeDb();
		console.log('updata train over');
		return false;
	}

	console.log(keys[i].name + ' - ' + i);
	url = 'https://kyfw.12306.cn/otn/czxx/queryByTrainNo?train_no=' + keys[i].no + '&from_station_telecode=AOH&to_station_telecode=ZZF&depart_date=2014-03-10';
	t.getHttpsData(url, function(msg) {
		
		if (msg.indexOf('<!') != -1) {
			console.log('error');
			fs.appendFile(file, keys[i] + '|', function(err) {
				if (err) {
					console.log(err);
				}
			});
		} else {
			msg = JSON.parse(msg);
			mongo.update('train', {title: keys[i].name}, {
				title: keys[i].name, 
				no: keys[i].no,
				info: msg.data.data
			}, function() {});
			console.log('update ' + keys[i].name);		
		}

		setTimeout(function() {
			getData();
		}, 100);
	});
}

function getTrainInfo() {
	var tmp;
	mongo.getValue('train', '', function(data) {
		keys = data.map(function(v) {
			tmp = {};
			tmp.name = v.title;
			tmp.no = v.no;
			return tmp;
		});

		len = keys.length - 1;
		getData();
	});
};

getTrainInfo();