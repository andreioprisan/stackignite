var mongo = require('mongodb'),
    _ = require('lodash'),
    request = require('request'),
    db_helper = require('../../helpers/db');

var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var Rds = awssum.load('amazon/rds').Rds;

// open connections to all regions for querying
var rds = [];
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
var tenants = 0;
var tenantIDs = [];

exports.findAll = function(req, res) {

};

exports.updateAll = function(req, res) {
    init_rdss("save_instances");

    var total = _.size(regions),
        stats = {},   
        results = [],
        start = new Date().getTime(),
        ts_lg = moment().utc().unix(),
        tenants = 0;


    function saveItems(rds_endpoint, tenantId, accountId, rawData) {
        var this_total = _.size(rawData);
        fmt.field("region", rds_endpoint.region());

        if (results[tenantId] == undefined) {
            results[tenantId] = [];
        }

        if(_.size(rawData) != 0 && JSON.stringify(rawData) != "[null]" ) {
            fmt.field("found", this_total);
            fmt.field("tenantId", tenantId);
            total += this_total;

            _(rawData).each(function(reservation_data, reservation_id) {
                var id = reservation_data.DBInstanceIdentifier;
                var region = reservation_data.AvailabilityZone.substr(0,reservation_data.AvailabilityZone.length-1);

                var ResourceName = 'arn:aws:rds:'+region+':'+accountId+':db:'+id;
                var tags = null;

                rds_endpoint.ListTagsForResource({ResourceName: ResourceName}, function (err, data2) {
                    if (!err) {
                        // decrease counter of total responses waiting for
                        tags = data2['Body']['ListTagsForResourceResponse']['ListTagsForResourceResult']['TagList']['Tag'];
                        // save tags to original response
                        // stay compatible with ec2 query
                        reservation_data.tagSet = tags;
                        reservation_data.region = rds_endpoint.region();
                        reservation_data.ownerId = rds_endpoint.awsAccountId();
                        reservation_data.id = id;
                        reservation_data.tenantId = tenantId;

                        var skip = false;
                        if (reservation_data.DBInstanceStatus == "deleting") {
                            change_time = moment().utc().unix()
                        } else if (reservation_data.DBInstanceStatus == "creating") {
                            skip = true;
                        } else {
                            change_time = null
                        }

                        if (reservation_data.Endpoint != undefined && 
                            reservation_data.Endpoint.Address != undefined) {
                            reservation_data.id = reservation_data.Endpoint.Address;
                            skip = false;
                        } else {
                            skip = true;
                            console.log("skipping")
                        }

                        // save instance state changes
                        if (!skip) {
                            id = reservation_data.id
                            results[tenantId].push(id);

                            db.collection('rds_instances_states').update(
                                {   id: reservation_data.id,
                                    tenantId: tenantId,
                                    launched: moment(reservation_data.InstanceCreateTime).utc().unix(),
                                }, 
                                { $set: 
                                    { 
                                        id: reservation_data.id,
                                        state: reservation_data.DBInstanceStatus, 
                                        updated: change_time,
                                        ts_ls: ts_lg,
                                    }
                                },
                                { upsert: true, safe: false },
                                function(err2, res2) { }
                            );

                            db.collection('rds_instances').update(
                                reservation_data, 
                                { $set: 
                                    { 
                                        ts_ls: ts_lg,
                                        tenantId: tenantId,
                                        id: reservation_data.id
                                    }
                                },
                                { upsert: true, safe: false },
                                function(err2, res2) {
                                    if (err2) {
                                        fmt.field("error", err2);
                                    }
                                    
                                    stats[tenantId] += 1;
                                    total -= 1;

                                    if (total == -2 * _.size(regions) * tenants) {
                                        _(tenantIDs).each(function(tenantId, val2) {
                                            r_aws_instance.saveResourcesLastSeen(tenantId, 'rds', stats[tenantId], ts_lg, results[tenantId]);
                                        })

                                        res.send({'total': stats, 'elapsed': new Date().getTime() - start});
                                    }
                                }
                            );
                        }

                    } else {
                        total -= 1;                            
                    }
                });
            });
            total -= 1;
        } else {
            fmt.field("found", 0);
            total -= 1;

            if (total == -2 * _.size(regions) * tenants) {
                _(tenantIDs).each(function(tenantId) {
                    r_aws_instance.saveResourcesLastSeen(tenantId, 'rds', stats[tenantId], ts_lg, results[tenantId]);
                })
                
                res.send({'total': stats, 'elapsed': new Date().getTime() - start});
            }
        }
    }

    function save_instances(rds_endpoint, tenantId, accountId) {
        if (results[tenantId] == undefined) {
            results[tenantId] = [];
        }

        rds_endpoint.DescribeDBInstances({}, function (err, data) {
            var items = data['Body']['DescribeDBInstancesResponse']['DescribeDBInstancesResult']['DBInstances']['DBInstance'];
            res_count = _.size(items);
            if (err) {
                fmt.field("error", err['Body']['ErrorResponse']['Error']);
            } else {
                if (_.isArray(items) &&
                    _.isObject(items)) {
                    saveItems(rds_endpoint, tenantId, accountId, items);
                } else {
                    saveItems(rds_endpoint, tenantId, accountId, [ items ]);
                }
                total -= 1;
            }

            total += 1;
            if (total == -2 * _.size(regions) * tenants) {
                _(tenantIDs).each(function(tenantId) {
                    r_aws_instance.saveResourcesLastSeen(tenantId, 'rds', stats[tenantId], ts_lg, results[tenantId]);
                })

                res.send({'total': stats, 'elapsed': new Date().getTime() - start});
            }
        });
    }

    function init_rdss(post) {
        rds = [];
        db.collection('tenants', function(err, collection) {
            collection.find().toArray(function(d, tenantsResults) {
                results = {};
                _(tenantsResults).each(function(tenant) {
                    total = -_.size(regions)*2,
                    stats[tenant.id] = 0,   
                    results[tenant.id] = [];
                    tenantIDs.push(tenant.id);

                    _(regions).each(function(region_name,b) {
                        rds.push( 
                            [new Rds({
                                'accessKeyId'     : tenant.key,
                                'secretAccessKey' : tenant.secret,
                                'awsAccountId'    : tenant.account,
                                'region'          : region_name
                            }), tenant.id, tenant.account]
                        );
                        
                        if (_.size(rds) == _.size(regions) * _.size(tenantsResults)) {
                            tenants = _.size(tenantsResults);

                            _(rds).each(function(reg) {
                                if (post == "save_instances") {
                                    //total -= 1;
                                    save_instances(reg[0], reg[1], reg[2]);
                                }
                            });
                        }
                    });
                });
            });
        });
    }
};

exports.findById = function(req, res) {
//    var id = req.params.id;

    res.send({a:"a"});

};

exports.ListTagsForResource = function(req, res) {
    db_helper.dbConnect(["rds_instances"]);

    var id = req.params.id;
    rds.ListTagsForResource({ResourceName: id}, function (err, data) {
        if (err) {
            res.send({'error': err['Body']['ErrorResponse']['Error']});
        } else {            
            res.send(data['Body']['ListTagsForResourceResponse']['ListTagsForResourceResult']['TagList']['Tag']);
        }
    });

};

exports.add = function(req, res) {
    res.send({a:"a"});
};

exports.update = function(req, res) {
    res.send({a:"a"});
};


// main run loop on initialization
function run() {
    //saveEC2Prices();
    saveEC2RunningInstances();
}

function DescribeInstanceStatus(id) {
    db_helper.dbConnect(["rds_instances"]);

    ec2.DescribeInstanceStatus({'InstanceId': id}, function (err, data) {
        console.log(JSON.stringify(data['Body']['DescribeInstanceStatusResponse']['instanceStatusSet']));
    });
}
function saveEC2RunningInstances() {
    db_helper.dbConnect(["rds_instances"]);

    ec2.DescribeInstances({}, function (err, data) {
        if (err) {
            console.log("error: "+err); // an error occurred
        } else {
            _.forOwn(data['Body']['DescribeInstancesResponse']['reservationSet']['item'], function(u, k) {
                console.log(JSON.stringify(u));
                var instanceId = u['instancesSet']['item']['instanceId'];

                //DescribeInstanceStatus(instanceId);

            });
        }
    });

}
