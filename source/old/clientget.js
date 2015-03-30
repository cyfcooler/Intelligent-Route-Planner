var url = require('url'),
	https = require('https'),
	fs = require('fs');

var options = {},
	file = './httperror.log';

exports.getHttpsData = function(uri, cb, headers, key) {
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
			typeof cb == 'function' && cb.call(this, data, key);
		});
	}).on('error', function() {
		console.log(" !!!!!!!!!!!!!!!!!!!!!!!!!! getHttpsData error for " + key);
		fs.appendFile(file, key ' error, url: ' + uri + '\n', function(err) {
			if (err) {
				console.log(err);
			}
		});
	});
};