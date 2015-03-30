var MongoClient = require('C:\\Users\\yifche\\node_modules\\mongodb').MongoClient,
	fs = require('fs'),
	assert = require('assert'),

	file = './../mongoerror.log',
	update_file = './../update.log';

var dbs;

function addData(table, key, data, cb) {
	var map = {};
	map.value = data;
	map.key = key;
	dbs.collection(table).insert(map, {safe: true}, function(err, result) {
		if (err) {
			console.log("add data error :" + err);
			fs.appendFile(file, err + '-', function(err) {
				if (err) {
					console.log(err);
				}
			});
		} else {
			typeof cb == 'function' && cb.call(this);
		}
	});
}

function getMongo(cb, args) {
	if (dbs) {
		cb.apply(this, args);
	} else {	
		MongoClient.connect('mongodb://127.0.0.1:27017/trainroad', function(err, db){
			if (!err) {
				dbs = db;
				cb.apply(this, args);
			} else {
				console.log("connect db error :" + err);
				fs.appendFile(file, err + '-', function(err) {
					if (err) {
						console.log(err);
					}
				});
			}
		});
	}
}

function getValue(table, v, cb) {
	dbs.collection(table).find().toArray(function(err, docs){	
		cb.call(this, docs);
    });
}

exports.insertDb = function(table, key, data, cb) {
	getMongo(addData, arguments);
};
exports.getValue = function(table, v, cb) {
	getMongo(getValue, arguments);
};

exports.closeDb = function() {
	getMongo(function() {
		dbs.close();
	});
};

exports.clear = function(table) {
	getMongo(function() {
		dbs.dropCollection(table, function() {});
	});
}

exports.findOne = function(table, key, cb) {
	value = {key: key};
	getMongo(function() {
		dbs.collection(table).findOne(value, function(criteria, result) {
			typeof cb == 'function' && cb.call(this, key, result);
		});
	}, arguments);
}

exports.findAll = function(table, cb) {
	getMongo(function() {
		dbs.collection(table).find().toArray(function(err, result) {
			assert.equal(null, err);
			typeof cb == 'function' && cb.call(this, result);
		});
	}, arguments);
}

exports.update = function(table, key, set, cb) {
	getMongo(function() {
		dbs.collection(table).update(key, set, {upsert: true}, function(err) {
			if (!err) {
				typeof cb == 'function' && cb.call(this);
			} else {
				fs.appendFile(update_file, err + '-', function(err) {
					if (err) {
						console.log(err);
					}
				});
			}
	    });
	});
}