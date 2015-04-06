// expose original train_list JSON object

var path = require('path');
var pathHelper = require(path.resolve(__dirname, '../../..', 'lib/pathHelper.js'));

var fs = require('fs');

var str = '\n\nexports.train_list = train_list;';

var args = process.argv.splice(2),
	date = args[0];

fs.appendFile(pathHelper.getDataFile('train_list_' + date + '.js'), str, function(error) {
	if(error) {
		console.log(error);
	}
});