var MongoClient = require('C:\\Users\\yifche\\node_modules\\mongodb').MongoClient,
	utility = require('./utility.js'),
	file = '../log/error/mongoerror.err',
	dbs;

function addData(table, key, data, cb) {
	if(key == null && data == null) {
		return;
	}
	
	var map = {};
	if(key != null) {
		map.key = key;
		map.value = data;
	} else {
		map = data;
	}
	
	dbs.collection(table).insert(map, {safe: true}, function(err, result) {
		if (err) {
			logError("add data error :" + err);
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
				logError("connect db error :" + err);
			}
		});
	}
}

function getValue(table, v, cb) {
	dbs.collection(table).find().toArray(function(err, docs){	
		cb.call(this, docs);
    });
}

function find(table, key, return_one, cb, args) {
	var value = (typeof key === 'object') ? key : {key: key};
	getMongo(function() {
		if(return_one === false) {
			dbs.collection(table).find(value, function(criteria, result) {
				typeof cb == 'function' && cb.call(this, key, result, args);
			});
		} else {
			dbs.collection(table).findOne(value, function(criteria, result) {
				typeof cb == 'function' && cb.call(this, key, result, args);
			});
		}
	}, arguments);
}

function find(table, key, cb, args) {
	var selector = (key == null) ? {} : ((typeof key === 'object') ? key : {key: key});
	getMongo(function() {
		dbs.collection(table).find(selector).toArray(function(err, result) {
			if (!err) {
				typeof cb == 'function' && cb.call(this, key, result, args);
			} else {
				logError("find all data error :" + err);
			}
		});
	}, arguments);
}

function logError(msg) {
	utility.logError(file, msg, "mongo");
}

exports.insertDb = function(table, key, data, cb) {
	getMongo(addData, arguments);
};
exports.getValue = function(table, v, cb) {
	getMongo(getValue, arguments);
};

exports.closeDb = function() {
	if (dbs) {
		dbs.close();
	}
};

exports.clear = function(table) {
	getMongo(function() {
		dbs.dropCollection(table, function() {});
	});
}

exports.findOne = function(table, key, cb) {
	var selector = (key == null) ? {} : ((typeof key === 'object') ? key : {key: key});
	getMongo(function() {
		dbs.collection(table).findOne(selector, function(criteria, result) {
			typeof cb == 'function' && cb.call(this, key, result);
		});
	}, arguments);
}

exports.find = function(table, key, cb, args) {
	find(table, key, cb, args);
}

exports.findAll = function(table, cb) {
	find(table, null, cb);
}

exports.updateDb = function(table, selector, new_value, cb) {
	getMongo(function() {
		dbs.collection(table).update(selector, new_value, {upsert: false}, function(err) {
			if (!err) {
				typeof cb == 'function' && cb.call(this);
			} else {
				logError("update error :" + err);
			}
	    });
	});
}

exports.updateAll = function(table, selector, new_value, cb) {
	getMongo(function() {
		dbs.collection(table).update(selector, new_value, {multi: true}, function(err) {
			if (!err) {
				typeof cb == 'function' && cb.call(this);
			} else {
				logError("updateAll error :" + err);
			}
	    });
	});
}

exports.removeOne = function(table, selector, cb) {
	getMongo(function() {
		dbs.collection(table).remove(selector, {single: true}, function(err){
			if (!err) {
				typeof cb == 'function' && cb.call(this);
			} else {
				logError("remove error :" + err);
			}
		});
	});
}