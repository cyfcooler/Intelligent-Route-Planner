// DOM Ready =============================================================
$(document).ready(function() {

    // Add User button click
    $('#btnQueryTrain').on('click', queryTrain);

});

// Functions =============================================================

// Query Train
function queryTrain(event) {
    event.preventDefault();

    var args = [];
    $('#query_train input').each(function(index, val) {
        args.push($(this).val());
    });

    // Use AJAX to post the object to our adduser service
    $.ajax({
        type: 'POST',
        data: {'args': JSON.stringify(args)},
        url: '/querytrain',
        dataType: 'JSON'
    }).done(function( response ) {

        // Check for successful (blank) response
        if (response.length > 0) {

            // Clear the form inputs
            $('#query_train fieldset input').val('');

            // Update the table
            $('#train_info').html(JSON.stringify(response));

        }
        else {

            // If something goes wrong, alert the error message that our service returned
            alert('Error !');

        }
    });
};