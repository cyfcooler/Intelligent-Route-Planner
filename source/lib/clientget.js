var pathHelper = require('./pathHelper.js');

var url = require('url'),
	https = require('https'),
	utility = require(pathHelper.getLibFile('utility.js'));

var options = {},
	error_file = pathHelper.getLogErrorFile('httpserror.err');

function logError(msg) {
	utility.logError(error_file, msg, "https");
}

exports.getHttpsData = function(uri, key, headers, cb, error_cb) {
	options = url.parse(uri);
	options.rejectUnauthorized = false;
	options.headers = headers || {};

	https.get(options, function(res) {
		var data = '';
		res.setEncoding('utf8');
		res.on('data', function(d) {
			data = data + d;
		});
		res.on('end', function() {
			typeof cb == 'function' && cb.call(this, key, data);
		});
	}).on('error', function(error) {
		logError("getHttpsData error " + error + " for " + key + " and url " + uri);
		typeof error_cb == 'function' && error_cb.call(this, key, error);
	});
};