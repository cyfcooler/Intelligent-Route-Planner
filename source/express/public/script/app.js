var Accordion = (function () {
    function Accordion(containerId) {
        this.m_container = document.getElementById(containerId);
    }

    Accordion.prototype.Build = function (arg) {
        var panel = document.createElement("div");
        panel.className = "panel panel-default";

        var heading = document.createElement("div");
        heading.className = "panel-heading collapsed";
        heading.setAttribute("role", "tab");
        heading.setAttribute("role", "button");
        heading.setAttribute("data-toggle", "collapse");
        heading.setAttribute("data-parent", "#accordion");
        heading.setAttribute("data-target", "#" + arg.id);

        var title = document.createElement("h4");
        title.className = "accordion-panel-title";
        title.textContent = arg.title;
        heading.appendChild(title);

        var body = document.createElement("div");
        body.id = arg.id;
        body.className = "panel-collapse collapse"
        body.setAttribute("role", "tabpanel");

        if (arg.items != null && arg.items != undefined & arg.items instanceof Array) {
            arg.items.forEach(function (element, index, array) {
                var item = document.createElement("h5");
                item.className = "city-name";
                item.textContent = element.cityName;
                $(item).data("code", element.cityCode);
                item.onclick = function () {
                    var targetId = $("#cityPickerModal").data("purpose");
                    var targetInput = $("#" + targetId);
                    targetInput.val(this.textContent);
                    if (targetId === "depart_city") {
                        g_request.SetStart($(this).data("code"));
                    } else if (targetId === "dest_city") {
                        g_request.SetEnd($(this).data("code"));
                    } else {
                        throw ("Unexpected element ID:" + targetId);
                    }

                    $("#cityPickerModal").modal("hide");
                };

                body.appendChild(item);
            });
        }

        panel.appendChild(heading);
        panel.appendChild(body);
        this.m_container.appendChild(panel);
    }

    return Accordion;
})();

var Application = (function () {
    function Application(args) {
    }

    Application.prototype.Start = function () {
        var $datepicker = $("#depart_date").pickadate({
            format: 'yyyy年mm月dd日',
            formatSubmit: 'yyyy-mm-dd',
            clear: '',
            min: true,
            hiddenName: true,
            onSet: function (event) {
                g_request.SetDate(this.get('select', 'yyyy-mm-dd'));
            }
        });

        var cityPickerTarget = "";
        $("#depart_city").fastButton(function (event) {
            cityPickerTarget = "depart_city";
            $('#cityPickerModal').modal('show');
        });

        $("#dest_city").fastButton(function (event) {
            cityPickerTarget = "dest_city";
            $('#cityPickerModal').modal('show');
        });

        $("#sort_by_price").on("click", function (event) {
            var str = $(event.currentTarget).text();
            $("#sort_button").text(str);
            g_request.SetOrderBy("price");
        });

        $("#sort_by_time").on("click", function (event) {
            var str = $(event.currentTarget).text();
            $("#sort_button").text(str);
            g_request.SetOrderBy("time");
        });

        $("#cb_transfer").change(function () {
            if ($(this).is(":checked")) {
                g_request.SetConsidderTransfer(true);
                $("#cb_same_city_transfer").removeAttr("disabled");
            }
            else {
                g_request.SetConsidderTransfer(false);
                g_request.SetSameStationTransfer(false);
                $("#cb_same_city_transfer").prop("checked", false);
                $("#cb_same_city_transfer").attr("disabled", true);
            }
        });

        $("#cb_same_city_transfer").change(function () {
            if ($(this).is(":checked")) {
                g_request.SetSameStationTransfer(true);
            }
            else {
                g_request.SetSameStationTransfer(false);
            }
        });

        var depart_time_from = 0;
        var depart_time_to = 24;
        $("#depart_time_from").change(function () {
            depart_time_from = this.value;
            $("#depart_time_to").find("option").prop("disabled", false);
            for (var i = 0; i <= depart_time_from; i++) {
                $("#depart_time_to").find("option[value='" + i + "']").prop("disabled", true);
            }

            g_request.SetDepartTimeRange(depart_time_from, depart_time_to);
        });

        $("#depart_time_to").change(function () {
            depart_time_to = this.value;
            $("#depart_time_from").find("option").prop("disabled", false);
            for (var i = depart_time_to; i <= 23; i++) {
                $("#depart_time_from").find("option[value='" + i + "']").prop("disabled", true);
            }

            g_request.SetDepartTimeRange(depart_time_from, depart_time_to);
        });

        var arrive_time_from = 0;
        var arrive_time_to = 24;
        $("#arrive_time_from").change(function () {
            arrive_time_from = this.value;
            $("#arrive_time_to").find("option").prop("disabled", false);
            for (var i = 0; i <= arrive_time_from; i++) {
                $("#arrive_time_to").find("option[value='" + i + "']").prop("disabled", true);
            }

            g_request.SetArriveTimeRange(arrive_time_from, arrive_time_to);
        });

        $("#arrive_time_to").change(function () {
            arrive_time_to = this.value;
            $("#arrive_time_from").find("option").prop("disabled", false);
            for (var i = arrive_time_to; i <= 23; i++) {
                $("#arrive_time_from").find("option[value='" + i + "']").prop("disabled", true);
            }

            g_request.SetArriveTimeRange(arrive_time_from, arrive_time_to);
        });

        $("#submit_button").fastButton(function (event) {
            var verifyResult = g_request.Verify();
            if (verifyResult == "OK") {
                g_result.SetTitle($("#depart_city").val(), $("#dest_city").val(), $datepicker.pickadate("picker").get("select", "yyyy年mm月dd日"));
                g_result.Clear();
                g_request.Send();
            }
            else {
                var errorDialog = $("#errorModal");
                var errorDialogBody = errorDialog.find(".modal-body");
                errorDialogBody.text(verifyResult);
                $("#errorModal").modal('show');
            }
        });

        $("#result_back_button").fastButton(function (event) {
            $("#result_panel").hide();
            $(".main-container").fadeIn("fast");
        });

        $("#cityPickerModal").on("show.bs.modal", function (event) {
            $(this).data("purpose", cityPickerTarget);
        });

        var citiesByPinyin = {};
        Object.keys(g_cities).forEach(function (item) {
            var firstLetter = g_cities[item]["first_letter"];
            if (!citiesByPinyin[firstLetter]) {
                citiesByPinyin[firstLetter] = [];
            }

            var code = item;
            var name = g_cities[item]["city_name"];
            citiesByPinyin[firstLetter].push({ cityCode: code, cityName: name });
        });

        var accordion = new Accordion("accordion");
        for (var keycode = "A".charCodeAt(0) ; keycode <= "Z".charCodeAt(0) ; keycode++) {
            var firstLetter = String.fromCharCode(keycode);
            if (citiesByPinyin[firstLetter]) {
                var arg = {};
                arg.id = "collapse" + firstLetter;
                arg.title = "拼音" + firstLetter;
                arg.items = citiesByPinyin[firstLetter];
                accordion.Build(arg);
            }
        }

    };

    return Application;
})();

window.onload = function () {
    var app = new Application();
    app.Start();
};
