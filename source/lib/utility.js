var fs = require('fs');

function logError(file, msg, module) {
	var date = new Date().toLocaleString();
	console.log(" !!! [" + date + "] [" + module + "] " + msg);
	fs.appendFile(file, "[" + date + "] [" + module + "] " + msg + "\n", function(err) {
		if (err) {
			console.log(err);
		}
	});
}

function logMessage(file, msg, module, display_in_console) {
	var date = new Date().toLocaleString();
	var str = "[" + date + "] [" + module + "] " + msg;
	if(display_in_console){
		console.log("[" + date + "] [" + module + "] " + msg);
	}
	fs.appendFile(file, str + "\n", function(err) {
		if (err) {
			console.log(err);
		}
	});
}

function getActualDate(date, start_time, duration) {
	var d = new Date(date + ',' + start_time);
	d.setMinutes(d.getMinutes() + duration);
	var month = d.getMonth() + 1,
		date = d.getDate();
	var month_str = month < 10 ? ('0' + month) : (month + ''),
		date_str = date < 10 ? ('0' + date) : (date + '');
	return d.getFullYear() + '-' + month_str + '-' + date_str;
}

exports.logError = logError;
exports.logMessage = logMessage;
exports.getActualDate = getActualDate;