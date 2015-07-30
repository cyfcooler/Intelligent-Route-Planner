var all_fields = [
    'date',
    'from',
    'to',
    'order_by',
    'max_solutions',
    'consider_transfer',
    'min_wait_time',
    'max_wait_time',
    'same_station_transfer',
    'max_duration',
    'max_price',
    'start_time_range',
    'end_time_range',
    'seat_type',
    'ticket_num'
];

var number_fields = [
    all_fields[4],
    all_fields[6],
    all_fields[7],
    all_fields[9],
    all_fields[10],
    all_fields[14]
];

var boolean_fields = [
    all_fields[5],
    all_fields[8]
];

var array_fields = [
    all_fields[11],
    all_fields[12],
    all_fields[13]
];

var number_fields_map = {},
    boolean_fields_map = {},
    array_fields_map = {};

function createMap(map, fields) {
    fields.forEach(function(field){
        map[field] = true;
    });
};

function setField(obj, field, value) {
    if((typeof value !== 'string' || value != '') && (typeof value !== 'number' || !isNaN(value))) {
        obj[field] = value;
    }
};

// DOM Ready =============================================================
$(document).ready(function() {

    createMap(number_fields_map, number_fields);
    createMap(boolean_fields_map, boolean_fields);
    createMap(array_fields_map, array_fields);
    
    // Add User button click
    $('#btnQueryTrain').on('click', queryTrain);
    
    // Add Date
    $('input#date').val(getNextDate());

});

// Query Train
function queryTrain(event) {
    event.preventDefault();

    var args = {};
    
    all_fields.forEach(function(id) {
        var value = $('#' + id).val();
        if(number_fields_map[id] != null) {
            value = parseInt(value);
        } else if(boolean_fields_map[id] != null && value != '') {
            value = value === 'true';
        } else if(array_fields_map[id] != null && value != '') {
            value = JSON.parse(value);
        }
        setField(args, id, value);
    });
    
    console.log(args);

    // Use AJAX to post the object to our querytrain service
    $.ajax({
        type: 'POST',
        data: {'args': JSON.stringify(args)},
        url: '/querytrain',
        dataType: 'JSON'
    }).done(function( response ) {

        // Check for successful (blank) response
        if (response.length > 0) {

            // Update the table
            //$('#train_info').html(JSON.stringify(response));
            drawLines(response);
            addIntoTable(response);

        }
        else {

            // If something goes wrong, alert the error message that our service returned
            alert('Error !');

        }
    });
};

function getNextDate() {
    var cur = new Date();
    cur.setDate(cur.getDate() + 1);
    var month = cur.getMonth() + 1,
        date = cur.getDate();
    if(month <= 9) {
        month = "0" + month;
    }
    if(date <= 9) {
        date = "0" + date;
    }
    return cur.getFullYear() + '-' + month + '-' + date;
};

// echarts

var effect = {
    show: true,
    scaleSize: 2,
    period: 30,             // 运动周期，无单位，值越大越慢
    color: '#fff',
    shadowColor: 'rgba(220,220,220,0.4)',
    shadowBlur : 5 
};
function itemStyle(idx) {
    return {
        normal: {
            color:'#fff',
            borderWidth:1,
            borderColor:['rgba(30,144,255,1)','lime'][idx],
            lineStyle: {
                //shadowColor : ['rgba(30,144,255,1)','lime'][idx], //默认透明
                //shadowBlur: 10,
                //shadowOffsetX: 0,
                //shadowOffsetY: 0,
                type: 'solid'
            }
        }
    }
};
var option = {
    backgroundColor: '#1b1b1b',
    color: ['rgba(30,144,255,1)','lime'],
    title : {
        text: '路线查询结果',
        subtext:'',
        x:'center',
        textStyle : {
            color: '#fff'
        }
    },
    tooltip : {
        trigger: 'item',
        formatter: '{b}'
    },
    // legend: {
    //     orient: 'vertical',
    //     x:'left',
    //     selectedMode:'single',
    //     data:['八纵通道', '八横通道'],
    //     textStyle : {
    //         color: '#fff'
    //     }
    // },
    toolbox: {
        show : true,
        orient : 'vertical',
        x: 'right',
        y: 'center',
        feature : {
            mark : {show: true},
            dataView : {show: true, readOnly: false},
            restore : {show: true},
            saveAsImage : {show: true}
        }
    },
    series : [
        {
            name: '线路信息',
            type: 'map',
            roam: true,
            hoverable: false,
            mapType: 'china',
            itemStyle:{
                normal:{
                    borderColor:'rgba(100,149,237,1)',
                    borderWidth:0.5,
                    areaStyle:{
                        color: '#1b1b1b'
                    }
                }
            },
            data:[],
            markLine : {
                symbol: ['circle', 'circle'],  
                symbolSize : 1,
                effect : effect,
                itemStyle : itemStyle(0),
                smooth:true,
                data : [
                    // [{name:'北京'}, {name:'哈尔滨'}],
                    // [{name:'哈尔滨'}, {name:'满洲里'}],
                    
                    // [{name:'沈阳'}, {name:'大连'}],
                    // [{name:'大连'}, {name:'烟台'}],
                    // [{name:'烟台'}, {name:'青岛'}],
                    // [{name:'青岛'}, {name:'淮安'}],
                    // [{name:'淮安'}, {name:'上海'}],
                    // [{name:'上海'}, {name:'杭州'}],
                    // [{name:'杭州'}, {name:'宁波'}],
                    // [{name:'宁波'}, {name:'温州'}],
                    // [{name:'温州'}, {name:'福州'}],
                    // [{name:'福州'}, {name:'厦门'}],
                    // [{name:'厦门'}, {name:'广州'}],
                    // [{name:'广州'}, {name:'湛江'}],
                    
                    // [{name:'北京'}, {name:'天津'}],
                    // [{name:'天津'}, {name:'济南'}],
                    // [{name:'济南'}, {name:'南京'}],
                    // [{name:'南京'}, {name:'上海'}],
                    
                    // [{name:'北京'}, {name:'南昌'}],
                    // [{name:'南昌'}, {name:'深圳'}],
                    // [{name:'深圳'}, {name:'九龙红磡'}],
                    
                    // [{name:'北京'}, {name:'郑州'}],
                    // [{name:'郑州'}, {name:'武汉'}],
                    // [{name:'武汉'}, {name:'广州'}],
                    
                    // [{name:'大同'}, {name:'太原'}],
                    // [{name:'太原'}, {name:'焦作'}],
                    // [{name:'焦作'}, {name:'洛阳'}],
                    // [{name:'洛阳'}, {name:'柳州'}],
                    // [{name:'柳州'}, {name:'湛江'}],
                    
                    // [{name:'包头'}, {name:'西安'}],
                    // [{name:'西安'}, {name:'重庆'}],
                    // [{name:'重庆'}, {name:'贵阳'}],
                    // [{name:'贵阳'}, {name:'柳州'}],
                    // [{name:'柳州'}, {name:'南宁'}],
                    
                    // [{name:'兰州'}, {name:'成都'}],
                    // [{name:'成都'}, {name:'昆明'}]
                ]
            },
            geoCoord: {
                // '阿拉山口':[82.5757,45.1706],
                // '包头':[109.8403,40.6574],
                // '北京':[116.4075,39.9040],
                // '成都':[104.0665,30.5723],
                // '大连':[121.6147,38.9140],
                // '大同':[113.3001,40.0768],
                // '德州':[116.3575,37.4341],
                // '福州':[119.2965,26.0745],
                // '广州':[113.2644,23.1292],
                // '贵阳':[106.6302,26.6477],
                // '哈尔滨':[126.5363,45.8023],
                // '邯郸':[114.5391,36.6256],
                // '杭州':[120.1551,30.2741],
                // '合肥':[117.2272,31.8206],
                // '侯马':[111.3720,35.6191],
                // '怀化':[109.9985,27.5550],
                // '淮安':[119.0153,33.6104],
                // '黄骅':[117.3300,38.3714],
                // '济南':[117.1205,36.6510],
                // '焦作':[113.2418,35.2159],
                // '九江':[116.0019,29.7051],
                // '九龙红磡':[114.1870,22.3076],
                // '昆明':[102.8329,24.8801],
                // '拉萨':[91.1409,29.6456],
                // '兰州':[103.8343,36.0611],
                // '黎塘':[109.1363,23.2066],
                // '连云港':[119.2216,34.5967],
                // '临汾':[111.5190,36.0880],
                // '柳州':[109.4160,24.3255],
                // '龙口':[120.4778,37.6461],
                // '洛阳':[112.4540,34.6197],
                // '满洲里':[117.3787,49.5978],
                // '南昌':[115.8581,28.6832],
                // '南京':[118.7969,32.0603],
                // '南宁':[108.3661,22.8172],
                // '南阳':[112.5283,32.9908],
                // '宁波':[121.5440,29.8683],
                // '启东':[121.6574,31.8082],
                // '秦皇岛':[119.6005,39.9354],
                // '青岛':[120.3826,36.0671],
                // '日照':[119.5269,35.4164],
                // '厦门':[118.0894,24.4798],
                // '上海':[121.4737,31.2304],
                // '深圳':[114.0579,22.5431],
                // '神木':[110.4871,38.8610],
                // '沈阳':[123.4315,41.8057],
                // '台前':[115.8717,35.9701],
                // '太原':[112.5489,37.8706],
                // '汤阴':[114.3572,35.9218],
                // '天津':[117.2010,39.0842],
                // '铜陵':[117.8121,30.9454],
                // '瓦塘':[109.7600,23.3161],
                // '温州':[120.6994,27.9943],
                // '乌鲁木齐':[87.6168,43.8256],
                // '武汉':[114.3054,30.5931],
                // '西安':[108.9402,34.3416],
                // '新乡':[113.9268,35.3030],
                // '信阳':[114.0913,32.1470],
                // '烟台':[121.4479,37.4638],
                // '兖州':[116.7838,35.5531],
                // '月山':[113.0550,35.2104],
                // '湛江':[110.3594,21.2707],
                // '长治':[113.1163,36.1954],
                // '郑州':[113.6254,34.7466],
                // '重庆':[106.5516,29.5630]
            }
        }
    ]
};

function drawLines(result) {
    option.series[0].markLine.data = [];
    option.series[0].geoCoord = {};
    result.forEach(function(v) {
        var line;
        if (v.train_info.length == 1) {
            line = v.train_info[0];
            option.series[0].markLine.data.push([{name: station[line.start].name}, {name: station[line.end].name}]);
            option.series[0].geoCoord[station[line.start].name] = [station[line.start].point.x, station[line.start].point.y];
            option.series[0].geoCoord[station[line.end].name] = [station[line.end].point.x, station[line.end].point.y];
        } else {
            v.train_info.forEach(function(v) {
                option.series[0].markLine.data.push([{name: station[v.start].name}, {name: station[v.end].name}]);
                option.series[0].geoCoord[station[v.start].name] = [station[v.start].point.x, station[v.start].point.y];
                option.series[0].geoCoord[station[v.end].name] = [station[v.end].point.x, station[v.end].point.y];
            });
        }
    });
    myChart.setOption(option, true);
};

function addIntoTable(result) {
    $('td').remove();
    var i = 0;
    var first = false;
    result.forEach(function(v) {
        var j = 0;
        i++;
        first = true;
        v.train_info.forEach(function(v) {
            var id = first ? i + '' : '';
            var $info = $('<tr><td>' + id + '</td><td>' + v.train_code + '</td><td>' + station[v.start].name + '</td><td>' + station[v.end].name + '</td><td>' + v.start_time + '</td><td>' + v.end_time + '</td><td>' + JSON.stringify(v.ticket_info[j].num) + '</td><td>' + JSON.stringify(v.ticket_info[j].price) + '</td><td>' + v.duration + '</td></tr>');
            $('#data-row').append($info);
            first = false;
            j++;
        });
    });
}

// 根据result 和 station设置 绘图option
option.series[0].markLine.data = [];

// 设置经纬度信息
option.series[0].geoCoord = {};

var myChart;
var domCode = document.getElementById('sidebar-code');
var domGraphic = document.getElementById('graphic');
var domMain = document.getElementById('main');
var domMessage = document.getElementById('wrong-message');
var iconResize = document.getElementById('icon-resize');
var needRefresh = false;

var enVersion = location.hash.indexOf('-en') != -1;
var hash = location.hash.replace('-en','');
hash = hash.replace('#','') || 'default';
hash += enVersion ? '-en' : '';

var curTheme;
myChart = echarts.init(domMain, curTheme);
myChart.setOption(option, true)
domMessage.innerHTML = '';