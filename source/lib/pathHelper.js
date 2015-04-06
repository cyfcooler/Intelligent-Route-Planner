var path = require('path');

exports.getLibFile = function(file_name) {
	return path.resolve(__dirname, file_name);
}

exports.getDataFile = function(file_name) {
	return path.resolve(__dirname, '..', 'crawler/train/data', file_name);
}

exports.getLogMessageFile = function(file_name) {
	return path.resolve(__dirname, '../..', 'log/message', file_name);
}

exports.getLogErrorFile = function(file_name) {
	return path.resolve(__dirname, '../..', 'log/error', file_name);
}

exports.getRootFile = function(file_name) {
	return path.resolve(__dirname, '..', file_name);
}