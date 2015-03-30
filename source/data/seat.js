var num_code2name = {
	swz_num: '商务座',
	tz_num: '特等座',
	zy_num: '一等座',
	ze_num: '二等座',
	gr_num: '高级软卧',
	rw_num: '软卧',
	yw_num: '硬卧',
	rz_num: '软座',
	yz_num: '硬座',
	wz_num: '无座',
	qt_num: '其它'
};

// for get price solution 1
var price_code2name = {
	9: '商务座',		// A9
	P: '特等座',
	M: '一等座',
	O: '二等座',
	6: '高级软卧',	// A6
	4: '软卧',		// A4
	3: '硬卧',		// A3
	2: '软座',		// A2
	1: '硬座',		// A1
	//WZ: '无座',
	H: '其它',
	5: '包厢硬卧',
	7: '一等软座',
	8: '二等软座'
};

// for get price solution 2
var price_code2name_2 = {
	swz_price: '商务座',	
	tz_price: '特等座',
	zy_price: '一等座',
	ze_price: '二等座',
	gr_price: '高级软卧',
	rw_price: '软卧',
	yw_price: '硬卧',
	rz_price: '软座',
	yz_price: '硬座',
	wz_price: '无座',
	yrrb_price: '一人软包',
	// --- special seat, from index 11 ~ index 13
	bxyw_price: '包厢硬卧',		// K3
	ydrz_price: '一等软座',		// T7785 ~ T7788, map to 一等座
	edrz_price: '二等软座',		// T7785 ~ T7788, map to 二等座
	// --- no actual seat below in all trains (checked in getStationStation.js)
	bxrz_price: '包厢软座',
	edsr_price: '',
	errb_price: '二人软包',
	gg_price: '',
	hbrw_price: '',
	hbrz_price: '',
	hbyw_price: '',
	hbyz_price: '',
	tdrz_price: '特等软座',
	ydsr_price: ''
};

var price_2_num_index= {
	swz_price: 0,
	tz_price: 1,
	zy_price: 2,
	ze_price: 3,
	gr_price: 4,
	rw_price: 5,
	yw_price: 6,
	rz_price: 7,
	yz_price: 8,
	wz_price: 9,
	yrrb_price: 10,
	bxyw_price: 10,
	ydrz_price: 2,
	edrz_price: 3
};

exports.num_code2name = num_code2name;
exports.price_code2name = price_code2name;
exports.price_code2name_2 = price_code2name_2;
exports.price_2_num_index = price_2_num_index;