auth_helper = require('./helpers/auth');
db_helper = require('./helpers/db');
email_helper = require('./helpers/email');

express = require('express');
moment = require('moment');
r_aws_instance = require('./routes/aws/general');
var   path = require('path')
    , http = require('http')
    , crypto = require('crypto')
    , fs = require('fs')    
    , io = require('socket.io')
    , util = require('util')
    //aws
    , r_cost_instance = require('./routes/aws/cost')
    , r_ec2_instance = require('./routes/aws/ec2')
    , r_rds_instance = require('./routes/aws/rds')
    , r_cloudwatch_instance = require('./routes/aws/cw')
    // aws presentation
    , r_stack = require('./routes/aws/stack')
    // internal
    , r_users_instance = require('./routes/auth/users')
    , r_stats = require('./routes/general/stats')
    , r_dashboard = require('./routes/frontend/dashboard')
    , cost = require('./routes/aws/cost')

/* login */
db_helper.dbConnect(["ec2_instances", "tenants"]);

var enable_sockets = false;
if (enable_sockets) {
    io = io.listen(server);
    io.configure(function () {
        io.set('authorization', function (handshakeData, callback) {
            if (handshakeData.xdomain) {
                callback('Cross-domain connections are not allowed');
            } else {
                callback(null, true);
            }
        });
    });
}

var app = express();

function customHeaders( req, res, next ){
  // OR set your own header here
  res.setHeader( 'X-Powered-By', 'StackIgnite v0.6' );
  next()
}

app.configure(function () {
    app.set('port', process.argv[2] || 3000);
    app.use(express.logger('dev'));
    app.use(customHeaders);
//    app.use(express.compress());
    app.use(express.methodOverride());
    app.use(express.bodyParser()),
    app.use(express.cookieParser());
    app.use(express.cookieSession({
        secret: process.env.globalSecret,
        key: 'stackignite'
      }));
    app.use(express.session({
        secret: process.env.globalSecret,
        cookie: {
            path: "/",
//            maxAge: 60000 * 60 * 24 * 7, 
            maxAge: null, 
            secure: true
        }
      }));        
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

// authenticate route
app.post('/login', r_users_instance.checkLogin);

// member page route
app.get('/member', function(req, res){
  // check session to see if user has logged in 
  if (!req.session.username || !req.session.uid) {
    // if false redirect
    res.redirect('/');
  } else {
    // if true render member
    res.render('member.html', { title: 'Member', username: req.session.username })
  }
});

app.get('/logout', function(req, res) {
    req.session = null;
    res.redirect('/');
});

/*
app.get('/dashboard', function(req, res) {
    res.sendfile(__dirname + '/public/app.html');
    console.log("app file");
});
*/

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

app.get('/stack/lookinglass', r_stack.find_ec2_rds_allzones);

app.get('/ec2/DescribePlacementGroups', r_ec2_instance.DescribePlacementGroups);
app.get('/ec2/DescribeTags', r_ec2_instance.DescribeTags);
app.get('/ec2/instances/update', r_ec2_instance.updateAll);
app.get('/ec2/instances', r_ec2_instance.findAll);

app.get('/ec2/cost/update/ondemand', r_cost_instance.saveEC2PriceOnDemand);
app.get('/ec2/cost/update/reserved', r_cost_instance.saveEC2PriceReserved);
app.get('/ec2/cost/update/spot', r_cost_instance.saveEC2PriceSpotDaysBack);
// all/hourly

app.get('/ec2/cost/update/instances/computed/hourly/:level', r_cost_instance.saveSpotHourly);

app.get('/cloudwatch/ListMetrics', r_cloudwatch_instance.ListMetrics);
app.get('/cloudwatch/DescribeAlarms', r_cloudwatch_instance.DescribeAlarms);

//app.get('/ec2/instances/:id', r_ec2_instance.findById);
//app.get('/ec2/DescribeTags', r_ec2_instance.DescribeTags);
//app.post('/ec2/instances', r_ec2_instance.add);
//app.put('/ec2/instances/:id', r_ec2_instance.update);

app.get('/rds/cost/update/ondemand', r_cost_instance.saveRDSPriceOnDemand);
app.get('/rds/cost/update/reserved', r_cost_instance.saveRDSPriceReserved);

// cost
app.get('/cost/update/instances', r_stats.savePricingHistory);
app.get('/cost/update/daily', r_stats.saveAggregatedCosts);
app.get('/send/emails/daily/cost/projections', r_stats.sendAggregatedCostsEmail);


app.get('/rds/instances/update', r_rds_instance.updateAll);
app.get('/rds/instances', r_rds_instance.findAll);
app.get('/rds/ListTagsForResource/:id', r_rds_instance.ListTagsForResource);

app.get('/dashboard/find/instances/:type', r_stack.find_instances);
app.get('/dashboard/find/instances/:type/:level', r_stack.find_instances);

app.get('/dashboard/:service/types/:timespan', r_cost_instance.show_table);
app.get('/dashboard/:service/prices/:timespan', r_cost_instance.show_prices);

app.get('/dashboard/activity/:limit', r_dashboard.getActivity);
app.get('/dashboard/stats', r_dashboard.getDashboard);
app.get('/dashboard/stats/costs', r_dashboard.getCosts);
app.get('/dashboard/stats/costs/:days', r_dashboard.getCosts);
app.get('/dashboard/stats/costs/:service/:frequency/:count', r_dashboard.getCosts);

app.get('/dashboard/stats/graphs/service/:service/level/:level', r_dashboard.getGraphs);

//not done
/*
app.get('/cloudformation', cloudformation.findAll);
app.get('/cloudformation/:id', cloudformation.findById);
app.post('/cloudformation', cloudformation.addWine);
app.put('/cloudformation/:id', cloudformation.updateWine);
app.delete('/cloudformation/:id', cloudformation.deleteWine);
*/

var server = http.createServer(app);

server.listen(app.get('port'), function () {
    console.log("express http on " + app.get('port'));
});

if (enable_sockets) {
    io.sockets.on('connection', function (socket) {
        socket.on('message', function (message) {
            console.log("Got message: " + message);
            ip = socket.handshake.address.address;
            url = message;
            io.sockets.emit('pageview', { 'connections': Object.keys(io.connected).length, 'ip': ip, 'url': url, 'xdomain': socket.handshake.xdomain, 'timestamp': new Date()});
        });

        socket.on('disconnect', function () {
            console.log("Socket disconnected");
            io.sockets.emit('pageview', { 'connections': Object.keys(io.connected).length});
        });
    });
}