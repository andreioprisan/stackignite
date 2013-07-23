var mongo = require('mongodb'),
    _ = require('lodash'),
    crypto = require('crypto'),
    request = require('request'),
    db_helper = require('../../helpers/db');

var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var Ec2 = awssum.load('amazon/ec2').Ec2;

var ec2 = new Ec2({
    'accessKeyId'     : process.env.accessKeyId,
    'secretAccessKey' : process.env.secretAccessKey,
    'region'          : amazon.US_EAST_1
});

EC2_REGIONS = [
    "us-east-1",
    "us-west-1",
    "us-west-2",
    "eu-west-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "sa-east-1"
]

RDS_REGIONS = [
    "us-east-1",
    "us-west-1",
    "us-west-2",
    "eu-west-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "sa-east-1"
]

EC2_INSTANCE_TYPES = [
    "t1.micro",
    "m1.small",
    "m1.medium",
    "m1.large",
    "m1.xlarge",
    "m2.xlarge",
    "m2.2xlarge",
    "m2.4xlarge",
    "c1.medium",
    "c1.xlarge",
    "cc1.4xlarge",
    "cc2.8xlarge",
    "cg1.4xlarge",
    "m3.xlarge",
    "m3.2xlarge",
    "hi1.4xlarge",
    "hs1.8xlarge"
]

RDS_INSTANCE_TYPES = [
    "db.t1.micro",
    "db.m1.small",
    "db.m1.medium",
    "db.m1.large",
    "db.m1.xlarge",
    "db.m2.xlarge",
    "db.m2.2xlarge",
    "db.m2.4xlarge"
]

EC2_OS_TYPES = [
    "linux",
    "mswin"
]

RDS_ENGINE_TYPES = [
    "mysql",
    "oracle-se1",
    "oracle",
    "sqlserver-ex",
    "sqlserver-web",
    "sqlserver-se",
    "sqlserver"
]

JSON_NAME_TO_EC2_REGIONS_API = {
    "us-east" : "us-east-1",
    "us-east-1" : "us-east-1",
    "us-west" : "us-west-1",
    "us-west-1" : "us-west-1",
    "us-west-2" : "us-west-2",
    "eu-ireland" : "eu-west-1",
    "eu-west-1" : "eu-west-1",
    "apac-sin" : "ap-southeast-1",
    "ap-southeast-1" : "ap-southeast-1",
    "ap-southeast-2" : "ap-southeast-2",
    "apac-syd" : "ap-southeast-2",
    "apac-tokyo" : "ap-northeast-1",
    "ap-northeast-1" : "ap-northeast-1",
    "sa-east-1" : "sa-east-1"
}

JSON_NAME_TO_RDS_REGIONS_API = {
    "us-east" : "us-east-1",
    "us-east-1" : "us-east-1",
    "us-west" : "us-west-1",
    "us-west-1" : "us-west-1",
    "us-west-2" : "us-west-2",
    "eu-ireland" : "eu-west-1",
    "eu-west-1" : "eu-west-1",
    "apac-sin" : "ap-southeast-1",
    "ap-southeast-1" : "ap-southeast-1",
    "ap-southeast-2" : "ap-southeast-2",
    "apac-syd" : "ap-southeast-2",
    "apac-tokyo" : "ap-northeast-1",
    "ap-northeast-1" : "ap-northeast-1",
    "sa-east-1" : "sa-east-1"
}

EC2_REGIONS_API_TO_JSON_NAME = {
    "us-east-1" : "us-east",
    "us-west-1" : "us-west",
    "us-west-2" : "us-west-2",
    "eu-west-1" : "eu-ireland",
    "ap-southeast-1" : "apac-sin",
    "ap-southeast-2" : "apac-syd",
    "ap-northeast-1" : "apac-tokyo",
    "sa-east-1" : "sa-east-1"   
}



INSTANCES_ON_DEMAND_URL = "http://aws.amazon.com/ec2/pricing/pricing-on-demand-instances.json"
INSTANCES_RESERVED_URL = [ 
    {   'url': "http://aws.amazon.com/ec2/pricing/ri-light-linux.json",
        'os': "linux",
        'util': "light" },
    {   'url': "http://aws.amazon.com/ec2/pricing/ri-light-mswin.json",
        'os': "mswin",
        'util': "mswin" },
    {   'url': "http://aws.amazon.com/ec2/pricing/ri-medium-linux.json",
        'os': "linux",
        'util': "medium" },
    {   'url': "http://aws.amazon.com/ec2/pricing/ri-medium-mswin.json",
        'os': "mswin",
        'util': "medium" },
    {   'url': "http://aws.amazon.com/ec2/pricing/ri-heavy-linux.json",
        'os': "linux",
        'util': "heavy" },
    {   'url': "http://aws.amazon.com/ec2/pricing/ri-heavy-mswin.json",
        'os': "mswin",
        'util': "heavy" }
]


RDS_ENGINE_TYPES = [
    "mysql",
    "oracle-se1",
    "oracle",
    "sqlserver-ex",
    "sqlserver-web",
    "sqlserver-se",
    "sqlserver"
]

RDS_INSTANCES_ON_DEMAND_URL = [
    {   'url': "http://aws.amazon.com/rds/pricing/mysql/pricing-standard-deployments.json",
        'engine': RDS_ENGINE_TYPES[0],
        'license': "gpl",
        'multiaz': false },
    {   'url': "http://aws.amazon.com/rds/pricing/mysql/pricing-multiAZ-deployments.json",
        'engine': RDS_ENGINE_TYPES[0],
        'license': "gpl",
        'multiaz': true },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-li-standard-deployments.json",
        'engine': RDS_ENGINE_TYPES[1],
        'license': "included",
        'multiaz': false },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-li-multiAZ-deployments.json",
        'engine': RDS_ENGINE_TYPES[1],
        'license': "included",
        'multiaz': true },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-byol-standard-deployments.json",
        'engine': RDS_ENGINE_TYPES[2],
        'license': "byol",
        'multiaz': false },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-byol-multiAZ-deployments.json",
        'engine': RDS_ENGINE_TYPES[2],
        'license': "byol",
        'multiaz': true },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-ex-ondemand.json",
        'engine': RDS_ENGINE_TYPES[3],
        'license': "included",
        'multiaz': false },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-web-ondemand.json",
        'engine': RDS_ENGINE_TYPES[4],
        'license': "included",
        'multiaz': false },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-se-ondemand.json",
        'engine': RDS_ENGINE_TYPES[5],
        'license': "included",
        'multiaz': false },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-byol-ondemand.json",
        'engine': RDS_ENGINE_TYPES[6],
        'license': "byol",
        'multiaz': false },
]

RDS_INSTANCES_RESERVED_URL = [
    {   'url': "http://aws.amazon.com/rds/pricing/mysql/pricing-light-utilization-reserved-instances.json",
        'engine': RDS_ENGINE_TYPES[0],
        'license': "gpl",
        'util': "light" },
    {   'url': "http://aws.amazon.com/rds/pricing/mysql/pricing-medium-utilization-reserved-instances.json",
        'engine': RDS_ENGINE_TYPES[0],
        'license': "gpl",
        'util': "medium" },
    {   'url': "http://aws.amazon.com/rds/pricing/mysql/pricing-heavy-utilization-reserved-instances.json",
        'engine': RDS_ENGINE_TYPES[0],
        'license': "gpl",
        'util': "heavy" },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-li-light-utilization-reserved-instances.json",
        'engine': RDS_ENGINE_TYPES[1],
        'license': "included",
        'util': "light" },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-li-medium-utilization-reserved-instances.json",
        'engine': RDS_ENGINE_TYPES[1],
        'license': "included",
        'util': "medium" },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-li-heavy-utilization-reserved-instances.json",
        'engine': RDS_ENGINE_TYPES[1],
        'license': "included",
        'util': "heavy" },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-byol-light-utilization-reserved-instances.json",
        'engine': RDS_ENGINE_TYPES[2],
        'license': "byol",
        'util': "light" },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-byol-medium-utilization-reserved-instances.json",
        'engine': RDS_ENGINE_TYPES[2],
        'license': "byol",
        'util': "medium" },
    {   'url': "http://aws.amazon.com/rds/pricing/oracle/pricing-byol-heavy-utilization-reserved-instances.json",
        'engine': RDS_ENGINE_TYPES[2],
        'license': "byol",
        'util': "heavy" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-ex-light-ri.json",
        'engine': RDS_ENGINE_TYPES[3],
        'license': "included",
        'util': "light" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-ex-medium-ri.json",
        'engine': RDS_ENGINE_TYPES[3],
        'license': "included",
        'util': "medium" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-ex-heavy-ri.json",
        'engine': RDS_ENGINE_TYPES[3],
        'license': "included",
        'util': "heavy" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-web-light-ri.json",
        'engine': RDS_ENGINE_TYPES[4],
        'license': "included",
        'util': "light" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-web-medium-ri.json",
        'engine': RDS_ENGINE_TYPES[4],
        'license': "included",
        'util': "medium" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-web-heavy-ri.json",
        'engine': RDS_ENGINE_TYPES[4],
        'license': "included",
        'util': "heavy" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-se-light-ri.json",
        'engine': RDS_ENGINE_TYPES[5],
        'license': "included",
        'util': "light" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-se-medium-ri.json",
        'engine': RDS_ENGINE_TYPES[5],
        'license': "included",
        'util': "medium" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-li-se-heavy-ri.json",
        'engine': RDS_ENGINE_TYPES[5],
        'license': "included",
        'util': "heavy" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-byol-light-ri.json",
        'license': "byol",
        'engine': RDS_ENGINE_TYPES[6],
        'util': "light" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-byol-medium-ri.json",
        'license': "byol",
        'engine': RDS_ENGINE_TYPES[6],
        'util': "medium" },
    {   'url': "http://aws.amazon.com/rds/pricing/sqlserver/sqlserver-byol-heavy-ri.json",
        'license': "byol",
        'engine': RDS_ENGINE_TYPES[6],
        'util': "heavy" },
]

DEFAULT_CURRENCY = "USD"

INSTANCE_TYPE_MAPPING = {
    "stdODI" : "m1",
    "uODI" : "t1",
    "hiMemODI" : "m2",
    "hiCPUODI" : "c1",
    "clusterComputeI" : "cc1",
    "clusterGPUI" : "cg1",
    "hiIoODI" : "hi1",
    "secgenstdODI" : "m3",
    "hiStoreODI": "hs1",
    "clusterHiMemODI": "cr1",
    // Reserved Instance Types
    "stdResI" : "m1",
    "uResI" : "t1",
    "hiMemResI" : "m2",
    "hiCPUResI" : "c1",
    "clusterCompResI" : "cc1",
    "clusterGPUResI" : "cg1",
    "hiIoResI" : "hi1",
    "secgenstdResI" : "m3",
    "hiStoreResI": "hs1",
    "clusterHiMemResI": "cr1"
}

INSTANCE_SIZE_MAPPING = {
    "u" : "micro",
    "sm" : "small",
    "med" : "medium",
    "lg" : "large",
    "xl" : "xlarge",
    "xxl" : "2xlarge",
    "xxxxl" : "4xlarge",
    "xxxxxxxxl" : "8xlarge"
}

RDS_MULTIAZ_TYPES = [
    "standard",
    "multiaz"
    ]

RDS_MULTIAZ_MAPPING = {
    "stdDeployRes" : "standard",
    "multiAZdeployRes" : "multiaz"
}

RDS_INSTANCE_TYPE_MAPPING = {
    "udbInstClass.uDBInst" : "db.t1.micro",
    "dbInstClass.uDBInst" : "db.t1.micro",
    "dbInstClass.smDBInst" : "db.m1.small",
    "dbInstClass.medDBInst" : "db.m1.medium",
    "dbInstClass.lgDBInst" : "db.m1.large",
    "dbInstClass.xlDBInst" : "db.m1.xlarge",
    "hiMemDBInstClass.xlDBInst" : "db.m2.xlarge",
    "hiMemDBInstClass.xxlDBInst" : "db.m2.2xlarge",
    "hiMemDBInstClass.xxxxDBInst" : "db.m2.4xlarge",
    // Multiaz instances
    "multiAZDBInstClass.uDBInst" : "db.t1.micro",
    "multiAZDBInstClass.smDBInst" : "db.m1.small",
    "multiAZDBInstClass.medDBInst" : "db.m1.medium",
    "multiAZDBInstClass.lgDBInst" : "db.m1.large",
    "multiAZDBInstClass.xlDBInst" : "db.m1.xlarge",
    "multiAZHiMemInstClass.xlDBInst" : "db.m2.xlarge",
    "multiAZHiMemInstClass.xxlDBInst" : "db.m2.2xlarge",
    "multiAZHiMemInstClass.xxxxDBInst" : "db.m2.4xlarge",
    // Reserved
    "stdDeployRes.u" : "db.t1.micro",
    "stdDeployRes.micro" : "db.t1.micro",
    "stdDeployRes.sm" : "db.m1.small",
    "stdDeployRes.med" : "db.m1.medium",
    "stdDeployRes.lg" : "db.m1.large",
    "stdDeployRes.xl" : "db.m1.xlarge",
    "stdDeployRes.xlHiMem" : "db.m2.xlarge",
    "stdDeployRes.xxlHiMem" : "db.m2.2xlarge",
    "stdDeployRes.xxxxlHiMem" : "db.m2.4xlarge",
    // Reserved multiaz
    "multiAZdeployRes.u" : "db.t1.micro",
    "multiAZdeployRes.sm" : "db.m1.small",
    "multiAZdeployRes.med" : "db.m1.medium",
    "multiAZdeployRes.lg" : "db.m1.large",
    "multiAZdeployRes.xl" : "db.m1.xlarge",
    "multiAZdeployRes.xlHiMem" : "db.m2.xlarge",
    "multiAZdeployRes.xxlHiMem" : "db.m2.2xlarge",
    "multiAZdeployRes.xxxxlHiMem" : "db.m2.4xlarge",
}

exports.show_prices = function(req, res) {
  var service = req.params.service;
  var timespan = req.params.timespan;
  var region = req.params.region;
  var os = req.params.os;
  if (region == undefined) {
    region = "us-east-1"
  }

  if (os == undefined) {
    os = "linux"
  }

}
 
exports.show_table = function(req, res) {
  var service = req.params.service;
  var timespan = req.params.timespan;
  var region = req.params.region;
  var os = req.params.os;
  if (region == undefined) {
    region = "us-east-1"
  }

  if (os == undefined) {
    os = "linux"
  }
  
  if (service == "ec2") {
    db.collection('ec2_instance_types')
    .find({ type: { $in: EC2_INSTANCE_TYPES }})
    .sort({ ram: 1, cores: 1, compute: 1, group: 1 })
    .toArray(function(err, data) {
        var prices = {}
        _(EC2_INSTANCE_TYPES).each(function(type) {
            prices[type] = { 'ondemand': 0, 'reserved': {'1': {'upfront': 0, 'hourly':0}, '3': {'upfront': 0, 'hourly':0}}, 'spot': 0 }
        });

        db.collection('ec2_cost_ondemand')
        .find({ type: { $in: EC2_INSTANCE_TYPES }, ts_lastgood: moment().utc().startOf('day').unix(), region: region, os: os}, {price: 1, type: 1})
        .toArray(function(err, prices_ondemand) {
            _(prices_ondemand).each(function(price_ondemand) {
                prices[price_ondemand.type]['ondemand'] = price_ondemand.price;
            })

            db.collection('ec2_cost_reserved')
            .find({ type: { $in: EC2_INSTANCE_TYPES }, ts_lastgood: moment().utc().startOf('day').unix(), region: region, os: os}, {price: 1, type: 1, yrs: 1, upfront: 1, hourly: 1})
            .toArray(function(err, prices_reserved) {
                _(prices_reserved).each(function(price_reserved) {
                    if (price_reserved.yrs == 1) {
                        prices[price_reserved.type]['reserved']['1']['upfront'] = price_reserved.upfront;
                        prices[price_reserved.type]['reserved']['1']['hourly'] = price_reserved.hourly;
                    } else if (price_reserved.yrs == 3) {
                        prices[price_reserved.type]['reserved']['3']['upfront'] = price_reserved.upfront;
                        prices[price_reserved.type]['reserved']['3']['hourly'] = price_reserved.hourly;
                    }
                })

                if (os == "linux") {
                    spot_os = "Linux/UNIX";
                } else if (os == "mswin") {
                    spot_os = "Windows";                    
                }

                var spot_azs = [];
                var azs = ['a','b','c','d','e','f','g','h'];
                for (var i in azs) {
                    spot_azs.push(region+azs[i]);
                }

                db.collection('ec2_cost_spot_hourly')
                .find({ type: { $in: EC2_INSTANCE_TYPES }, 
                        ts: { $gte: moment().utc().startOf('month').unix() }, 
                        zone: { $in: spot_azs }, 
                        desc: spot_os}, 
                      {price: 1, type: 1, zone: 1})
                .toArray(function(err, prices_spot) {

                    var prices_spot_agv = {}

                    _(prices_spot).each(function(price_spot) {
                        if (prices_spot_agv[price_spot.type] == undefined) {
                            prices_spot_agv[price_spot.type] = {'min': 999999, 'max': 0, 'avg': 0, 'count': 0}
                        }

                        if (price_spot.price > prices_spot_agv[price_spot.type]['max']) {
                            prices_spot_agv[price_spot.type]['max'] = price_spot.price
                        }

                        if (price_spot.price < prices_spot_agv[price_spot.type]['min']) {
                            prices_spot_agv[price_spot.type]['min'] = price_spot.price
                        }

                        prices_spot_agv[price_spot.type]['avg'] += price_spot.price
                        prices_spot_agv[price_spot.type]['count'] += 1
                    })
                    

                    _(prices_spot_agv).each(function(price_spot_agv, type) {
                        prices_spot_agv[type]['avg'] = prices_spot_agv[type]['avg']/prices_spot_agv[type]['count']
                        prices[type]['spot'] = prices_spot_agv[type]
                    })

                    res.send({'data':data, 'prices': prices});
                })
            })
        })

    });
  } else if (service == "rds") {

  }


}

exports.saveSpotHourly = function(req, res) {
    var counter = 0;
    var headers_sent = 0;
    var EC2_INSTANCE_TYPES = [
        "t1.micro",
        "m1.small",
        "m1.medium",
        "m1.large",
        "m1.xlarge",
        "m2.xlarge",
        "m2.2xlarge",
        "m2.4xlarge",
        "c1.medium",
        "c1.xlarge",
        "cc1.4xlarge",
        "cc2.8xlarge",
        "cg1.4xlarge",
        "m3.xlarge",
        "m3.2xlarge",
        "hi1.4xlarge",
        "hs1.8xlarge"
    ]

    function saveSpotHourlyRecord(set) {
      //23 zones
      //
      //up to 17 types
      //console.log('saveSpotHourlyRecord: '+counter)
      db.collection('ec2_cost_spot_hourly').insert(set ,
        { safe: true },
        function(err2, res2) {
          counter -= 1;
          if (counter == 0 && !headers_sent) {
            console.log("done")
            headers_sent = true;
            res.send({});
          }           
        }
      )
    }

    var daystart = moment().utc().startOf('day').unix();
    var now = moment().utc().endOf("hour").unix()+1;

    if (req.params.level == undefined) {
      res.send({});
    } else if (req.params.level == "hourly") {
      saveRawTodaySpotToHourly();
    } else if (req.params.level == "all") {
      saveRawCumulativeSpotToHourly();
    } else {
      res.send(['unknown level']);
    }

    function saveRawTodaySpotToHourly() {
      daystart = moment().utc().subtract('hours',4).startOf('day').unix();
      now = moment().utc().endOf("hour").unix()+1;

      counter = 0;
      var benchmark1 = moment().valueOf();
      var i = 0;
      //type: "c1.medium", "desc" : "Linux/UNIX", "zone": "us-east-1a",
      //ts: { $gte: daystart },
      db.collection('ec2_cost_spot_hourly')
      .find({ ts: { $gte: daystart } })
      .sort({ "ts": 1 })
      .toArray(function(err5, timeslots) {
        var benchmark2 = moment().valueOf();
        console.log("   ec2_cost_spot_hourly - start (day: "+daystart+") query runtime: "+ (benchmark2-benchmark1))
        console.log("found: "+_.size(timeslots)+" records")
        console.log("pass 1")

        var timeslots_onhour = {};
        _(timeslots).each(function(c, i) {
          delete c._id
          var hash = crypto.createHash('md5').update(c.type+c.zone+c.desc).digest("hex");
          if (timeslots_onhour[hash] == undefined) {
            timeslots_onhour[hash] = {}
          }
          if (timeslots_onhour[hash][c.ts] == undefined) {
            timeslots_onhour[hash][c.ts] = null
          }
          
          timeslots_onhour[hash][c.ts] = c
        })

        console.log("pass 2: "+daystart+"-"+now);

        var list_hours_today = []
        var last_known = 0
        var processed = 0;
        _(timeslots_onhour).each(function(timeslots2, hash) {
          for (i=daystart; i<=now; i = i+3600) {
            if (timeslots2[i] == undefined) {
              processed++;

              last_known.ts = i
              delete last_known._id

              counter += 1;
              saveSpotHourlyRecord(last_known)
            } else {
              last_known = timeslots2[i]
            }
          }
        })

        if (processed == 0 && !headers_sent) {
          headers_sent = true;
          res.send(['nothing to do']);          
        }
      })
    }

    function saveRawCumulativeSpotToHourly() {
      var benchmark1 = moment().valueOf();
      counter = 0;
      db.collection('ec2_cost_spot')
      .find({ ts: { $gte: daystart } })
      .sort({ "ts": 1 })
      .toArray(function(err5, timeslots) {
        var benchmark2 = moment().valueOf();
        console.log("   ec2_cost_spot - start (day: "+daystart+") query runtime: "+ (benchmark2-benchmark1))
        console.log("found: "+_.size(timeslots)+" records")
        console.log("pass 1")
        var timeslots_onhour = {};
        _(timeslots).each(function(c, i) {
          delete c._id
          c.price = parseFloat(c.price)
          c.ts = moment(c.ts*1000).utc().endOf("hour").unix()+1;
          var hash = crypto.createHash('md5').update(c.type+c.zone+c.desc).digest("hex");
          if (timeslots_onhour[c.ts] == undefined) {
            timeslots_onhour[c.ts] = {}
          }
          if (timeslots_onhour[c.ts][hash] == undefined) {
            timeslots_onhour[c.ts][hash] = null
          }
          
          timeslots_onhour[c.ts][hash] = c
        })

        console.log("pass 2")
        var first_known_hour = 0;
        _(timeslots_onhour).each(function(timeslots_h, ts) {
          _(timeslots_h).each(function(c, hash) {
            //console.log("on ts: "+ts+" hash:"+hash+" ")
            if (first_known_hour == 0)
              first_known_hour = c.ts
          })
        })


        console.log("pass 3 - first_known_hour:"+first_known_hour+" to "+now)
        var last_known_match = {};
        var i;
        //var data_to_insert = []
        for (i=first_known_hour; i<=now; i = i+3600) {
          //console.log("processing for ts:"+i+" ")

          if (_.isObject(timeslots_onhour[i])) {
            _(timeslots_onhour[i]).each(function(c, hash) {
              last_known_match[hash] = c;
            })

            //console.log("working with "+_.size(last_known_match)+" records")
            _(last_known_match).each(function(c, hash) {
              c.ts = i
              delete c._id
              counter += 1;
              saveSpotHourlyRecord(c)
            })
          } else {
            //console.log("working with "+_.size(last_known_match)+" records")
            _(last_known_match).each(function(c, hash) {
              c.ts = i
              delete c._id
              counter += 1;
              saveSpotHourlyRecord(c)
            })

          }
        }

        if (i == first_known_hour) {
          res.send(['nothing processed']);
        }
      })
    }
}

//run();

function DescribeInstanceStatus(id) {
    ec2.DescribeInstanceStatus({'InstanceId': id}, function (err, data) {
        console.log(JSON.stringify(data['Body']['DescribeInstanceStatusResponse']['instanceStatusSet']));
    });
}

function saveEC2RunningInstances() {

    ec2.DescribeInstances({}, function (err, data) {
        if (err) {
            console.log("error: "+err); // an error occurred
        } else {
            _.forOwn(data['Body']['DescribeInstancesResponse']['reservationSet']['item'], function(u, k) {
                console.log(JSON.stringify(u));
                var instanceId = u['instancesSet']['item']['instanceId'];

                DescribeInstanceStatus(instanceId);

            });
        }
    });

}

exports.saveRDSPriceOnDemand = function(req, res) {
    saveRDSPriceOnDemand(res);
}

function saveRDSPriceOnDemand(ajaxres) {
    db_helper.dbConnect(["rds_cost_ondemand"]);
    console.log("aws::rds::price::instance::ondemand - updating prices");
    var stats = 0,
        total = 0,
        start = new Date().getTime();        

    _(RDS_INSTANCES_ON_DEMAND_URL).each(function(rds_url) {
        request(rds_url.url, function (error, response, body) {
            if (!error && response.statusCode == 200 && !_.isEmpty(body)) {
                body = JSON.parse(body);
                if (body['vers'] != "0.01") {
                    ajaxres.err("unknown json version, check format");
                }

                _.forOwn(body['config']['regions'], function(val1, key1) {
                    _.forOwn(val1['types'], function(val2, key2) {
                        _.forOwn(val2['tiers'], function(val3, key3) {
                            total += 1;

                            db.collection('rds_cost_ondemand')
                            .update(
                                {
                                    "type" : RDS_INSTANCE_TYPE_MAPPING[val2.name + "." + val3.name],
                                    "price" : parseFloat(val3['prices']['USD']),
                                    "region" : JSON_NAME_TO_RDS_REGIONS_API[val1.region],
                                    "multiaz" : rds_url.multiaz,
                                    "license" : rds_url.license,
                                    "engine" : rds_url.engine, 
                                },
                                { $set: { 'ts_lastgood': moment().utc().sod().unix() }},
                                { upsert: true, safe: false },
                                function(err2, res2) {                                    
                                    stats += 1;
                                    total -= 1;

                                    if (total == 0) {
                                        ajaxres.send({'total': stats, 'elapsed': new Date().getTime() - start});
                                    }
                                }
                            );

                        });
                    });                 
                });
            }
        })
    })

}

exports.saveRDSPriceReserved = function(req, res) {
    saveRDSPriceReserved(res);
}

function saveRDSPriceReserved(ajaxres) {
    db_helper.dbConnect(["rds_cost_reserved"]);

    console.log("aws::rds::price::instance::reserved - updating prices");
    var stats = 0,
        total = 0,
        start = new Date().getTime();

    _.forOwn(RDS_INSTANCES_RESERVED_URL, function(u, k) {
        request(u['url'], function (error, response, body) {
            if (!error && response.statusCode == 200 && !_.isEmpty(body)) {
                body = JSON.parse(body);
                if (body['vers'] != "0.01") {
                    ajaxres.err("warning: unknown json version, check format");
                }

                _.forOwn(body['config']['regions'], function(val1, key1) {
                    //region = val1.region
                    _.forOwn(val1['instanceTypes'], function(val2, key2) {
                        //type = val2.type
                        _.forOwn(val2['tiers'], function(val3, key3) {
                            //size = val3.size

                            
                            var hourly = null,
                                upfront = null,
                                yrs = 1;

                            var counterPriceGroup = 0;
                            _.forOwn(val3['valueColumns'], function(val4, key4) {
                                counterPriceGroup += 1;

                                if (val4['rate'] !== undefined &&
                                    val4['rate'] == "perhr") {
                                    hourly = parseFloat(val4['prices']['USD'].replace(',',''));
                                } else {
                                    upfront = parseFloat(val4['prices']['USD'].replace(',',''));
                                }

                                if (val4['name'] == "yrTerm3Hourly" ||
                                    val4['name'] == "yrTerm3") {
                                    yrs = 3
                                } else if (val4['name'] == "yrTerm1Hourly" ||
                                    val4['name'] == "yrTerm1") {
                                    yrs = 1
                                }

                                if (counterPriceGroup == 2 && !isNaN(hourly) && !isNaN(upfront)) {
                                    total += 1;
                                    var multiaz = false;
                                    if (RDS_MULTIAZ_MAPPING[val2.type] != "standard") {
                                        multiaz = true;
                                    }

                                    db.collection('rds_cost_reserved').update(
                                        {
                                            'type': RDS_INSTANCE_TYPE_MAPPING[val2['type']+"."+val3['size']],
                                            'region': JSON_NAME_TO_RDS_REGIONS_API[val1['region']],
                                            'multiaz': multiaz,
                                            'util': u.util,
                                            'hourly': hourly,
                                            'upfront': upfront,
                                            'yrs': yrs,
                                            "license" : u.license,
                                            "engine" : u.engine, 
                                        },
                                        { $set: { 'ts_lastgood': moment().utc().sod().unix() }},
                                        { upsert: true, safe: false },
                                        function(err2, res2) {                                            
                                            stats += 1;
                                            total -= 1;

                                            if (total == 0) {
                                                ajaxres.send({'total': stats, 'elapsed': new Date().getTime() - start});
                                            }
                                        }
                                    )

                                    counterPriceGroup = 0;
                                }
                            });
                        });
                    });
                });
            }
        });  
    });
}

// save and update the latest prices
function saveEC2Prices() {
    saveEC2PriceOnDemand();
    saveEC2PriceReserved();
    saveEC2PriceSpotDaysBack(0, 90);
}

exports.saveEC2PriceOnDemand = function(req, res) {
    saveEC2PriceOnDemand(res);
}

exports.saveEC2PriceReserved = function(req, res) {
    saveEC2PriceReserved(res);
}

exports.saveEC2PriceSpotDaysBack = function(req, res) {
    saveEC2PriceSpotDaysBack(res, 0, 1);
}

function saveEC2PriceReserved(ajaxres) {
    db_helper.dbConnect(["ec2_cost_reserved"]);

    console.log("aws::ec2::price::instance::reserved - updating prices");
    var stats = 0,
        total = 0,
        start = new Date().getTime();

    _.forOwn(INSTANCES_RESERVED_URL, function(u, k) {
        request(u['url'], function (error, response, body) {
            if (!error && response.statusCode == 200 && !_.isEmpty(body)) {
                body = JSON.parse(body);
                if (body['vers'] != "0.01") {
                    ajaxres.err("warning: unknown json version, check format");
                }

                _.forOwn(body['config']['regions'], function(val1, key1) {
                    _.forOwn(val1['instanceTypes'], function(val2, key2) {
                        _.forOwn(val2['sizes'], function(val3, key3) {
                            var hourly = null,
                                upfront = null,
                                yrs = 1;

                            var counterPriceGroup = 0;
                            _.forOwn(val3['valueColumns'], function(val4, key4) {

                                counterPriceGroup += 1;

                                if (val4['rate'] !== undefined &&
                                    val4['rate'] == "perhr") {
                                    hourly = parseFloat(val4['prices']['USD'].replace(',',''));
                                } else {
                                    upfront = parseFloat(val4['prices']['USD'].replace(',',''));
                                }

                                if (val4['name'] == "yrTerm3Hourly" ||
                                    val4['name'] == "yrTerm3") {
                                    yrs = 3
                                } else if (val4['name'] == "yrTerm1Hourly" ||
                                    val4['name'] == "yrTerm1") {
                                    yrs = 1
                                }

                                if (counterPriceGroup == 2 && !isNaN(hourly) && !isNaN(upfront)) {
                                    total += 1;

                                    db.collection('ec2_cost_reserved', function(err, collection) {
                                        collection.update(
                                            {
                                                'type': INSTANCE_TYPE_MAPPING[val2['type']]+"."+INSTANCE_SIZE_MAPPING[val3['size']],
                                                'region': JSON_NAME_TO_EC2_REGIONS_API[val1['region']],
                                                'os': u['os'],
                                                'util': u['util'],
                                                'hourly': hourly,
                                                'upfront': upfront,
                                                'yrs': yrs
                                            },
                                            { $set: { 'ts_lastgood': moment().utc().sod().unix() }},
                                            { upsert: true, safe: false },
                                            function(err2, res2) {                                                
                                                stats += 1;
                                                total -= 1;

                                                if (total == 0) {
                                                    ajaxres.send({'total': stats, 'elapsed': new Date().getTime() - start});
                                                }
                                            }
                                        )

                                    });

                                    counterPriceGroup = 0;
                                }
                            });
                        });
                    });
                });
            }
        });  
    });
}

// gets AWS EC2 on-demand instance prices and updates good-through dates or inserts new prices as necessary
function saveEC2PriceOnDemand(ajaxres) {
    db_helper.dbConnect(["ec2_cost_ondemand"]);
    console.log("aws::ec2::price::instance::ondemand - updating prices");
    var stats = 0,
        total = 0,
        start = new Date().getTime();        

    request(INSTANCES_ON_DEMAND_URL, function (error, response, body) {
        if (!error && response.statusCode == 200 && !_.isEmpty(body)) {
            body = JSON.parse(body);
            if (body['vers'] != "0.01") {
                ajaxres.err("unknown json version, check format");
            }

            // loop through all results and convert from AWS interal API keys to publicly accessible
            _.forOwn(body['config']['regions'], function(val1, key1) {
                _.forOwn(val1['instanceTypes'], function(val2, key2) {
                    _.forOwn(val2['sizes'], function(val3, key3) {
                        _.forOwn(val3['valueColumns'], function(val4, key4) {
                            total += 1;

                            db.collection('ec2_cost_ondemand', function(err, collection) {                                
                                collection.update(
                                    {
                                        'type': INSTANCE_TYPE_MAPPING[val2['type']]+"."+INSTANCE_SIZE_MAPPING[val3['size']],
                                        'price': parseFloat(val4['prices']['USD']),
                                        'region': JSON_NAME_TO_EC2_REGIONS_API[val1['region']],
                                        'os': val4['name'],
                                    },
                                    { $set: { 'ts_lastgood': moment().utc().sod().unix() }},
                                    { upsert: true, safe: false },
                                    function(err2, res2) {                                        
                                        stats += 1;
                                        total -= 1;

                                        if (total == 0) {
                                            ajaxres.send({'total': stats, 'elapsed': new Date().getTime() - start});
                                        }
                                    }
                                )
                            });
                        });
                    });
                });
            });
        }
    })

}

// saves spot history pricing a numnber of days back
function saveEC2PriceSpotDaysBack(ajaxres, floor, ceiling) {
    var sending = 0;
    var ec2 = {};
    //var regions = ["us-east-1", "us-west-1", "us-west-2", "eu-west-1"];
    var regions = EC2_REGIONS;

    _(regions).each(function(region_name,b) {
        ec2[region_name] = new Ec2({
            'accessKeyId'     : process.env.accessKeyId,
            'secretAccessKey' : process.env.secretAccessKey,
            'region'          : region_name
        })
    });

    db_helper.dbConnect(["ec2_cost_spot"]);
    console.log("aws::ec2::price::instance::spot - updating prices");

    var total = 0,
        inserts = 0,
        start = new Date().getTime();

    if (floor == null) {
        floor = 0;
    }

    if (ceiling == null) {
        ceiling = 1;
    // Amazon only provides 90 days of pricing history
    } else if (ceiling > 90) {
        ceiling = 90;
    }

    // pricing history can only be searched one day at time 
    for (var i = floor; i < ceiling; i++) {
        var t = moment().utc().subtract('days',i).startOf('day');
        var spotSearchParam = 
            // make sure dates are in AWS required date format
            {   'StartTime'             : t.format("YYYY-MM-DD[T]HH:mm:ss[.000Z]"), 
                'EndTime'               : t.add('days', 1).format("YYYY-MM-DD[T]HH:mm:ss[.000Z]"), 
                //'InstanceTypes'         : ['m1.xlarge'], 
                //'ProductDescriptions'   : ['Linux/UNIX'],
                //'AvailabilityZone'      : ['us-east-1a']
            };

        // searches for spot history and inserts into the database
        console.log("aws::ec2::price::instance::spot \t\t- updating prices");

        _(ec2).each(function(reg,region_name) {
            total += 1;            
            ec2[region_name].DescribeSpotPriceHistory(spotSearchParam, function (err, data) {
                if (err) {
                    console.log("error: "+JSON.stringify(err));
                } else {
                    if (_.isArray(data['Body']['DescribeSpotPriceHistoryResponse']['spotPriceHistorySet']['item'])) {
                        //console.log(data['Body']['DescribeSpotPriceHistoryResponse']['spotPriceHistorySet']['item']);

                        _.forOwn(data['Body']['DescribeSpotPriceHistoryResponse']['spotPriceHistorySet']['item'], function(val, key) {
                            total += 1;

                            var spotPricing = {
                                'type': val['instanceType'],
                                'price': val['spotPrice'],
                                'zone': val['availabilityZone'],
                                'desc': val['productDescription'],
                                // timestamp in UTC
                                'ts': moment(val['timestamp']).utc().unix(),
                            }

                            db.collection('ec2_cost_spot').insert(spotPricing, {safe:true}, function(err, result) {
                                total -= 1;

                                if (!err) {                                        
                                    inserts += 1;
                                }
                                
                                if (total == _.size(regions)) {
                                    sending += 1;
                                    if (sending == 1) {
                                        ajaxres.send({'total': inserts, 'elapsed': new Date().getTime() - start});
                                    }
                                }
                            });
                        });
                    } else {
                        console.log("no SpotPriceHistory for "+spotSearchParam);
                    }
                }
            });
        });
    }
}
