var mongo = require('mongodb'),
    _ = require('lodash'),
    crypto = require('crypto'),
    request = require('request'),
    db_helper = require('../../helpers/db');

exports.saveResourcesLastSeen = function(tenantId, service, stats, ts_ls, results) {
    results = _.sortBy(results);
    
    db.collection('aws_resources_ls', function(err, collection) {
        if (err) {
            fmt.field("error", err);
        } else {
            collection.update(
                {   tenantId:   tenantId,
                    service:    service,
                    ids:        results,
                    count:      stats
                }, 
                { $set: 
                    { 
                        tenantId:   tenantId,
                        service:    service,
                        ts_ls:      ts_ls,
                        ids:        results,
                        count:      stats,
                    }
                },
                { upsert: true, safe: false },
                function(err2, res2) {
                    if (err2) {
                        fmt.field("error", err2);
                    }
                }
            );

            /*
            collection.update(
                {   tenantId:   tenantId,
                    service:    service 
                }, 
                { $set: 
                    { 
                        count:  stats,
                        ts_ls:  ts_ls,
                        ids: results
                    }
                },
                { upsert: true, safe: false },
                function(err2, res2) {
                    if (err2) {
                        fmt.field("error", err2);
                    }
                }
            );
            */

        }
    });   
};
