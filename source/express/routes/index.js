var express = require('express');
var router = express.Router();
var trainSolution = require('../../getFinalSolution.js');

/*
 * GET train query page.
 */
router.get('/', function(req, res) {
    res.render('index');
});

/*
 * POST to querytrain.
 */
router.post('/querytrain', function(req, res) {
    trainSolution.getFinalSolution(JSON.parse(req.body.args), function(solution){
        res.json(solution);
    });
});

module.exports = router;