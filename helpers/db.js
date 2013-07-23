/* global scope db vars */
mongo = require('mongodb'),
mongoose = require('mongoose'),
_ = require('lodash'),
// db server vars
Server = mongo.Server,
Db = mongo.Db,
BSON = mongo.BSONPure,
server = new Server(process.env.dbhostname, parseInt(process.env.dbport), {auto_reconnect: true});
db = new Db(process.env.dbname, server, {safe: true}),
// for logging
fmt = require('fmt');

// ensures that we have an authenticated connection with existing collections
exports.dbConnect = function(collections) {
    fmt.sep();
    if (!db.openCalled) {
        fmt.title('dbConnect attempt to '+process.env.dbname);
        db.open(function(err, db) {
            if(!err) {
                db.authenticate(process.env.dbusername, process.env.dbpassword, function(errCon, resCon) {
                    if (errCon) {
                        fmt.field("Result", "Could not authenticate to "+process.env.dbname+"");
                        fmt.field("Data",errCon);
                    } else {
                        fmt.field("Result", "Connected to "+process.env.dbname+"");
                        ensureCollectionsExist(collections);
                    }
                });
            } else {
                fmt.field("Result","Could not connected to "+process.env.dbname+" database");
                fmt.field("Data",err);
            }
            fmt.sep();
        });
    } else {
        ensureCollectionsExist(collections);
    }

    fmt.separator();
}

// ensures that collections exist
function ensureCollectionsExist(collections) {
    fmt.title('ensuring collections exist for '+collections);
    if (_.size(collections) > 0) {
        _(collections).each( function (collectionName,b) {
            db.collection(collectionName, {safe:false}, function(errCollectionQuery, collection) {
                if (errCollectionQuery) {
                    fmt.field("Collection", collectionName+" does not exist, will attempt to create");
                    db.collection(collectionName, function(err, collection) {
                        collection.insert([], {safe:true}, function(err, result) {});
                    });
                }
            });
        });
    }
}
