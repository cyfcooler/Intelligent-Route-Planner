var Result = (function () {
    function Result(args) {
        this.results = [];
        this.$resultContainer = $("#result_container");
    }

    Result.prototype.SetTitle = function (depart, dest, date) {
        $("#result_panel_title_city").text(depart + " - " + dest);
        $("#result_panel_title_date").text(date);
    }

    Result.prototype.Clear = function () {
        this.$resultContainer.empty();
    }

    Result.prototype.SetData = function (data) {
        this.results = data;
		if (!data || data.length == 0) {
			this.ShowNoResult();
		}
        for (var i = 0; i < this.results.length; i++) {
            this.AddOneResult(this.results[i]);
        }
    }

	Result.prototype.ShowNoResult = function() {
		var $block = $("<h4>没有结果</h4>");
		
		
		this.$resultContainer.append($block);
	}
	
    Result.prototype.AddOneResult = function (result) {
        var $resultBlock = $(
            "<div class='result-block'>" +

            "</div>");

        var price = 0;
        this.AddOneItem($resultBlock, result.train_info[0], 0);
        price += result.train_info[0].ticket_info[0].price.min_price;
        for (var i = 1; i < result.train_info.length; i++) {
            this.AddSeparateLine($resultBlock);
            this.AddOneItem($resultBlock, result.train_info[i], i);
            price += result.train_info[i].ticket_info[i].price.min_price;
        }

        if (result.train_info.length > 1) {
            this.AddTotalPrice($resultBlock, price);
        }

        this.$resultContainer.append($resultBlock);
    }

    Result.prototype.AddOneItem = function ($resultBlock, info, index) {
        var $template = $(
            "<div class='result-row'>" +
                "<div class='result-time'>" +
                    "<h4>" + info.start_time + "</h4>" +
                    "<h5>" + info.end_time + "</h5>" +
                "</div>" +

                "<div class='result-info'>" +
                    "<h4>" + info.train_code + "</h4>" +
                    "<h4>" + g_cityMap.code2name[info.start] + " - " + g_cityMap.code2name[info.end] + "</h4>" +
                "</div>" +

                "<div class='result-price'>" +
                    "<h6>￥</h6>" + "<h4>" + info.ticket_info[index].price.min_price / 10 + "</h4>" + "<h6>起</h6>" +
                "</div>" +
            "</div>");

        $resultBlock.append($template);
    }

    Result.prototype.AddSeparateLine = function ($resultBlock) {
        var $template = $(
            "<div class='seperator-row'>" +
                "<h5 class='seperator-text'>中转</h5>" +
                "<div class='separator-line'></div>" +
            "</div>");

        $resultBlock.append($template);
    }

    Result.prototype.AddTotalPrice = function ($resultBlock, price) {
        var $template = $(
            "<div class='result-row result-total-price-row'>" +
                "<div class='result-total-price-1'>" +
                    "<h4>总价</h4>" +
                "</div>" +
                "<div class='result-total-price-2'>" +
                    "<h6>￥</h6>" + 
                    "<h4>" + price / 10 + "</h4>" +
                    "<h6>起</h6>" +
                "</div>" +
            "</div>");

        $resultBlock.append($template);
    }

    Result.prototype.GetMockData = function () {
        var mockResult = [];
        mockResult[0] = {};
        mockResult[0].train_info = [{
            train_code: "K123",
            start: "BJH",
            end: "VAP",
            start_time: "10:01",
            end_time: "20:01",
            duration: 600,
            ticket_info: {
                num: {
                    zy_num: 1,
                },

                price: {
                    min_price: 5000,
                    zy_price: 5000,
                }
            }
        }];
        mockResult[0].wait_time = [];
        mockResult[0].total_duration = 600;

        mockResult[1] = {};
        mockResult[1].train_info = [{
            train_code: "K124",
            start: "ABC",
            end: "DEF",
            start_time: "10:01",
            end_time: "20:01",
            duration: 600,
            ticket_info: {
                num: {
                    zy_num: 1,
                },

                price: {
                    min_price: 3335,
                    zy_price: 3335,
                }
            }
        }, {
            train_code: "K125",
            start: "WWW",
            end: "ZZZ",
            start_time: "10:01",
            end_time: "20:01",
            duration: 600,
            ticket_info: {
                num: {
                    zy_num: 1,
                },

                price: {
                    min_price: 4445,
                    zy_price: 4445,
                }
            }
        }];
        mockResult[1].wait_time = [60];
        mockResult[1].total_duration = 700;

        mockResult[2] = {};
        mockResult[2].train_info = [{
            train_code: "K124",
            start: "ABC",
            end: "DEF",
            start_time: "10:01",
            end_time: "20:01",
            duration: 600,
            ticket_info: {
                num: {
                    zy_num: 1,
                },

                price: {
                    min_price: 3335,
                    zy_price: 3335,
                }
            }
        }, {
            train_code: "K125",
            start: "WWW",
            end: "ZZZ",
            start_time: "10:01",
            end_time: "20:01",
            duration: 600,
            ticket_info: {
                num: {
                    zy_num: 1,
                },

                price: {
                    min_price: 4445,
                    zy_price: 4445,
                }
            }
        }, {
            train_code: "K126",
            start: "EEE",
            end: "RRR",
            start_time: "10:01",
            end_time: "20:01",
            duration: 600,
            ticket_info: {
                num: {
                    zy_num: 1,
                },

                price: {
                    min_price: 2445,
                    zy_price: 2445,
                }
            }
        }];
        mockResult[2].wait_time = [60, 30];
        mockResult[2].total_duration = 700;

        mockResult[3] = {};
        mockResult[3].train_info = [{
            train_code: "K124",
            start: "ABC",
            end: "DEF",
            start_time: "10:01",
            end_time: "20:01",
            duration: 600,
            ticket_info: {
                num: {
                    zy_num: 1,
                },

                price: {
                    min_price: 3335,
                    zy_price: 3335,
                }
            }
        }, {
            train_code: "K125",
            start: "WWW",
            end: "ZZZ",
            start_time: "10:01",
            end_time: "20:01",
            duration: 600,
            ticket_info: {
                num: {
                    zy_num: 1,
                },

                price: {
                    min_price: 4445,
                    zy_price: 4445,
                }
            }
        }];
        mockResult[3].wait_time = [60];
        mockResult[3].total_duration = 700;


        return mockResult;
    }

    return Result;
})();

var g_result = new Result();