var util = require('util'),
    mongo = require('mongodb'),
    moment = require('moment'),
    _ = require('lodash'),
    request = require('request'),
    db_helper = require('../../helpers/db'),
    db_email = require('../../helpers/email'),
    r_users_instance = require('../auth/users'),
    crypto = require('crypto');

if (process.env.isutc) {
  moment_adj = 0
} else {
  moment_adj = 4
}

exports.saveAggregatedCosts = function(req, res) {
  var skip_daily_prices = 2;

  db.collection('tenants')
  .find({ }, {id: 1})
  .toArray(function(err, results) {
    if (err) {
      return -1;
    }

    _(results).each(function(t, i) {
      var tid = parseInt(t['id']);
      var daily_det = {};
      daily_det[tid] = { 'ec2': {} , 'rds': {} }

      var year_start = moment().utc().subtract('hours', moment_adj).startOf('year').unix()
      var month_start = moment().utc().subtract('hours', moment_adj).startOf('month').unix()
      var day_start = moment().utc().subtract('hours', moment_adj).startOf('day').unix()
      var now = moment().utc().subtract('hours', moment_adj).startOf('day').unix()

      benchmark1 = moment().valueOf();
      db.collection('ec2_instance_costs_hourly')
      .find({ tid: tid, start: { $gte: month_start } }, { total: 1, start: 1, end: 1})
      .sort({ start: 1 })
      .toArray(function(err2, prices) {
        benchmark2 = moment().valueOf();
        console.log("ec2_instance_costs_hourly rt: "+ (benchmark2-benchmark1))

        var ec2_price_total = 0;
        _(prices).each(function(price, rid) {
          var dd = moment((price['end']+1-3600)*1000).utc().startOf('day').unix()
          if (daily_det[tid]['ec2'][dd] == undefined) {
            daily_det[tid]['ec2'][dd] = 0;
          }
          daily_det[tid]['ec2'][dd] += parseFloat(price['total']);
          //console.log("adding "+ parseFloat(price['total']) + " to day "+dd)

          ec2_price_total += parseFloat(price['total']);
        })

        if (daily_det[tid]['ec2'][day_start] == undefined) {
          daily_det[tid]['ec2'][day_start] = 0;
        }

        // really? shitty code ahead
        db.collection('rds_instance_costs_hourly')
        .find({ tid: tid, start: { $gte: month_start } }, { total: 1, start: 1, end: 1})
        .sort({ start: 1 })
        .toArray(function(err2, prices) {
          benchmark2 = moment().valueOf();
          console.log("rds_instance_costs_hourly rt: "+ (benchmark2-benchmark1))

          var rds_price_total = 0;
          _(prices).each(function(price, rid) {
            var dd = moment((price['end']+1-3600)*1000).utc().startOf('day').unix()
            if (daily_det[tid]['rds'][dd] == undefined) {
              daily_det[tid]['rds'][dd] = 0;
            }
            daily_det[tid]['rds'][dd] += parseFloat(price['total']);            
            rds_price_total += parseFloat(price['total']);
          })

          if (daily_det[tid]['rds'][day_start] == undefined) {
            daily_det[tid]['rds'][day_start] = 0;
          }

          if (daily_det[tid]['rds'][day_start] == undefined) {
            daily_det[tid]['rds'][day_start] = 0;
          }

          _(daily_det).each(function(set, tenantId) {
            _(set).each(function(groups, service) {
              _(groups).each(function(price, day) {
                var daily_price = { 
                  tid: parseInt(tenantId),
                  service: service,
                  ts: parseInt(day)
                }

                if (service == "ec2") {
                  db.collection('ec2_cost_daily')
                  .update( daily_price ,
                    { $set: { total: parseFloat(price) } },
                    { upsert: true, safe: false },
                    function(err2, res2) { }
                  );
                } else if (service == "rds") {
                  db.collection('rds_cost_daily')
                  .update( daily_price ,
                    { $set: { total: parseFloat(price) } },
                    { upsert: true, safe: false },
                    function(err2, res2) { }
                  );
                }
              })
            })
          })

          res.send(daily_det)
        });

      }); 
    });
  }); 
}

exports.sendAggregatedCostsEmail = function(req, res) {
  var skip_daily_prices = 2;

  db.collection('tenants')
  .find({}, {id: 1})
  .toArray(function(err, results) {
    if (err) {
      return -1;
    }

    _(results).each(function(t, i) {
      var tid = parseInt(t['id']);
      var daily_det = {};
      daily_det[tid] = { 'ec2': {} , 'rds': {} }

      var year_start = moment().utc().subtract('hours', moment_adj).startOf('year').unix()
      var month_start = moment().utc().subtract('hours', moment_adj).startOf('month').unix()
      var day_start = moment().utc().subtract('hours', moment_adj).startOf('day').unix()
      var now = moment().utc().subtract('hours', moment_adj).startOf('day').unix()

      benchmark1 = moment().valueOf();
      db.collection('ec2_instance_costs_hourly')
      .find({ tid: tid, start: { $gte: month_start } }, { total: 1, start: 1, end: 1})
      .sort({ start: 1 })
      .toArray(function(err2, prices) {
        benchmark2 = moment().valueOf();
        console.log("ec2_instance_costs_hourly rt: "+ (benchmark2-benchmark1))

        var ec2_price_total = 0;
        _(prices).each(function(price, rid) {
          var dd = moment((price['end']+1-3600)*1000).utc().startOf('day').unix()
          if (daily_det[tid]['ec2'][dd] == undefined) {
            daily_det[tid]['ec2'][dd] = 0;
          }
          daily_det[tid]['ec2'][dd] += parseFloat(price['total']);
          ec2_price_total += parseFloat(price['total']);
        })

        if (daily_det[tid]['ec2'][day_start] == undefined) {
          daily_det[tid]['ec2'][day_start] = 0;
        }

        // really? shitty code ahead
        db.collection('rds_instance_costs_hourly')
        .find({ tid: tid, start: { $gte: month_start } }, { total: 1, start: 1, end: 1})
        .sort({ start: 1 })
        .toArray(function(err2, prices) {
          benchmark2 = moment().valueOf();
          console.log("rds_instance_costs_hourly rt: "+ (benchmark2-benchmark1))

          var rds_price_total = 0;
          _(prices).each(function(price, rid) {
            var dd = moment((price['end']+1-3600)*1000).utc().startOf('day').unix()
            if (daily_det[tid]['rds'][dd] == undefined) {
              daily_det[tid]['rds'][dd] = 0;
            }
            daily_det[tid]['rds'][dd] += parseFloat(price['total']);            
            rds_price_total += parseFloat(price['total']);
          })

          if (daily_det[tid]['rds'][day_start] == undefined) {
            daily_det[tid]['rds'][day_start] = 0;
          }          

          req.params.to = "andrei.oprisan@mac.com"
          req.params.subject = "AWS cost report"
          req.params.text = "Hello,<br><br>Here's your daily AWS cost report."
          req.params.text += "<br><br>EC2"

          if (daily_det[tid]['ec2'][day_start-86400] != undefined) {
            var ey = daily_det[tid]['ec2'][day_start-86400]
            req.params.text += "<br>Yesterday: $"+ey.toFixed(2)
          }
          req.params.text += "<br>Month to date: $"+ec2_price_total.toFixed(2)
          var py = ((ec2_price_total / (((day_start-month_start)/86400) + 1)) * moment().daysInMonth())
          req.params.text += "<br>Month projected: $"+py.toFixed(2)

          req.params.text += "<br><br>RDS"
          if (daily_det[tid]['rds'][day_start-86400] != undefined) {
            var ry = daily_det[tid]['rds'][day_start-86400];
            req.params.text += "<br>Yesterday: $"+ry.toFixed(2)
          }
          req.params.text += "<br>Month to date: $"+rds_price_total.toFixed(2)
          var qy = ((rds_price_total / (((day_start-month_start)/86400) + 1)) * moment().daysInMonth())
          req.params.text += "<br>Month projected: $"+qy.toFixed(2)

          var total_proj = py + qy
          req.params.text += "<br><br>Total projected: $"+total_proj.toFixed(2)

          req.params.text += "<br><br>Thanks,"
          req.params.text += "<br>stackignite robot<br>"
          req.params.html = req.params.text
          db_email.sendEmail(req, res); 

          res.send(daily_det)
        });

      }); 
    });
  }); 
}

exports.savePricingHistory = function(req, res) {
    var tenants = [],
        ids = {},
        costs = {},
        costs_rds = {},
        ops_counter = 0,
        total_instances_count = 0,
        main_benchmark1 = 0,
        benchmark1 = 0,
        response = { costs: {} },
        sent_headers = false;

    db_helper.dbConnect([ "aws_resources_ls", "tenants",   
                          "ec2_instances", "ec2_instances_states",
                          "rds_instances", "rds_instances_states"]);
    
    main_benchmark1 = moment().valueOf();
    benchmark1 = moment().valueOf();
    
    //todo: remove id:2
    db.collection('tenants')
    .find({}, {id: 1})
    .toArray(function(err, results) {
      if (err) {
        return -1;
      }

      _(results).each(function(t, i) {
        var tid = parseInt(t['id']);
        tenants.push(tid)
        ids[tid] = { 'ec2': [], 'rds': [] }
      })
      
      db.collection('aws_resources_ls')
      .find(  { tenantId: { $in: tenants }, service: { $in: [ "ec2", "rds" ] } }, 
              { ids: 1, service: 1, ts_ls:1, count: 1, tenantId: 1 } )
      .sort(  { ts_ls: -1 })
      .limit(2*_.size(tenants))  //comment this out to process all instances conclusevily 
      .toArray(function(err2, results2) {
        var benchmark2 = moment().valueOf();
        console.log("aws_resources_ls query runtime: "+ (benchmark2-benchmark1))

        var parseAll = true;

        _(results2).each(function(r, i) {
          if (_.size(r.ids) != 0) {
            if (parseAll) {
              _(r.ids).each(function(riid) {
                ids[parseInt(r.tenantId)][r.service].push(riid);
              })
            } else {
              ids[parseInt(r.tenantId)][r.service] = r.ids;
            }
          } else {
            delete ids[parseInt(r.tenantId)][r.service]
          }
        });

        _(ids).each(function(r, tid) {
          _(r).each(function(ids, service) {
            if (parseAll) {
              ids = _.uniq(ids) 
            }

            total_instances_count += _.size(ids)

            if (service == "ec2") {
              save_ec2_costs(tid, ids)
            } else if (service == "rds") {
              save_rds_costs(tid, ids)
            }
          });
        });

      });

    });

    function save_rds_costs(tid, ids) {
      if (costs_rds[tid] == undefined) {
        costs_rds[tid] = {};
      }

      var benchmark1 = moment().valueOf();
      db.collection('rds_instances_states')
        .find({ id: { $in: ids } }, 
              { "id": 1, "launched": 1, "updated": 1, "state": 1 })
        .sort({ ts_ls: -1 })
        .toArray(function(err2, results2) {
          var benchmark2 = moment().valueOf();
          console.log(" rds_instances_states query runtime: "+ (benchmark2-benchmark1))

          if (!sent_headers && 
              _.size(results2) == 0 && 
              total_instances_count == 0) {
            sent_headers = true
            res.setHeader('Content-Type', 'application/json');
            res.send(response);
          }

          _(results2).each(function(result, rid) {
            // white results2 contains all instances
            result.launched_h = moment(result.launched*1000).utc().subtract('hours', moment_adj).format('MM/DD/YY [@] h:mmA')
            if (result.updated != null)
              result.updated_h = moment(result.updated*1000).utc().subtract('hours', moment_adj).format('MM/DD/YY [@] h:mmA')
            else
              result.updated_h = null;

            if (result['updated'] == null) {
              ending = moment().utc().unix();
            } else {
              ending = result['updated'];
            }

            costs_rds[tid][result['id']] = 
              { runningtime: ending - result['launched'], 
                start: result['launched'], 
                end: result['updated'],
                type: null,
                az: null 
              };
          });

          benchmark1 = moment().valueOf();
          db.collection('rds_instances')
            .find({ id: { $in: ids } }, 
                  { "AvailabilityZone": 1,
                    "DBInstanceClass": 1,
                    "InstanceCreateTime": 1,
                    "Engine": 1,
                    "LicenseModel": 1,
                    "MultiAZ": 1,
                    "region": 1,
                    "id": 1 })
            .toArray(function(err3, results3) {
              if (!sent_headers && 
                _.size(results3) == 0 &&
                total_instances_count == 0) {
                sent_headers = true
                res.setHeader('Content-Type', 'application/json');
                res.send(response);
              }

              benchmark2 = moment().valueOf();
              console.log("  rds_instances query runtime: "+ (benchmark2-benchmark1))

              _(results3).each(function(instanceType, rid) {
                if (_.isObject(costs_rds[tid][instanceType['id']])) {
                  costs_rds[tid][instanceType['id']]['type'] = instanceType['DBInstanceClass'];
                  costs_rds[tid][instanceType['id']]['az'] = instanceType['AvailabilityZone'];
                  costs_rds[tid][instanceType['id']]['engine'] = instanceType['Engine'];
                  costs_rds[tid][instanceType['id']]['license'] = instanceType['LicenseModel'];
                  if (instanceType['MultiAZ'] == 'false') {
                    costs_rds[tid][instanceType['id']]['multiaz'] = false;
                  } else {
                    costs_rds[tid][instanceType['id']]['multiaz'] = true;
                  }
                  costs_rds[tid][instanceType['id']]['region'] = instanceType['region'];
                }
              });

              _(costs_rds[tid]).each(function(instanceDetails, iid) {
                save_rds_ondemand_instance_cost(iid, instanceDetails, tid);
              });
          });
      });

    }

    function save_ec2_costs(tid, ids) {
      var benchmark1 = moment().valueOf();

      if (costs[tid] == undefined) {
        costs[tid] = {};
      }

      console.log(ids);

      db.collection('ec2_instances_states')
        .find({ id: { $in: ids } })
        .sort({ ts_ls: -1 })
        .toArray(function(err2, results2) {
          var benchmark2 = moment().valueOf();
          console.log(" ec2_instances_states ("+_.size(results2)+") query runtime: "+ (benchmark2-benchmark1))

          _(results2).each(function(result, rid) {
            if (result['updated'] == null) {
              var ending = moment().utc().unix();
            } else {
              var ending = result['updated'];
            }

            costs[tid][result['id']] = 
              { type: result['type'], 
                az: result['az'], 
                total: null, 
                runningtime: ending - result['launched'], 
                start: result['launched'], 
                end: result['updated'],
                lifecycle: result['lifecycle']
              };
          });

          console.log(" lookup in ec2_instances for "+_.size(ids)+" instances")
          benchmark1 = moment().valueOf();
          db.collection('ec2_instances')
            .find({ instanceId: { $in: ids } }, 
              { "instancesSet.item.instanceType": 1, 
                    "instancesSet.item.launchTime": 1, 
                    "instancesSet.item.placement.availabilityZone": 1, 
                    "instancesSet.item.instanceLifecycle": 1,
                    "instancesSet.item.vpc-id": 1, 
                    "instancesSet.item.platform": 1, 
                    "instanceId": 1 })
            .toArray(function(err3, results3) {
              benchmark2 = moment().valueOf();
              console.log("  ec2_instances query runtime: "+ (benchmark2-benchmark1))

              _(results3).each(function(instanceType, rid) {
                if (!_.isObject(costs[tid][instanceType['instanceId']])) {
                  console.log("found instance "+instanceType['instanceId']+" with no state changes recorded")

                  if (instanceType['instancesSet']['item']['instanceLifecycle'] == undefined) {
                    var lifecycle = "ondemand"
                  } else {
                    var lifecycle = instanceType['instancesSet']['item']['instanceLifecycle'];
                  }

                  // timezone issue? //.add('hours', 5)
                  // is this wrong?
                  var launched = moment(instanceType['instancesSet']['item']['launchTime'], "YYYY-MM-DD[T]HH:mm:ss[.000Z]").utc().subtract('hours', moment_adj).unix()

                  costs[tid][instanceType['instanceId']] = {
                    type: instanceType['instancesSet']['item']['instanceType'],
                    az: instanceType['instancesSet']['item']['placement']['availabilityZone'],
                    total: null, 
                    runningtime: ending - launched, 
                    start: launched, 
                    end: ending,
                    lifecycle: lifecycle
                  }
                }
                // save the following
                // 1. az
                // 2. type
                // 3. vpc-id
                // 4. platform
                costs[tid][instanceType['instanceId']]['az'] = instanceType['instancesSet']['item']['placement']['availabilityZone'];
                costs[tid][instanceType['instanceId']]['type'] = instanceType['instancesSet']['item']['instanceType'];
                
                if (instanceType['instancesSet']['item']['vpc-id'] == undefined) {
                  vpc = false;
                } else {
                  vpc = true;
                }

                if (instanceType['instancesSet']['item']['platform'] == "windows") {
                  islinux = false;
                } else {
                  islinux = true;
                }

                if (islinux && vpc) {
                  costs[tid][instanceType['instanceId']]['desc'] = "Linux/UNIX (Amazon VPC)";
                } else if (islinux && !vpc) {
                  costs[tid][instanceType['instanceId']]['desc'] = "Linux/UNIX";
                } else if (!islinux && vpc) {
                  costs[tid][instanceType['instanceId']]['desc'] = "Windows (Amazon VPC)";
                } else if (!islinux && !vpc) {
                  costs[tid][instanceType['instanceId']]['desc'] = "Windows";
                }
              });
              
              _(costs[tid]).each(function(instanceDetails, iid) {
                response['costs'][iid] = instanceDetails;

                if (instanceDetails['lifecycle'] == "spot") {
                  save_spot_instance_cost(iid, instanceDetails, tid);
                } else if (instanceDetails['lifecycle'] == "ondemand") {
                  save_ondemand_instance_cost(iid, instanceDetails, tid);
                }
              });

          });
      });

    }

    function save_rds_ondemand_instance_cost(iid, instanceDetails, tid) {
      var start_dp = -1,
          end_dp = -1,
          endtime_ts = -1,
          start_lowest_hour = -1,
          end_lowest_hour = -1,
          end_running_hours = -1,
          start_sod = -1,
          end_sod = -1,
          hourlyprice = 0,
          pps = {},
          instancecost = parseFloat(0);

      endtime_ts = parseInt(instanceDetails['start']+instanceDetails['runningtime']);
      start_lowest_hour = moment(instanceDetails['start']*1000).startOf('hour').utc().unix();
      end_lowest_hour = moment((instanceDetails['start']+instanceDetails['runningtime'])*1000).endOf('hour').utc().unix()+1;
      end_running_hours = (end_lowest_hour - start_lowest_hour)/3600 + 1
      start_sod = moment(start_lowest_hour*1000).utc().sod().unix()
      end_sod = moment(end_lowest_hour*1000).utc().sod().unix()

      if (instanceDetails['license'] == "general-public-license") {
        instanceDetails['license'] = "gpl"
      } else if (instanceDetails['license'] == "license-included") {
        instanceDetails['license'] = "included"
      } else if (instanceDetails['license'] == "bring-your-own-license") {
        instanceDetails['license'] = "byol"        
      } else {
        instanceDetails['license'] = "gpl"
      }

      var benchmark1 = moment().valueOf();
      db.collection('rds_cost_ondemand').find(
        { engine: instanceDetails['engine'],
          license: instanceDetails['license'],
          multiaz: instanceDetails['multiaz'],
          type: instanceDetails['type'],
          region: instanceDetails['region'],
          $or: [ { ts_lastgood: { '$gte': start_sod, '$lte': moment().utc().sod().unix() } } ]
        }).sort({ "ts_lastgood": 1 }).toArray(function(err, pricepoints) {

          var benchmark2 = moment().valueOf();
          console.log("   rds_cost_ondemand query runtime: "+ (benchmark2-benchmark1))
          console.log("id:'"+iid+"', type:'"+instanceDetails['type']+"', az:'"+instanceDetails['az']+"', ["+instanceDetails['start']+"-"+instanceDetails['end']+"] ["+start_dp+"-"+end_dp+"] - total time: "+instanceDetails['runningtime'])

          var hour = 1;
          for (var i = start_lowest_hour; i<end_lowest_hour; i+= 3600) {
            var match = _.find(pricepoints, function (pricepoint) { 
              if (pricepoint['ts_lastgood'] <= moment(i*1000).sod().unix()) {
                return true;
              } else if (moment(i*1000).sod().unix() <= pricepoint['ts_lastgood']) {
                return true;
              }
            })
            
            if (_.isObject(match)) {
              var hourly_price = parseFloat(match['price'])
              instancecost += hourly_price

              db.collection('rds_instance_costs_hourly').insert(
              { id: iid,
                tid: parseInt(tid),
                lifecycle: 'ondemand',
                start: i,
                end: (i+3599),
                total: parseFloat(hourly_price),
                'ts': moment().utc().unix() 
              } ,
              { upsert: true, safe: false },
              function(err2, res2) {
                if (!res2) {
                 //   console.log("error:"+err2);
                }                        
              }
            )
            }

            hour += 1;
          }

          costs_rds[tid][iid]['total'] = instancecost.toFixed(6);

          var ts = moment().utc().unix()          
          var thisinstance = {
            id: iid,
            tid: parseInt(tid),
            lifecycle: 'ondemand',
            total: instancecost.toFixed(6),
            start: costs_rds[tid][iid]['start'],
            end: costs_rds[tid][iid]['end'],
            runningtime: costs_rds[tid][iid]['runningtime'],
            ts: ts
          }

          if (costs_rds[tid][iid]['end'] == null) {
            thisinstance['closed'] = false;
          } else {
            thisinstance['closed'] = true;                    
          }
          
          var thisinstancefind = {
            id: iid,
            tid: parseInt(tid),
            lifecycle: 'ondemand',
            start: costs_rds[tid][iid]['start'],
          }

          var thisinstanceupdate = {
            total: instancecost.toFixed(6),
            end: costs_rds[tid][iid]['end'],
            runningtime: costs_rds[tid][iid]['runningtime'],
            ts: ts
          }

          db.collection('rds_instance_costs').update(
            thisinstancefind ,
            thisinstance ,
            { upsert: true, safe: false },
            function(err2, res2) {
              if (!res2) {
               //   console.log("ec2_instance_costs error:"+err2);
              }                        

              total_instances_count -= 1;
              console.log("rds total_instances_count:"+total_instances_count)

              if (total_instances_count == 0) {
                response['cost']['runningtotal'] += total.toFixed(6);
                var main_benchmark2 = moment().valueOf();
                console.log("main_menchmark query runtime: "+ (main_benchmark2-main_benchmark1))

                if (!sent_headers) {
                  sent_headers = true
                  res.setHeader('Content-Type', 'application/json');
                  res.send(response);
                }

                console.log("net: "+total);
              }

            }
          )

          //console.log("total_instances_count:"+total_instances_count)
          //console.log("final total_instances_count:"+total_instances_count + " vs: "+tid_checkme)
          if (total_instances_count == 0) {
            response['cost']['runningtotal'] += total.toFixed(6);
            var main_benchmark2 = moment().valueOf();
            console.log("main_menchmark query runtime: "+ (main_benchmark2-main_benchmark1))

            if (!sent_headers) {
              sent_headers = true
              res.setHeader('Content-Type', 'application/json');
              res.send(response);
            }

            console.log("net: "+total);
          }

        });

    }

    function save_ondemand_instance_cost(iid, instanceDetails, tid) {
      var start_dp = -1,
          end_dp = -1,
          endtime_ts = -1,
          start_lowest_hour = -1,
          end_lowest_hour = -1,
          end_running_hours = -1,
          start_sod = -1,
          end_sod = -1,
          os = "",
          hourlyprice = 0,
          pps = {},
          instancecost = parseFloat(0);

      endtime_ts = parseInt(instanceDetails['start']+instanceDetails['runningtime']);
      start_lowest_hour = moment(instanceDetails['start']*1000).startOf('hour').utc().unix();
      end_lowest_hour = moment((instanceDetails['start']+instanceDetails['runningtime'])*1000).endOf('hour').utc().unix()+1;
      end_running_hours = (end_lowest_hour - start_lowest_hour)/3600 + 1
      start_sod = moment(start_lowest_hour*1000).utc().sod().unix()
      end_sod = moment(end_lowest_hour*1000).utc().sod().unix()

      if (instanceDetails['desc'] == "Windows (Amazon VPC)" ||
          instanceDetails['desc'] == "Windows") {
        os = "mswin";
      } else {
        os = "linux";
      }

      db.collection('ec2_cost_ondemand').find(
        { type: instanceDetails['type'], 
          region: instanceDetails['az'].slice(0,-1), 
          os: os,
          $or: [ { ts_lastgood: { '$gte': start_sod, '$lte': moment().utc().sod().unix() } } ]
        }).sort({ "ts_lastgood": 1 }).toArray(function(err, pricepoints) {
          console.log("ec2 ondemand id:'"+iid+"', type:'"+instanceDetails['type']+"', az:'"+instanceDetails['az']+"', desc:'"+instanceDetails['desc']+"' ["+instanceDetails['start']+"-"+instanceDetails['end']+"] ["+start_dp+"-"+end_dp+"] - total time: "+instanceDetails['runningtime'])

          var hour = 1;
          //console.log("paying for ["+start_lowest_hour+"-"+end_lowest_hour+"]")
          for (var i = start_lowest_hour; i<end_lowest_hour; i+= 3600) {
            //console.log("paying hour "+hour)
            var match = _.find(pricepoints, function (pricepoint) { 
              if (pricepoint['ts_lastgood'] <= moment(i*1000).sod().unix()) {
                return true;
              } else if (moment(i*1000).sod().unix() <= pricepoint['ts_lastgood']) {
                return true;
              }
            })
            
            if (_.isObject(match)) {
              var hourly_price = parseFloat(match['price'])
              instancecost += hourly_price

              db.collection('ec2_instance_costs_hourly').insert(
              { id: iid,
                tid: parseInt(tid),
                lifecycle: 'ondemand',
                start: i,
                end: (i+3599),
                total: parseFloat(hourly_price),
                'ts': moment().utc().unix() 
              } ,
              { upsert: true, safe: false },
              function(err2, res2) {
                if (!res2) {
                 //   console.log("error:"+err2);
                }                        
              }
            )
              //console.log("spot: price at "+i+" is same as for day "+moment(i*1000).sod().unix()+" for cost $"+hourly_price+"/hr")
            }

            hour += 1;
          }

          costs[tid][iid]['total'] = instancecost.toFixed(6);

          var ts = moment().utc().unix()
          var thisinstance = {
            id: iid,
            tid: parseInt(tid),
            lifecycle: 'ondemand',
            total: instancecost.toFixed(6),
            start: costs[tid][iid]['start'],
            end: costs[tid][iid]['end'],
            runningtime: costs[tid][iid]['runningtime'],
            ts: ts
          }

          var thisinstancefind = {
            id: iid,
            tid: parseInt(tid),
            lifecycle: 'ondemand',
            start: costs[tid][iid]['start'],
          }

          var thisinstanceupdate = {
            total: instancecost.toFixed(6),
            end: costs[tid][iid]['end'],
            runningtime: costs[tid][iid]['runningtime'],
            ts: ts
          }

          if (costs[tid][iid]['end'] == null) {
            thisinstance['closed'] = false;
          } else {
            thisinstance['closed'] = true;                    
          }
          
          db.collection('ec2_instance_costs').update(
            thisinstancefind ,
            thisinstance ,
            { upsert: true, safe: false },
            function(err2, res2) {
              if (!res2) {
               //   console.log("ec2_instance_costs error:"+err2);
              }                        
            }
          )

          total_instances_count -= 1;
          if (total_instances_count == 0) {
            var main_benchmark2 = moment().valueOf();
            console.log("main_menchmark query runtime: "+ (main_benchmark2-main_benchmark1))

            if (!sent_headers) {
              sent_headers = true
              res.setHeader('Content-Type', 'application/json');
              res.send(response);
            }
          }

        });

    }

    function checkHeadersToSend() {
      total_instances_count -= 1;
      if (!sent_headers && total_instances_count == 0) {
        sent_headers = true
        res.setHeader('Content-Type', 'application/json');
        res.send(response);
      }
    }

    function save_spot_instance_cost(iid, instanceDetails, tid) {
      var start_dp = -1,
          end_dp = -1,
          endtime_ts = -1,
          start_lowest_hour = -1,
          end_lowest_hour = -1,
          end_running_hours = -1,
          instancecost = parseFloat(0);

      start_lowest_hour = moment(instanceDetails['start']*1000).utc().startOf('hour').unix();
      end_lowest_hour = moment((instanceDetails['start']+instanceDetails['runningtime'])*1000).utc().endOf('hour').unix();
      end_running_hours = (end_lowest_hour - start_lowest_hour)/3600 + 1

      var benchmark1 = moment().valueOf();

      console.log("ec2 spot id:'"+iid+"', type:'"+instanceDetails['type']+"', az:'"+instanceDetails['az']+" ("+translate_spot_az(tid,instanceDetails['az'])+")', desc:'"+instanceDetails['desc']+"' ["+instanceDetails['start']+"-"+instanceDetails['end']+"] ["+start_lowest_hour+"-"+end_lowest_hour+"] - total time: "+instanceDetails['runningtime'])

      db.collection('ec2_cost_spot_hourly')
      .aggregate(
        [
          { $match : 
            { type: instanceDetails['type'], 
              zone: translate_spot_az(tid,instanceDetails['az']), 
              desc: instanceDetails['desc'], 
              ts: { $gte: start_lowest_hour, $lte: end_lowest_hour } 
            } 
          },
          { $group:
            {
              _id: { id: "$id", price: "$price" },
              sum: { $sum: "$price" }
            }
          }, 
          { $project:
            {
              id: "$id",
              sum: "$sum"
            },
          }
        ], function(err, costs) {
          if (costs[0] != undefined &&
              costs[0]['sum'] != undefined &&
              _.size(costs) != 0) {

            var instancecost = costs[0]['sum'];
            response['costs'][iid]['total'] = instancecost.toFixed(6);

            var thisinstance = {
              id: iid,
              tid: parseInt(tid),
              lifecycle: 'spot',
              total: instancecost.toFixed(6),
              start: instanceDetails['start'],
              end: instanceDetails['end'],
              runningtime: instanceDetails['runningtime'],
              ts: moment().utc().unix()
            }

            if (instanceDetails['end'] == null) {
              thisinstance['closed'] = false;
            } else {
              thisinstance['closed'] = true;                    
            }

            var thisinstancefind = {
              id: iid,
              tid: parseInt(tid),
              lifecycle: 'spot',
              start: instanceDetails['start'],
            }

            var thisinstanceupdate = {
              total: instancecost.toFixed(6),
              end: instanceDetails['end'],
              runningtime: instanceDetails['runningtime'],
              ts: moment().utc().unix()
            }

            db.collection('ec2_instance_costs').update(
              thisinstancefind ,
              thisinstance , 
              { upsert: true, safe: false },
              function(err2, res2) {
                checkHeadersToSend();
              }
            )          
          }
      });

      total_instances_count += 1;
      db.collection('ec2_cost_spot_hourly')
      .find(
        { type: instanceDetails['type'], 
          zone: translate_spot_az(tid,instanceDetails['az']), 
          desc: instanceDetails['desc'], 
          ts: { $gte: start_lowest_hour, $lte: end_lowest_hour } 
        })
      .sort({ "ts": 1 }).toArray(function(err, hourlyCostSlots) {
        total_instances_count += _.size(hourlyCostSlots);

        _(hourlyCostSlots).each(function(c, i) {
          var hourly_price = parseFloat(c['price'])
          db.collection('ec2_instance_costs_hourly')
          .insert(
            { id: iid,
              tid: parseInt(tid),
              lifecycle: 'spot',
              start: c.ts,
              end: (c.ts+3599),
              total: parseFloat(hourly_price),
              'ts': moment().utc().unix() 
            } ,
            { upsert: true, safe: false },
            function(err2, res2) {
              checkHeadersToSend();

              if (err2) {
//                  console.log("error:"+err2);
              }                        
            }
          )
        })

        checkHeadersToSend();

      });

      checkHeadersToSend();
    }

    function translate_spot_az(tid, az) {
      tid = parseInt(tid);
      if (tid == 1) {
        return az;
      } else if (tid == 2) {
        var region = az.slice(0,-1)
        var original_az = az[az.length-1]
        if (original_az == "b") {
          new_az = "a"
        } else if (original_az == "d") {
          new_az = "c"
        } else if (original_az == "a") {
          new_az = "d"
        } else if (original_az == "c") {
          new_az = "e"
        }

        return region+new_az;
      }
    }
}
