crypto = require('crypto');

var mongo = require('mongodb'),
    _ = require('lodash'),
    crypto = require('crypto'),
    request = require('request'),
    fmt = require('fmt'),
    db_helper = require('../../helpers/db'),
    r_ec2_instance = require('./ec2'),
    r_rds_instance = require('./rds'),
    r_users_instance = require('../auth/users');

var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var Ec2 = awssum.load('amazon/ec2').Ec2;
var Rds = awssum.load('amazon/rds').Rds;

// open connections to all regions for querying
var ec2 = {},
    rds = {};
var regions = [
    "us-east-1",
    "us-west-1",
    "us-west-2",
    "eu-west-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "sa-east-1"
    ];

exports.find_ec2_rds_allzones = function(req, res) {
    var results = { 'ec2': null, 'rds': null };
    var total = _.size(results);
    var tenantId = 0;

    if (req.session.uid === undefined) {
        res.redirect('/');
        return;
    }

    var session_obj = r_users_instance.getSessionData(req, res);
    tenantId = session_obj['tid'];
    if (session_obj['tid'] === undefined) {
        res.redirect('/');
        return;
    }

    db_helper.dbConnect(["aws_resources_ls", "ec2_instances", "rds_instances"]);


    db.collection('aws_resources_ls', function(err, collection) {
        collection.find(
        {
            "tenantId": tenantId,
            "ts_ls": {$gte: moment().utc().unix()-60},
            $or: [ {service:"ec2"}, {service:"rds"} ]
        })
        .toArray(function(err2, resources) {
            if (err2) {
                total -= 1;
            }

            if (total == 0 || tenantId == 0) {
                res.send(results);
            }

            _(resources).each(function(resources_data, resources_id) {
                if (resources_data.service == "ec2") {
                    getEC2s(tenantId, resources_data['ids']);
                } else if (resources_data.service == "rds") {
                    getRDSs(tenantId, resources_data['ids']);
                }
            });
        });

    });

    if (total == 0) {
        res.send(results);
    }

    function getEC2s(tenantId, ids) {
        var s = moment();
        db.collection('ec2_instances')
        .find({ "tenantId": tenantId, "instanceId" : { $in: ids } })
        .toArray(function(err2, result) {
            var runningTime = moment() - s;
            console.log('EC2::getInstances finished running in ' + runningTime);
            results.ec2 = result;

            total -= 1;
            if (total == 0) {
                res.send(results);
            }
        });
    }

    function getRDSs(tenantId, ids) {
        var s = moment();
        db.collection('rds_instances')
        .find({ "tenantId": tenantId, "InstanceCreateTime": { $exists: true }, "id" : { $in: ids } })
        .toArray(function(err2, result) {
            var runningTime = moment() - s;
            console.log('RDS::getInstances finished running in ' + runningTime);
            results.rds = result;

            total -= 1;
            if (total == 0) {
                res.send(results);
            }
        });
    }
};

exports.find_instances = function(req, res) {
    var results = { 'ec2': null, 'rds': null };
    var total = 0;
    var tenantId = 0;
    var type = req.params.type 
    var level = req.params.level 
    if (level == undefined)
        level = "active"

    if (req.session.uid === undefined) {
        res.redirect('/');
        return;
    }

    var session_obj = r_users_instance.getSessionData(req, res);
    tenantId = session_obj['tid'];
    if (session_obj['tid'] === undefined) {
        res.redirect('/');
        return;
    }

    db_helper.dbConnect(["aws_resources_ls", "ec2_instances", "rds_instances"]);

    if (level == "active") {
        db.collection('aws_resources_ls')
        .find({
            tenantId: tenantId,
            service: type
        })
        .sort({ts_ls: -1}).limit(1)
        .toArray(function(err2, resources) {
            if (err2) {
                total -= 1;
            }

            _(resources).each(function(resources_data, resources_id) {
                total += 1;
                if (type == "ec2") {
                    getEC2s(tenantId, resources_data['ids']);
                } else if (type == "rds") {
                    getRDSs(tenantId, resources_data['ids']);
                }
            });
        });
    } else if (level == "all") {
        var ids_list = [];

        db.collection('aws_resources_ls')
        .find({
            tenantId: tenantId,
            service: type
        })
        .sort({ts_ls: -1})
        .toArray(function(err2, resources) {
            _(resources).each(function(item) {
                _(item.ids).each(function(id) {
                    ids_list.push(id);
                });
            });

            ids_list = _.uniq(ids_list);

            if (err2) {
                total -= 1;
            }

            total += 1;
            if (type == "ec2") {
                getEC2s(tenantId, ids_list);
            } else if (type == "rds") {
                getRDSs(tenantId, ids_list);
            }
        });
    }


    function getEC2s(tenantId, ids) {
        var s = moment();
        db.collection('ec2_instances')
        .find({ "tenantId": tenantId, "instanceId" : { $in: ids } })
        .toArray(function(err2, result) {
            var runningTime = moment() - s;
            console.log('ec2_instances - ' + runningTime);
            results.ec2 = result;

            total -= 1;
            if (total == 0) {
                res.send(results);
            }
        });
    }

    function getRDSs(tenantId, ids) {
        var s = moment();
        db.collection('rds_instances')
        .find({ "tenantId": tenantId, "InstanceCreateTime": { $exists: true }, "id" : { $in: ids } })
        .toArray(function(err2, result) {
            var runningTime = moment() - s;
            console.log('RDS::getInstances finished running in ' + runningTime);
            results.rds = result;

            total -= 1;
            if (total == 0) {
                res.send(results);
            }
        });
    }
};

