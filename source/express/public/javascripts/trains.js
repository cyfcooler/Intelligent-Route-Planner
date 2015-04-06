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

    // Use AJAX to post the object to our adduser service
    $.ajax({
        type: 'POST',
        data: {'args': JSON.stringify(args)},
        url: '/querytrain',
        dataType: 'JSON'
    }).done(function( response ) {

        // Check for successful (blank) response
        if (response.length > 0) {

            // Update the table
            $('#train_info').html(JSON.stringify(response));

        }
        else {

            // If something goes wrong, alert the error message that our service returned
            alert('Error !');

        }
    });
};