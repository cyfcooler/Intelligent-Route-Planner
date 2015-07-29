/**
 * Created by xiaofwa on 7/28/2015.
 */

// this file will handle the raw data and put into flight table and price table.
var mongodb = require('mongodb');

var mongodbServer = new mongodb.Server('localhost', 27017, {auto_reconnect: true, poolSize: 10});
var db = new mongodb.Db('data', mongodbServer);
var dbs = undefined;



function _handleSigleFlight(sf) {
    _pushIntoFlightTable(sf.dcc, sf.acc, sf.dt, sf.at, sf.fn, sf.cf.c, sf.pr);
    _pushIntoPriceTable(sf.fn, sf.dt.substring(0,10), sf.dcc, sf.acc, sf.lp)

}

function _pushIntoFlightTable(from, to, st/*start time*/, et/*end time*/, num/*flight number*/, type/*plane type*/, pr/*on-time rate*/) {
    db.collection('flight-table-2', function (err, collection) {
        if(err) console.log(err);
        collection.insert({from:from, to:to, et:et, num:num, type:type, pr:pr}, function (err) {
            if(err) console.log(err);
        });
    });
}

function _pushIntoPriceTable(num, date, from, to, lp/*low-price*/){
     db.collection('price-table-8', function (err, collection) {
        if(err) console.log(err);
        collection.insert({num:num, date:date, from:from, to:to,lp:lp}, function (err) {
            if(err) console.log(err);
        });
    });
}

exports.handle = function hanlde(rawdata) {
    if (dbs) {
        var fis = rawdata.fis;
        for (var i = 0; i < fis.length; i++) {
            _handleSigleFlight(fis[i]);
        }
    }
    else {
        db.open(function () {
            dbs = db;
            hanlde(rawdata);
        });
    }
};

