var util = require('util'),
    mongo = require('mongodb'),
    moment = require('moment'),
    _ = require('lodash'),
    request = require('request'),
    db_helper = require('../../helpers/db'),
    r_users_instance = require('../auth/users'),
    crypto = require('crypto');

if (process.env.isutc) {
  moment_adj = 0
} else {
  moment_adj = 4
}

exports.getGraphs = function(req, res) {
  var session_obj = r_users_instance.getSessionData(req, res);
  tid = session_obj['tid'];
  req.params.tid = parseInt(tid)
  var list = []
  var service = req.params.service;
  var level = req.params.level;
  var limit = 5;

  if (level == "summary") {
    db.collection('aws_resources_ls')
    .find({tenantId: tid, service: service}, {count: 1})
    .sort({ts_ls: -1})
    .limit(limit)
    .toArray(function(err2, resources_count) {
       _(resources_count).each(function(c, i) {
        list.push(c.count)
       })

       for (var i = _.size(list); i<limit; i++) {
        list.push(0)        
       }

       list.reverse()
       res.send(list);
    });
  }

}

exports.getCosts = function(req, res) {
  var session_obj = r_users_instance.getSessionData(req, res);
  tid = session_obj['tid'];
  req.params.tid = parseInt(tid)

  var year_start = moment().utc().subtract('hours', moment_adj).startOf('year').unix()
  var month_start = moment().utc().subtract('hours', moment_adj).startOf('month').unix()
  var day_start = moment().utc().subtract('hours', moment_adj).startOf('day').unix()
  var now = moment().utc().subtract('hours', moment_adj).startOf('hour').unix()
  var days_offset = 0;

  if (req.params.service != undefined) {
    var service = req.params.service
  } else {
    var service = "ec2_rds"
  }

  if (req.params.frequency != undefined) {
    var frequency = req.params.frequency
  } else {
    var frequency = "days"
  }

  if (req.params.count != undefined) {
    var count = req.params.count
  } else {
    var count = 5
  }

  if (frequency == "days") {
    days_offset = count
  } else {
    now = moment().utc().subtract('hours', moment_adj+count).startOf('hour').unix()
  }

  if (days_offset != 0) {
    month_start = now - days_offset*3600*24;
  }


  var ec2_cost_collection = "ec2_cost_daily"
    , rds_cost_collection = "rds_cost_daily"
    , ec2_cost_collection_filter = { tid: tid, ts: { $gte: month_start } }
    , rds_cost_collection_filter = { tid: tid, ts: { $gte: month_start } };

  if (service == "ec2") {
    if (frequency == "hours") {
      ec2_cost_collection = "ec2_instance_costs_hourly";
      ec2_cost_collection_filter = { tid: tid, start: { $gte: now } };
    }
  } else if (service == "rds") {
    if (frequency == "hours") {
      rds_cost_collection = "rds_instance_costs_hourly";
      rds_cost_collection_filter = { tid: tid, start: { $gte: now } };
    }
  } else if (service == "ec2_rds") {
    if (frequency == "hours") {
      ec2_cost_collection = "ec2_instance_costs_hourly";
      ec2_cost_collection_filter = { tid: tid, start: { $gte: now } };
      rds_cost_collection = "rds_instance_costs_hourly";
      rds_cost_collection_filter = { tid: tid, start: { $gte: now } };
    }
  }

  var skip_daily_prices = 2;

  var response =  
  { 'cost': {
      'day': parseFloat(0),
      'dayp': parseFloat(0),
      'daily_det': { 'ec2': {}, 'rds': {}, 'total': {} },
      'month': parseFloat(0),
      'monthp': parseFloat(0),
      'runningtotal': parseFloat(0)
    },
    'ts_ls_h': moment().utc().subtract('hours', moment_adj).format('MM/DD/YY [@] h:mmA')
  };

  benchmark1 = moment().valueOf();
  db.collection(ec2_cost_collection)
  .find(ec2_cost_collection_filter)
  .sort({ ts: 1 })
  .toArray(function(err2, prices) {
    benchmark2 = moment().valueOf();
    console.log(ec2_cost_collection+" rt: "+ (benchmark2-benchmark1))
    _(prices).each(function(price, ts) {
      response['cost']['month'] += parseFloat(price['total'])
      response['cost']['runningtotal'] += parseFloat(price['total'])

      if (frequency == "days")
        var timestamp = price.ts;
      else if (frequency == "hours")
        var timestamp = price.start;

      if (response['cost']['daily_det']['ec2'][timestamp] == undefined) {
        response['cost']['daily_det']['ec2'][timestamp] = 0;
      }
      
      response['cost']['daily_det']['ec2'][timestamp] += parseFloat(price.total)

      response['cost']['daily_det']['total'][timestamp] = parseFloat(response['cost']['daily_det']['ec2'][timestamp]) +
                                                          parseFloat(response['cost']['daily_det']['rds'][timestamp]);
      
    })

    if (frequency == "days") {
      if (response.cost.daily_det['ec2'][day_start] == undefined) {
        response.cost.daily_det['ec2'][day_start] = 0;
      }
      response['cost']['day'] += response['cost']['daily_det']['ec2'][day_start]
    } else if (frequency == "hours") {
      if (response.cost.daily_det['ec2'][now] == undefined) {
        response.cost.daily_det['ec2'][now] = 0;
      }
      response['cost']['day'] += response['cost']['daily_det']['ec2'][now]
    }

    // really? shitty code ahead
    db.collection(rds_cost_collection)
    .find(rds_cost_collection_filter)
    .sort({ ts: 1 })
    .toArray(function(err2, prices) {
      benchmark2 = moment().valueOf();
      console.log(rds_cost_collection+" rt: "+ (benchmark2-benchmark1))

      _(prices).each(function(price, ts) {
        response['cost']['month'] += parseFloat(price['total'])
        response['cost']['runningtotal'] += parseFloat(price['total'])

        if (frequency == "days")
          var timestamp = price.ts;
        else if (frequency == "hours")
          var timestamp = price.start;

        if (response['cost']['daily_det']['rds'][timestamp] == undefined) {
          response['cost']['daily_det']['rds'][timestamp] = 0;
        } else {
          response['cost']['daily_det']['rds'][timestamp] += parseFloat(price.total)
        }

        response['cost']['daily_det']['total'][timestamp] = parseFloat(response['cost']['daily_det']['ec2'][timestamp]) +
                                                            parseFloat(response['cost']['daily_det']['rds'][timestamp]);

      })

      if (frequency == "days") {
        if (response.cost.daily_det['rds'][day_start] == undefined) {
          response.cost.daily_det['rds'][day_start] = 0;
        }
        response['cost']['day'] += response['cost']['daily_det']['rds'][day_start]
      } else if (frequency == "hours") {
        if (response.cost.daily_det['rds'][now] == undefined) {
          response.cost.daily_det['rds'][now] = 0;
        }
        response['cost']['day'] += response['cost']['daily_det']['rds'][now]
      }

      response['cost']['dayp'] += (parseFloat(response['cost']['day']) / (moment().utc().subtract('hours', moment_adj).unix() - moment().utc().subtract('hours', moment_adj).sod().unix())) * 3600 * 24
      response['cost']['monthp'] += (response['cost']['month'] / (now - month_start)) * 3600 * 24 * moment().daysInMonth()

      res.send(response)
    });

  });  
}

exports.getActivity = function(req, res) {
  var session_obj = r_users_instance.getSessionData(req, res);
  tid = session_obj['tid'];
  req.params.tid = parseInt(tid)
  var limit = req.params.limit;
  if (limit == "all") {
    limit = 9999;
  } else {
    limit = parseInt(limit);
  }

  var activity = { 'ec2': [], 'rds': [] };

  var benchmark1 = moment().valueOf();
  db.collection('ec2_instances_states')
  .find({ tenantId: tid }, 
        { "id": 1, "launched": 1, "updated": 1, "lifecycle": 1, "state_msg": 1, "state": 1, "type": 1, "az": 1 })
  .sort({ ts_ls: -1, launched: -1, updated: -1 })
  .limit(limit)
  .toArray(function(err2, activities) {
    var benchmark2 = moment().valueOf();
    console.log("ec2_instances_states query runtime: "+ (benchmark2-benchmark1))

    _(activities).each(function(result, rid) {
      result.launched_h = moment(result.launched*1000).utc().subtract('hours',4).format('MM/DD/YY [@] h:mmA')
      if (result.updated != null)
        result.updated_h = moment(result.updated*1000).utc().subtract('hours',4).format('MM/DD/YY [@] h:mmA')
      else
        result.updated_h = null;

      if (result.state == 16) {
        result.state_msg = "running";
      } else if (result.state == 32) {
        result.state_msg = "shutting-down";
      } else if (result.state == 48) {
        result.state_msg = "terminated";
      } else if (result.state == 64) {
        result.state_msg = "stopping";
      } else if (result.state == 80) {
        result.state_msg = "stopped";
      } else {
        result.state_msg = "unknown";                    
      }

      if (result['updated'] == null) {
        ending = moment().utc().unix();
      } else {
        ending = result['updated'];
      }
      delete result._id;

      activity.ec2.push(result);
    })

    benchmark1 = moment().valueOf();
    db.collection('rds_instances_states')
    .find({ tenantId: tid }, 
          { "id": 1, "launched": 1, "updated": 1, "state": 1 })
    .sort({ ts_ls: -1, launched: -1, updated: -1 })
    .limit(limit)
    .toArray(function(err2, activities) {
      benchmark2 = moment().valueOf();
      console.log("rds_instances_states query runtime: "+ (benchmark2-benchmark1))

      _(activities).each(function(result, rid) {
        result.launched_h = moment(result.launched*1000).utc().subtract('hours',4).format('MM/DD/YY [@] h:mmA')
        if (result.updated != null)
          result.updated_h = moment(result.updated*1000).utc().subtract('hours',4).format('MM/DD/YY [@] h:mmA')
        else
          result.updated_h = null;

        result.state_msg = result.state;
        result.state = null;
        
        if (result['updated'] == null) {
          ending = moment().utc().unix();
        } else {
          ending = result['updated'];
        }
        result['lifecycle'] = "ondemand";
        delete result._id;

        activity.rds.push(result);
      })

      res.send(activity);
    });
  });
}

exports.getDashboard = function(req, res) {
  var session_obj = r_users_instance.getSessionData(req, res);
  tid = session_obj['tid'];
  req.params.tid = parseInt(tid)
  req.params.compute = false
  var sent_headers = false;

  getSummary(req, res)

  function getSummary(req, res) {
    var max_instances_history = 8,
        costs = {},
        activity = [],
        response =  
    { 'summary': 
      { 
        'ec2': null,
        'route53': null,
        'mapreduce': null,
        'rds': null,
        'dynamodb': null,
        'redshift': null,
        's3': null,
        'glacier': null,
        'cloudfront': null,
      },
      'activity' : null,
      'ts_ls_h': moment().utc().subtract('hours',4).format('MM/DD/YY [@] h:mmA')
    };

    var ids = { 'ec2': [], 'rds': [] }

    var benchmark1 = moment().valueOf();
    db.collection('aws_resources_ls')
    .find(  { tenantId: tid, service: { $in: [ "ec2", "rds" ] }}, 
            { ids: 1, service: 1 } )
    .sort({ ts_ls: -1 })
    .limit(2)  
    .toArray(function(err2, results2) {
      _(results2).each(function(r, i) {
        ids[r['service']] = r['ids']
        response['summary'][r['service']] = _.size(r['ids'])
      });

      db.collection('ec2_instances_states')
      .find({ tenantId: tid }, 
            { "id": 1, "launched": 1, "updated": 1, "lifecycle": 1, "state_msg": 1, "state": 1, "type": 1, "az": 1 })
      .sort({ ts_ls: -1, launched: -1, updated: -1 })
      .limit(max_instances_history)
      .toArray(function(err2, activities) {
        _(activities).each(function(result, rid) {
          result.launched_h = moment(result.launched*1000).utc().subtract('hours',4).format('MM/DD/YY [@] h:mmA')
          if (result.updated != null)
            result.updated_h = moment(result.updated*1000).utc().subtract('hours',4).format('MM/DD/YY [@] h:mmA')
          else
            result.updated_h = null;

          if (result.state == 16) {
            result.state_msg = "running";
          } else if (result.state == 32) {
            result.state_msg = "shutting-down";
          } else if (result.state == 48) {
            result.state_msg = "terminated";
          } else if (result.state == 64) {
            result.state_msg = "stopping";
          } else if (result.state == 80) {
            result.state_msg = "stopped";
          } else {
            result.state_msg = "launching";                    
          }

          if (result['updated'] == null) {
            ending = moment().unix();
          } else {
            ending = result['updated'];
          }

          activity.push(result);
        })
        var benchmark2 = moment().valueOf();
        console.log("ec2_instances_states query runtime: "+ (benchmark2-benchmark1))

        response['activity'] = activity

        if (!sent_headers) {
          sent_headers = true
          res.setHeader('Content-Type', 'application/json');
          res.send(response);
        }
      });
    });
  }
}
