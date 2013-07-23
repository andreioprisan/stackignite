var mongo = require('mongodb'),
    _ = require('lodash'),
    request = require('request'),
    db_helper = require('../../helpers/db');

var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var Ec2 = awssum.load('amazon/ec2').Ec2;

// open connections to all regions for querying
var ec2 = [];
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
    init_ec2s("save_instances");

    var total = _.size(regions),
        stats = {},   
        results = [],
        start = new Date().getTime(),
        ts_lg = moment().utc().unix(),
        tenants = 0;


    function saveItems(region_name, tenantId, rawData) {
        var this_total = _.size(rawData);
        fmt.field("region", region_name.region());

        if(_.size(rawData) != 0 && JSON.stringify(rawData) != "[null]" ) {
            fmt.field("found", this_total);
            fmt.field("tenantId", tenantId);
            total += this_total;

            _(rawData).each(function(reservation_data, reservation_id) {
                reservation_data.instanceId = reservation_data.instancesSet.item.instanceId;
                if (reservation_data.instancesSet.item.instanceLifecycle === undefined) {
                    reservation_data.instanceLifecycle = "ondemand";
                } else {
                    reservation_data.instanceLifecycle = reservation_data.instancesSet.item.instanceLifecycle;
                }

                reservation_data.tenantId = tenantId;
                results[tenantId].push(reservation_data.instanceId);

                // save instance state changes
                db.collection('ec2_instances_states', function(err, collection) {
                    if (JSON.stringify(reservation_data.instancesSet.item.reason) == "{}") {
                        reservation_data.instancesSet.item.reason = null
                        change_time = null
                    } else {
                        change_time_s1 = reservation_data.instancesSet.item.reason.indexOf("("); 
                        change_time_s2 = reservation_data.instancesSet.item.reason.indexOf(")"); 
                        change_time_dt = reservation_data.instancesSet.item.reason.substring(change_time_s1+1, change_time_s2);
                        change_time = moment(change_time_dt, "YYYY-MM-DD HH:mm:ss Z").utc().unix()
                    }

                    collection.update(
                        {   id: reservation_data.instancesSet.item.instanceId,
                            tenantId: tenantId,
                            launched: moment(reservation_data.instancesSet.item.launchTime).utc().unix(),
                        }, 
                        { $set: 
                            { 
                                lifecycle: reservation_data.instanceLifecycle,
                                state: reservation_data.instancesSet.item.instanceState.code, 
                                msg: reservation_data.instancesSet.item.reason,
                                updated: change_time,
                                ts_ls: ts_lg,
                            }
                        },
                        { upsert: true, safe: false },
                        function(err2, res2) { }
                    );
                });

                // insert raw instance description data
                db.collection('ec2_instances', function(err, collection) {
                    collection.update(
                        reservation_data, 
                        { $set: 
                            { 
                                ts_ls: ts_lg,
                                tenantId: tenantId,
                            }
                        },
                        { upsert: true, safe: false },
                        function(err2, res2) {
                            if (err2) {
                                //fmt.field("error", err2);
                            }

                            stats[tenantId] += 1;
                            total -= 1;

                            if (total == -2 * _.size(regions) * tenants) {
                                _(tenantIDs).each(function(tenantId, val2) {
                                    r_aws_instance.saveResourcesLastSeen(tenantId, 'ec2', stats[tenantId], ts_lg, results[tenantId]);
                                })

                                res.send({'total': stats, 'elapsed': new Date().getTime() - start});
                            }
                        }
                    );
                });


            });
            total -= 1;
        } else {
            fmt.field("found", 0);
            total -= 1;

            if (total == -2 * _.size(regions) * tenants) {
                _(tenantIDs).each(function(tenantId) {
                    r_aws_instance.saveResourcesLastSeen(tenantId, 'ec2', stats[tenantId], ts_lg, results[tenantId]);
                })
                
                res.send({'total': stats, 'elapsed': new Date().getTime() - start});
            }
        }

    }

    function save_instances(ec2_endpoint, tenantId) {
        if (results[tenantId] == undefined) {
            results[tenantId] = [];
        }

        ec2_endpoint.DescribeInstances({}, function (err, data) {
            var items = data['Body']['DescribeInstancesResponse']['reservationSet']['item'];
            res_count = _.size(items);
            if (err) {
                fmt.field("error", err['Body']['ErrorResponse']['Error']);
            } else {
                if (_.isArray(items) &&
                    _.isObject(items)) {
                    saveItems(ec2_endpoint, tenantId, items);
                } else {
                    saveItems(ec2_endpoint, tenantId, [ items ]);
                }
                total -= 1;
            }

            total += 1;
            if (total == -2 * _.size(regions) * tenants) {
                _(tenantIDs).each(function(tenantId) {
                    r_aws_instance.saveResourcesLastSeen(tenantId, 'ec2', stats[tenantId], ts_lg, results[tenantId]);
                })

                //res.send({'total': stats, 'elapsed': new Date().getTime() - start});
            }
        });
    }

    function init_ec2s(post) {
        ec2 = [];
        db.collection('tenants', function(err, collection) {
            collection.find().toArray(function(d, tenantsResults) {
                results = {};
                _(tenantsResults).each(function(tenant) {
                    total = -_.size(regions)*2,
                    stats[tenant.id] = 0,   
                    results[tenant.id] = [];
                    tenantIDs.push(tenant.id);

                    _(regions).each(function(region_name,b) {
                        ec2.push( 
                            [new Ec2({
                                'accessKeyId'     : tenant.key,
                                'secretAccessKey' : tenant.secret,
                                'region'          : region_name
                            }), tenant.id]
                        );
                        
                        if (_.size(ec2) == _.size(regions) * _.size(tenantsResults)) {
                            tenants = _.size(tenantsResults);

                            _(ec2).each(function(reg) {
                                if (post == "save_instances") {
                                    //total -= 1;
                                    save_instances(reg[0], reg[1]);
                                }
                            });
                        }
                    });
                });
            });
        });
    }
};

exports.DescribePlacementGroups = function(req, res) {
    ec2.DescribePlacementGroups({}, function (err, data) {
        if (err) {
            res.send({});
        } else {
            res.send(data['Body']['DescribePlacementGroupsResponse']['placementGroupSet']['item']);
        }
    });

};


exports.DescribeTags = function(req, res) {
    db_helper.dbConnect(["ec2_instances"]);

    ec2.DescribeTags({}, function (err, data) {
        if (err) {
            res.send({});
        } else {
            res.send(data['Body']['DescribeTagsResponse']);
        }
    });

};


exports.findById = function(req, res) {
    res.send({a:"a"});
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
    db_helper.dbConnect(["ec2_instances"]);
    ec2.DescribeInstanceStatus({'InstanceId': id}, function (err, data) {
        console.log(JSON.stringify(data['Body']['DescribeInstanceStatusResponse']['instanceStatusSet']));
    });
}
function saveEC2RunningInstances() {
    db_helper.dbConnect(["ec2_instances"]);

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
