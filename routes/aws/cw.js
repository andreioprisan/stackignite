var mongo = require('mongodb'),
    _ = require('lodash'),
    crypto = require('crypto'),
    request = require('request'),
    db_helper = require('../../helpers/db');

var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var CloudWatch = awssum.load('amazon/cloudwatch').CloudWatch;

// open connections to all regions for querying
var cw = {};
//var regions = ["us-east-1", "us-west-1", "us-west-2", "eu-west-1"];
var regions = [
    "us-east-1",
    "us-west-1",
    "us-west-2",
    "eu-west-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "sa-east-1"];

_(regions).each(function(region_name,b) {
    cw[region_name] = new CloudWatch({
        'accessKeyId'     : process.env.accessKeyId,
        'secretAccessKey' : process.env.secretAccessKey,
        'region'          : region_name
    })
});

exports.ListMetrics = function(req, res) {
    db_helper.dbConnect(["cloudwatch_list_metrics"]);
    var total = 0, net = 0, 
        start = new Date().getTime();
    var results = {};
    var errors = [];

    function manageCounter(opt, results) {
        if (opt == "inc") {
            ++total;
            ++net;
        } else if (opt == "dec") {
            --total;
        } 

        if (total == 0) {
            console.log('CloudWatch::ListMetrics finished running');
            res.send({total: net, elapsed: new Date().getTime() - start});
        }
    }

    function ListMetrics(cw, region_name, args) {
        manageCounter("inc", results);

        cw[region_name].ListMetrics(args, function (err, data) { 
            if (err) {
                errors.push(err);
            } else {
                _(data['Body']['ListMetricsResponse']['ListMetricsResult']['Metrics']['member']).each(function(a,b) {
                    if (typeof a.Dimensions == "object") {
                        if (typeof a.Dimensions['member'] == "object")
                            var id = a.Dimensions['member'].Value;
                        else
                            var id = "general";
                    } else {
                        var id = "general";
                    }

                    db.collection('cloudwatch_list_metrics', function(err, collection) {
                        manageCounter("inc", results);
                        if (err !== null) {
                            console.log("error: "+JSON.stringify(err));
                        }

                        collection.update(
                            {
                                'ns': a.Namespace,
                                'id': id,
                                'm': a.MetricName
                            },
                            { $set: { 'lg': moment().utc().unix() } },
                            { upsert: true, safe: false },
                            function(err2, res2) {
                                manageCounter("dec", results);

                                if (!res2) {
                                    console.log("error:"+JSON.stringify(err2));
                                }
                            }
                        )
                    });
                })

                if (data['Body']['ListMetricsResponse']['ListMetricsResult']["NextToken"] !== undefined) {
                    ListMetrics(cw, region_name, {NextToken: data['Body']['ListMetricsResponse']['ListMetricsResult']["NextToken"]});
                }
            }

            manageCounter("dec", results);
        });
    }

    _(cw).each(function(reg,region_name) {
        ListMetrics(cw, region_name, {});
    });
};

exports.DescribeAlarms = function(req, res) {
    _(cw).each(function(reg,region_name) {
        cw[region_name].DescribeAlarms({}, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                res.send(data['Body']['DescribeAlarmsResponse']['DescribeAlarmsResult']);
            }
        });
    });
};

