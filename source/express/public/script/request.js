var Request = (function () {
    function Request(args) {
        this.data = {};
        this.data.date = "";
        this.data.from = "";
        this.data.to = "";
        this.data.order_by = "price";
        this.callback = null;
    }

    Request.prototype.SetDate = function (date) {
        if (isNaN(Date.parse(date))) {
            throw "Invalid date:" + date.toString();
        }

        this.data.date = date;
    }

    Request.prototype.SetStart = function (code) {
        this.data.from = code;
    }

    Request.prototype.SetEnd = function (code) {
        this.data.to = code;
    }

    Request.prototype.SetOrderBy = function (orderBy) {
        this.data.order_by = orderBy;
    }

    Request.prototype.SetCallback = function (callback) {
        this.callback = callback;
    }

    Request.prototype.SetConsidderTransfer = function (flag) {
        this.data.consider_transfer = !!flag;
    }

    Request.prototype.SetSameStationTransfer = function (flag) {
        this.data.same_station_transfer = !!flag;
    }

    Request.prototype.SetDepartTimeRange = function (from, to) {
        this.data.start_time_range = [parseInt(from), parseInt(to)];
    }

    Request.prototype.SetArriveTimeRange = function (from, to) {
        this.data.end_time_range = [parseInt(from), parseInt(to)];
    }

    Request.prototype.Send = function () {
        
        $(".main-container").hide();
        $("#result_panel").fadeIn("fast");
        
        
        var _this = this;
        $.ajax({
            type: 'POST',
            data: { 'args': JSON.stringify(this.data) },
            url: '/querytrain',
            dataType: 'JSON'
        }).done(function (response) {
			g_result.SetData(response);
            if (_this.callback) {
                _this.callback(response);
            }
        });
        
    }

    Request.prototype.Verify = function () {
        if (!this.data.from) {
            return "请选择出发城市";
        }

        if (!this.data.to) {
            return "请选择到达城市";
        }

        if (this.data.from === this.data.to) {
            return "请选择不同的到达城市";
        }

        if (!this.data.date) {
            return "请选择出发日期";
        }

        return "OK"
    }

    return Request;
})();

var g_request = new Request();