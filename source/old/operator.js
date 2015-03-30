var station = require('./station.js'),
	mongo = require('./mongo.js');

var i = -1;
function insertDb(data) {
	if (++i < data.length) {
		var tmp;	
		var result = data[i].data.map(function(v, i) {
			tmp = {};
			tmp[v.station_train_code] = v.train_no;
			return tmp;
		});
		mongo.insertDb('citytrain', station.city2[data[i].title], {train: result}, function() {
			insertDb(data);
		});
	} else {		
		// mongo.closeDb();
		console.log('create citytrain over');
		createCityTrain();
	}
};
// 生成citytrain表，城市对应的列车信息
mongo.getValue('city', '', function(data) {	
	insertDb(data);	
});
var j = -1;
function createTrain(data) {
	if (++j < data.length) {
		mongo.insertDb('train', data[j].name, {no: data[j].no}, function() {		
			createTrain(data);
		});
		console.log(data[j].name + ' inserted');
	} else {
		mongo.closeDb();
		console.log('train create over');
	}
}
var train_result = [];
function createCityTrain() {
	mongo.getValue('citytrain', '', function(data) {	
		data.forEach(function(v, i) {			
			train_result = train_result.concat(v.train);
		});
		
		var tmp = {},
			result = [];
		train_result.forEach(function(v) {
			var name = Object.keys(v)[0];
			v = {
				name: name,
				no: v[name]
			};
			if (!tmp[name]) {
				tmp[name] = v.no
				result.push(v);
			}
			
		});
		createTrain(result);	
	});
}
