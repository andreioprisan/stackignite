var appCore = {
    pubNavFooter: function() {
        if ($('#page_loading_spinner').css('display') != "none")
            $('#page_loading_spinner').hide();

        if ($('#page_footer').css('display') != "block")
            $('#page_footer').show();

        if (!this.pubNavView)
            this.pubNavView = new PubNavView();

        $('#main_nav_container').html(this.pubNavView.el);
    },

    pubNavSelect: function(type) {
        this.pubNavView.selectMenuItem(type+'-page');
    },

    pubMainContainer: function(type) {
        switch(type)
        {
            case 'welcome':
                if (!this.welcomeView) {
                    this.welcomeView = new WelcomeView();
                }
                $('#main_container').html(this.welcomeView.el);

                break;
            case 'pricing':
                if (!this.pricingView) {
                    this.pricingView = new PricingView();
                }
                $('#main_container').html(this.pricingView.el);

                break;
            case 'features':
                if (!this.featuresView) {
                    this.featuresView = new FeaturesView();
                }
                $('#main_container').html(this.featuresView.el);

                break;
            case 'signup':
                if (!this.signinView) {
                    this.signinView = new SigninView();
                }
                $('#main_container').html(this.signinView.el);

                break;
            case 'login':
                var login = new Login();
                if (!this.loginView) {
                    this.loginView = new LoginView();
                }
                $('#main_container').html(new LoginView({model: login}).el);

                break;
            case 'public_cloud_cost':
                $("#main_container").css('margin-top', '0px');
                $('#main_container').html('<div class="span12 lead">\
        <center>\
        <h1><i class="icon-signal icon-large"></i> real-time aws ec2 prices</h1>\
        </center>\
      </div>');
                appCore.pricingTable('ec2', 'all');

                break;                
        }
    },

    pubPage: function(type) {
        appCore.pubNavFooter();
        appCore.pubMainContainer(type);
        appCore.pubNavSelect(type);
    },

    dashboardLoadCSS: function() {
        $('link[href="css/core.css"]').attr({"disabled":true});      

        if (!$('link[href="css/bootstrap.css"]').attr('href'))  
            $('<link rel="stylesheet" type="text/css" href="css/bootstrap.css"/>').appendTo('head');

        if (!$('link[href="css/bootstrap-responsive.css"]').attr('href'))  
            $('<link rel="stylesheet" type="text/css" href="css/bootstrap-responsive.css"/>').appendTo('head');

        if (!$('link[href="css/styles.css"]').attr('href'))  
            $('<link rel="stylesheet" type="text/css" href="css/styles.css"/>').appendTo('head');
    },

    dashboardNavFooter: function() {
        $('#page_footer').hide();
        
        if (!this.headerView)
            this.headerView = new HeaderView();

        $('#main_nav_container').html(this.headerView.el);
        $("#main_container").css('margin-top', '70px');
    },


    alertLoadingProgress: function() {
        var alert = '\
            <div class="alert alert-info" id="alert-loading" style="display: inline-block;">\
                <span style="">Hold on, we\'re fetching the latest data for you!</span>\
            </div>\
            <div class="progress progress-striped active" style="display: inline-block;width: 70%;position: relative;top: 25px;left: 25px;" id="alert-loading-progress">\
              <div class="bar" style="width: 5%;"></div>\
            </div>';

        $("#main_container").html(alert);
        $('#alert-loading-progress').show();

        // oh dear god, why? there's got to be a better way of doing this.
        if ($('#alert-loading-progress div[class=bar]')) {
            var w = parseInt($('#alert-loading-progress div[class=bar]').css('width'));
            setTimeout(function(){
                w = w*10;
                $('#alert-loading-progress div[class=bar]').css('width',w);
                setTimeout(function(){
                    w = w*1.25;
                    $('#alert-loading-progress div[class=bar]').css('width',w);
                    setTimeout(function(){
                        w = w*1.35;
                        $('#alert-loading-progress div[class=bar]').css('width',w);
                        setTimeout(function(){
                            w = w*1.35;
                            $('#alert-loading-progress div[class=bar]').css('width',w);
                            setTimeout(function(){
                                w = w*1.35;
                                $('#alert-loading-progress div[class=bar]').css('width',w);
                                setTimeout(function(){
                                    w = w*1.35;
                                    $('#alert-loading-progress div[class=bar]').css('width',w);
                                },500);
                            },500);
                        },500);
                    },200);
                },200);
            },200);

        }
    },

    alertLoadingDone: function() {
        $('#alert-loading-progress div[class=bar]').css('width','100%');
        $('#alert-loading').hide();
        $('#alert-loading-progress').hide();
    },

    ec2_instances_list: function(timespan) {
        console.log(timespan);

        var ec2InstanceList = new EC2Collection({ timespan: timespan });
        ec2InstanceList.fetch({success: function(err, data){
            appCore.alertLoadingDone();
            
            $("#main_container").append('<table class="table table-bordered table-pageable" id="ec2_listing_simple"><thead><th>instance ID</th><th>Name</th><th>Zone</th><th>SSH Key</th><th>R Type</th><th>Arch</th><th>Launched</th><th>Actions</th></thead>');

            _(data.ec2).each(function(instance) {
                instance.identifying = []
                if (instance.instancesSet.item.instanceLifecycle &&
                    instance.instancesSet.item.instanceLifecycle == "spot") {
                    var lifecycle = "spot";
                } else {
                    var lifecycle = "on demand";
                }

                var viewdetails = '\
                    <a href="#ec2-instance-details-'+instance.instancesSet.item.instanceId+'" role="button" class="btn" data-toggle="modal">view</a>\
                    <div id="ec2-instance-details-'+instance.instancesSet.item.instanceId+'" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"  style="width: 90%; left: 22%;">\
                        <div class="modal-header">\
                        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
                        <h3 id="myModalLabel">\
                            Instance ID '+instance.instancesSet.item.instanceId +' \
                            Running State '+instance.instancesSet.item.instanceState.name +'\
                            code: '+instance.instancesSet.item.instanceState.code +'\
                            Monitoring State '+instance.instancesSet.item.monitoring.state+'</h3>\
                        </div>\
                        <div class="modal-body">\
                        <p>';

                if (_.size(instance.identifying) != 0 &&
                    instance.identifying.client != undefined) {

                    viewdetails += '\
                        <h4>Client Details</h4>\
                        <table class="table table-bordered">\
                            <thead>\
                                <tr>\
                                    <th>Client</th>\
                                    <th>Project</th>\
                                    <th>Environment</th>\
                                    <th>Function</th>\
                                </tr>\
                            </thead>\
                            <tr>\
                                <td>'+instance.identifying.client+'</td>\
                                <td>'+instance.identifying.project+'</td>\
                                <td>'+instance.identifying.env+'</td>\
                                <td>'+instance.identifying.func+'</td>\
                            </tr>\
                        </table>\
                        <br/>';
                }

                viewdetails += '\
                    <h4>Reservation Details</h4>\
                    <table class="table table-bordered">\
                        <thead>\
                            <tr>\
                                <th>Reservation ID</th>\
                                <th>Owner ID</th>\
                                <th>Instance ID</th>\
                                <th>AMI Image ID</th>\
                                <th>Kernel ID</th>\
                                <th>Ramdisk ID</th>\
                                <th>Started At</th>\
                                <th>Instance Type</th>\
                                <th>Availability Zone</th>\
                                <th>Architecture</th>\
                            </tr>\
                        </thead>\
                        <tr>\
                            <td>'+instance.reservationId+'</td>\
                            <td>'+instance.ownerId+'</td>\
                            <td>'+instance.instancesSet.item.instanceId+'</td>\
                            <td>'+instance.instancesSet.item.imageId+'</td>\
                            <td>'+instance.instancesSet.item.kernelId+'</td>\
                            <td>'+instance.instancesSet.item.ramdiskId+'</td>\
                            <td>'+instance.instancesSet.item.launchTime+'</td>\
                            <td>'+instance.instancesSet.item.instanceType+'</td>\
                            <td>'+instance.instancesSet.item.placement.availabilityZone+'</td>\
                            <td>'+instance.instancesSet.item.architecture+'</td>\
                        </tr>\
                    </table>\
                    <br/>\
                    <h4>DNS</h4>\
                    <table class="table table-bordered">\
                        <thead>\
                            <tr>\
                                <th>Private Hostname</th>\
                                <th>Private IP Address</th>\
                                <th>Public Hostname</th>\
                                <th>Public IP Address</th>\
                            </tr>\
                        </thead>\
                        <tr>\
                            <td>'+instance.instancesSet.item.privateDnsName+'</td>\
                            <td>'+instance.instancesSet.item.privateIpAddress+'</td>\
                            <td>'+instance.instancesSet.item.dnsName+'</td>\
                            <td>'+instance.instancesSet.item.ipAddress+'</td>\
                        </tr>\
                    </table>\
                    <br/>';

                viewdetails += '\
                    <h4>Root Block Storage</h4>\
                    <table class="table table-bordered">\
                        <thead>\
                            <tr>\
                                <th>EBS Optimized?</th>\
                                <th>Root Device Type</th>\
                                <th>Root Location</th>';
                viewdetails += '</tr>\
                        </thead>\
                        <tr>\
                            <td>'+instance.instancesSet.item.ebsOptimized+'</td>\
                            <td>'+instance.instancesSet.item.rootDeviceType+'</td>\
                            <td>'+instance.instancesSet.item.rootDeviceName+'</td>';
                viewdetails += '</tr></table>';

                if (instance.instancesSet.item.blockDeviceMapping != undefined) {
                    viewdetails += '\
                        <h4>EBSs Attached</h4>\
                        <table class="table table-bordered">\
                            <thead>\
                                <tr>\
                                    <th>Device Name</th>\
                                    <th>Volume ID</th>\
                                    <th>Status</th>\
                                    <th>Attach Time</th>\
                                    <th>Delete On Termination?</th>\
                                </tr>\
                            </thead>';

                    if (_.isObject(instance.instancesSet.item.blockDeviceMapping.item) &&
                        _.isArray(instance.instancesSet.item.blockDeviceMapping.item)) {
                        _(instance.instancesSet.item.blockDeviceMapping.item).each(function(ebs) {
                            viewdetails += '<tr>';
                            viewdetails += '<td>'+ebs.deviceName +'</td>';
                            viewdetails += '<td>'+ebs.ebs.volumeId +'</td>';
                            viewdetails += '<td>'+ebs.ebs.status +'</td>';
                            viewdetails += '<td>'+ebs.ebs.attachTime +'</td>';
                            viewdetails += '<td>'+ebs.ebs.deleteOnTermination +'</td>';
                            viewdetails += '</tr>';
                        });
                    } else {
                        if (instance.instancesSet.item.blockDeviceMapping.item != undefined) {
                            viewdetails += '<tr>';
                            viewdetails += '<td>'+instance.instancesSet.item.blockDeviceMapping.item.deviceName +'</td>';
                            viewdetails += '<td>'+instance.instancesSet.item.blockDeviceMapping.item.ebs.volumeId +'</td>';
                            viewdetails += '<td>'+instance.instancesSet.item.blockDeviceMapping.item.ebs.status +'</td>';
                            viewdetails += '<td>'+instance.instancesSet.item.blockDeviceMapping.item.ebs.attachTime +'</td>';
                            viewdetails += '<td>'+instance.instancesSet.item.blockDeviceMapping.item.ebs.deleteOnTermination +'</td>';
                            viewdetails += '</tr>';
                        }
                    }

                    viewdetails += '</table>';
                }

                viewdetails += '<br>\
                            <h4>Raw Data</h4>\
                            <pre class="prettyprint">'+JSON.stringify(instance.instancesSet)+'</pre>\
                        </p>\
                        </div>\
                    </div>';

                var instance_row = '\
                    <td>'+instance.instancesSet.item.instanceId+'</td>\
                    <td>'+instance.instancesSet.item.placement.availabilityZone+'</td>\
                    <td>'+instance.instancesSet.item.instanceType+'</td>\
                    <td>'+instance.instancesSet.item.keyName+'</td>\
                    <td>'+lifecycle+'</td>\
                    <td>'+instance.instancesSet.item.architecture+'</td>\
                    <td>'+instance.instancesSet.item.launchTime+'</td>\
                    <td>'+viewdetails+'</td>';

                $('#ec2_listing_simple', this.el).append("<tr>"+instance_row+"</tr>");
            });

            $("#main_container").append('</table>');

            $.extend( $.fn.dataTableExt.oStdClasses, {
                "sWrapper": "dataTables_wrapper form-inline"
            } );

            $('.table-pageable').dataTable( {
                //"sDom": "<'row'<'span2'l><'span10'f>r>t<'row'<'span6'i><'span6'p>>"
            } );

        }});
    },

    rds_instances_list: function(timespan) {
        console.log(timespan);

        var RDSInstanceList = new RDSCollection({ timespan: timespan });
        RDSInstanceList.fetch({success: function(err, data){
            appCore.alertLoadingDone();

            $("#main_container").append('<table class="table table-bordered table-pageable" id="ec2_listing_simple"><thead><th>instance ID</th><th>Account</th><th>Multi-AZ</th><th>Zone</th><th>Type</th><th>State</th><th>Storage</th><th>Engine</th><th>Launched</th><th>Actions</th></thead>');

            _(data.rds).each(function(instance) {
                var viewdetails = '\
                    <a href="#rds-instance-details-'+instance.id.replace(/\./g,'')+'" role="button" class="btn" data-toggle="modal">view</a>\
                    <div id="rds-instance-details-'+instance.id.replace(/\./g,'')+'" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"  style="width: 90%; left: 22%;">\
                        <div class="modal-header">\
                        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
                        <h3 id="myModalLabel">\
                            Instance ID '+instance.id +' \
                        </div>\
                        <div class="modal-body">\
                        <p>';

                if (instance.identifying != undefined &&
                    _.size(instance.identifying) != 0 &&
                    instance.identifying.client != undefined) {

                    viewdetails += '\
                        <h4>Client Details</h4>\
                        <table class="table table-bordered">\
                            <thead>\
                                <tr>\
                                    <th>Client</th>\
                                    <th>Project</th>\
                                    <th>Environment</th>\
                                    <th>Function</th>\
                                </tr>\
                            </thead>\
                            <tr>\
                                <td>'+instance.identifying.client+'</td>\
                                <td>'+instance.identifying.project+'</td>\
                                <td>'+instance.identifying.env+'</td>\
                                <td>'+instance.identifying.func+'</td>\
                            </tr>\
                        </table>\
                        <br/>';
                }

                viewdetails += '\
                    <h4>DNS</h4>\
                    <table class="table table-bordered">\
                        <thead>\
                            <tr>\
                                <th>Hostname</th>\
                                <th>Port</th>\
                            </tr>\
                        </thead>\
                        <tr>\
                            <td>'+instance.Endpoint.Address+'</td>\
                            <td>'+instance.Endpoint.Port+'</td>\
                        </tr>\
                    </table>\
                    <br/>';

                if (instance.DBSecurityGroups != undefined &&
                    instance.DBSecurityGroups.DBSecurityGroup != undefined) {
                    viewdetails += '\
                        <h4>Security Groups</h4>\
                        <table class="table table-bordered">\
                            <thead>\
                                <tr>\
                                    <th>Group Name</th>\
                                    <th>Status</th>\
                                </tr>\
                            </thead>';


                    _(instance.DBSecurityGroups.DBSecurityGroup).each(function(sg) {
                        viewdetails += '<tr>';
                        viewdetails += '<td>'+sg.DBSecurityGroupName +'</td>';
                        viewdetails += '<td>'+sg.Status +'</td>';
                        viewdetails += '</tr>';
                    });

                    viewdetails += '</table>';
                }

                viewdetails += '<br>\
                            <h4>Raw Data</h4>\
                            <pre class="prettyprint">'+JSON.stringify(instance)+'</pre>\
                        </p>\
                        </div>\
                    </div>';

                var instance_row = '\
                    <td>'+instance.id+'</td>\
                    <td>'+instance.MasterUsername+'</td>\
                    <td>'+instance.MultiAZ+'</td>\
                    <td>'+instance.AvailabilityZone+'</td>\
                    <td>'+instance.DBInstanceClass+'</td>\
                    <td>'+instance.DBInstanceStatus+'</td>\
                    <td>'+instance.AllocatedStorage+'</td>\
                    <td>'+instance.Engine+'</td>\
                    <td>'+instance.InstanceCreateTime+'</td>\
                    <td>'+viewdetails+'</td>';

                $('#ec2_listing_simple', this.el).append("<tr>"+instance_row+"</tr>");
            });

            $("#main_container").append('</table>');

            $.extend( $.fn.dataTableExt.oStdClasses, {
                "sWrapper": "dataTables_wrapper form-inline"
            } );

            $('.table-pageable').dataTable( {
                //"sDom": "<'row'<'span2'l><'span10'f>r>t<'row'<'span6'i><'span6'p>>"
            } );

        }});
    },

    costChart: function(service, timespan) {
        console.log("service:"+service);
        console.log(timespan);
        var graph_box = '<div id="graph_daily_cost" style="min-width: 80%; height: 700px; max-height:90%; padding: 0px; margin-left: 30px"><svg></svg></div>';
        $('#main_container').append(graph_box);
        var hourly_breakdown = false;

        if (timespan == "alltime") {
            var cost_query = "ec2_rds/days/"+9999;
        } else if (timespan == "monthly") {
            var cost_query = "ec2_rds/days/"+30;
        } else if (timespan == "current") {
            var cost_query = "ec2_rds/hours/"+24;
            hourly_breakdown = true;
        } else if (timespan == "hourly") {
            var cost_query = "ec2_rds/hours/"+72;
            hourly_breakdown = true;
        } 

        $.getJSON('/dashboard/stats/costs/'+cost_query, function(tsv) {
            appCore.alertLoadingDone();

            var service_costs = [];
    
            tsv = tsv['cost']['daily_det']

            _(tsv[service]).each(function(cost, ts) {
                service_costs.push({x: ts, y: parseFloat(cost)});
            })

            if (service == "rds") {
                var color = "orange";
            } else if (service == "ec2") {
                var color = "lightblue";
            }

            var options = [ { key: service, color: color, values: service_costs } ];

            nv.addGraph(function() {
                var chart = nv.models.lineWithFocusChart();

                if (hourly_breakdown) {
                    chart.xAxis
                          .axisLabel('Date (month/day)')
                          .showMaxMin(false)
                          .tickFormat(function(d) { return d3.time.format.utc('%m/%d %I%p')(new Date(d*1000)) });
                    chart.x2Axis
                          .axisLabel('Date (month/day)')
                          .showMaxMin(false)
                          .tickFormat(function(d) { return d3.time.format.utc('%m/%d %I%p')(new Date(d*1000)) });
                } else {
                    chart.xAxis
                          .axisLabel('Date (month/day)')
                          .showMaxMin(false)
                          .tickFormat(function(d) { return d3.time.format.utc('%m/%d')(new Date(d*1000)) });
                    chart.x2Axis
                          .axisLabel('Date (month/day)')
                          .showMaxMin(false)
                          .tickFormat(function(d) { return d3.time.format.utc('%m/%d')(new Date(d*1000)) });

                }

                chart.yAxis
                      .axisLabel('Cost ($)')
                      .tickFormat(function(d) { return '$' + d3.format(',.2f')(d) });
                chart.y2Axis
                      .axisLabel('Cost ($)')
                      .tickFormat(function(d) { return '$' + d3.format(',.2f')(d) });
             
                 d3.select('#graph_daily_cost svg').datum(options).transition().duration(100).call(chart);
             
                 ///v.utils.windowResize(chart.update);
             
                 return chart;
             });
        });

    },

    pricingTable: function(service, timespan) {
        var pricingTable = new ServicePricingTableCollection({service: service, timespan: timespan });

        pricingTable.fetch({success: function(err, data){
            appCore.alertLoadingDone();

            var header = '<table class="table table-bordered table-condensed " id="ec2_pricing_table"><thead><th>Type ID</th><th>Name</th><th>Cores</th><th>Compute</th><th>RAM</th><th>IO Level</th><th>IStorage</th>';

            if (timespan == "ondemand") {
                header += '<th>On-Demand</th>';
            } else if (timespan == "reserved") {
                header += '<th>Reserved</th>';
            } else if (timespan == "spot") {
                header += '<th>Spot</th>';
            } else if (timespan == "all") {
                header += '<th>On-Demand</th><th>Reserved</th><th style="width: 20%">Spot</th>';
            } 

            header += '</thead>';

            $("#main_container").append(header);

            _(data.data).each(function(instance) {
                var r = '<tr>';
                r += '<td>'+instance.type+'</td>';
//                r += '<td>'+instance.group+'</td>';
                r += '<td>'+instance.name+'</td>';
                r += '<td>'+instance.cores+'</td>';
                r += '<td>'+instance.compute+'</td>';
                r += '<td>'+instance.ram+'</td>';
                r += '<td>'+instance.io+'</td>';
                r += '<td>'+instance.instanceStorage+'</td>';

                if (timespan == "ondemand") {
                    r += '<td>$'+data.prices[instance.type]['ondemand'].toFixed(3)+'</td>';
                } else if (timespan == "reserved") {
                    console.log(data.prices[instance.type]['reserved']);
                    r += '<td>1yr: $'+data.prices[instance.type]['reserved']['1']['upfront'].toFixed(0)+' & $'+data.prices[instance.type]['reserved']['1']['hourly'].toFixed(3)+'/hour or 3yr: $'+data.prices[instance.type]['reserved']['3']['upfront'].toFixed(0)+' & $'+data.prices[instance.type]['reserved']['3']['hourly'].toFixed(3)+'/hour</td>';
                } else if (timespan == "spot") {
                    if (data.prices[instance.type]['spot']['avg'] == 0 ||
                        data.prices[instance.type]['spot']['avg'] == undefined ||
                        instance.spotAvailable == 0) {
                        r += '<td></td>';
                    } else {
                        r += '<td>$'+data.prices[instance.type]['spot']['avg'].toFixed(3)+'</td>';
                    }

                } else if (timespan == "all") {
                    r += '<td>$'+data.prices[instance.type]['ondemand'].toFixed(3)+'</td>';

                    var oneyr = parseFloat(data.prices[instance.type]['reserved']['1']['upfront']) / 8766 + parseFloat(data.prices[instance.type]['reserved']['1']['hourly'])
                    var threeyr = parseFloat(data.prices[instance.type]['reserved']['3']['upfront']) / 8766 + parseFloat(data.prices[instance.type]['reserved']['3']['hourly'])
                    r += '<td>1yr: $'+oneyr.toFixed(3)+' or 3yr: $'+threeyr.toFixed(3)+'</td>';

                    if (data.prices[instance.type]['spot']['avg'] == 0 ||
                        data.prices[instance.type]['spot']['avg'] == undefined ||
                        instance.spotAvailable == 0) {
                        r += '<td>n/a</td>';
                    } else {
                        r += '<td>$'+data.prices[instance.type]['spot']['avg'].toFixed(3)+' [$'+data.prices[instance.type]['spot']['min'].toFixed(3)+'-$'+data.prices[instance.type]['spot']['max'].toFixed(3)+']</td>';
                    }

                } 

                r += '</tr>';

                $('#ec2_pricing_table', this.el).append(r);
            })

            $("#main_container").append('</table>');
/*
            $.extend( $.fn.dataTableExt.oStdClasses, {
                "sWrapper": "dataTables_wrapper form-inline"
            } );

            $('.table-pageable').dataTable( {
                //"sDom": "<'row'<'span2'l><'span10'f>r>t<'row'<'span6'i><'span6'p>>"
            } );
*/
        }});
    },
    
    test2: function() {
        return "b";
    },
    
};

var AppRouter = Backbone.Router.extend({

    routes: {
        // public site
        ""                                          : "welcome",
        "index"                                     : "welcome",
        "features"                                  : "features",
        "pricing"                                   : "pricing",
        "login"                                     : "login",
        "signup"                                    : "signup",
        "about"                                     : "about",
        "cloudcost"                                 : "public_cloud_cost",
        //in dashboard, logged in
        "dashboard"                                 : "dashboard",
        "dashboard/activity"                        : "dashboard_activity",
        "dashboard/ec2/DescribePlacementGroups"     : "ec2_DescribePlacementGroups",
        "dashboard/ec2/instances"                   : "ec2_instances_list",
        "dashboard/ec2/instances/historic"          : "ec2_instances_list_all",
        "dashboard/rds/instances"                   : "rds_instances_list",
        "dashboard/rds/instances/historic"          : "rds_instances_list_all",
        "dashboard/:service/types/:timespan"        : "instance_cost_table_view",
        "dashboard/:service/costs/:timespan"        : "instance_cost_view",
        "dashboard/stack/lookinglass"               : "stack_lookinglass",
        "cloudformation"                            : "cloudformation_list",
        "cloudformation/page/:page"                 : "cloudformation_list",
        "cloudformation/add"                        : "cloudformation_add",
        "cloudformation/:id"                        : "cloudformation_details",
    },

    initialize: function () {
        $('#page_loading_spinner').hide();
        $('#page_footer').show();
    },

    welcome: function () {
        appCore.pubPage('welcome');
    },

    pricing: function () {
        appCore.pubPage('pricing');
    },

    features: function () {
        appCore.pubPage('features');
    },

    signup: function () {
        appCore.pubPage('signup');
    },

    login: function () {
        appCore.pubPage('login');
    },

    dashboard: function (id) {
        appCore.dashboardLoadCSS();        
        appCore.dashboardNavFooter();

        appCore.alertLoadingProgress();
        var dashboardStats = new DashboardStats();
        dashboardStats.fetch({success: function(err, data){
            appCore.alertLoadingDone();

            $('#dashboard-stats #ec2').html(data.summary.ec2);
            $('#dashboard-stats #rds').html(data.summary.rds);

            $('#dashboard-stats #ts_ls').html(data.ts_ls_h);
            $('#dashboard-stats #actions_count').html(_.size(data.activity));

            $('#activity-timeline').html(' ');
            
            buildDashboardDCB();
             
            function buildDashboardDCB() {
                $.getJSON('/dashboard/stats/costs/30', function(tsv) {
                    var all_costs = [],
                        ec2_costs = [],
                        rds_costs = [];
            
                    tsv = tsv['cost']['daily_det']

                    var min = 1999999999, 
                        max = 0;
                    _(tsv['total']).each(function(cost, ts) {
                        if (ts < min) 
                            min = ts;
                        if (ts > max)
                            max = ts
                    })
                    _(tsv['ec2']).each(function(cost, ts) {
                        if (ts < min) 
                            min = ts;
                        if (ts > max)
                            max = ts
                    })
                    _(tsv['rds']).each(function(cost, ts) {
                        if (ts < min) 
                            min = ts;
                        if (ts > max)
                            max = ts
                    })

                    for (var i = parseInt(min); i<= parseInt(max); i+=86400) {
                        var rds_cost = parseFloat(0),
                            ec2_cost = parseFloat(0);
                        
                        if (tsv['rds'][i] == undefined) {
                            rds_costs.push({x: i, y: 0});
                        } else {
                            rds_costs.push({x: i, y: parseFloat(tsv['rds'][i])});
                            rds_cost = parseFloat(tsv['rds'][i]);
                        }

                        if (tsv['ec2'][i] == undefined) {
                            ec2_costs.push({x: i, y: 0});
                        } else {
                            ec2_costs.push({x: i, y: parseFloat(tsv['ec2'][i])});
                            ec2_cost = parseFloat(tsv['ec2'][i]);
                        }
                        
                        if (tsv['total'][i] == undefined) {
                            all_costs.push({x: i, y: 0});
                        } else {
                            all_costs.push({x: i, y: Math.abs(ec2_cost + rds_cost) });
                        }
                        
                    }

                    var options = [ { key: "RDS", color: "orange", values: rds_costs },
                                { key: "EC2", color: "lightblue", values: ec2_costs },
                                { key: "Total", color: "green", values: all_costs }
                                ];

                    nv.addGraph(function() {
                        var chart = nv.models.lineWithFocusChart();

                        chart.xAxis
                              .axisLabel('Date (month/day)')
                              .showMaxMin(false)
                              .tickFormat(function(d) { return d3.time.format.utc('%m/%d')(new Date(d*1000)) });
                        chart.x2Axis
                              .axisLabel('Date (month/day)')
                              .showMaxMin(false)
                              .tickFormat(function(d) { return d3.time.format.utc('%m/%d')(new Date(d*1000)) });

                        chart.yAxis
                              .axisLabel('Cost ($)')
                              .tickFormat(function(d) { return '$' + d3.format(',.2f')(d) });
                        chart.y2Axis
                              .axisLabel('Cost ($)')
                              .tickFormat(function(d) { return '$' + d3.format(',.2f')(d) });
                     
                         d3.select('#graph_daily_cost svg').datum(options).transition().duration(100).call(chart);
                     
                         ///v.utils.windowResize(chart.update);
                     
                         return chart;
                     });
                });

                $('#dashboard-stats').fadeIn();
                $('#dashboard_stats .widget-content').fadeIn();

             }

            _(data.activity).each(function(activity, rid) {
                if (activity.updated !== null) {
                    var timespan = activity.launched_h + " to " + activity.updated_h;
                } else {
                    var timespan = activity.launched_h;
                }          

                if (activity.state == "48") {
                    var color_message = "alert-error"
                } else if (activity.state == "16") {
                    var color_message = "alert-info"
                } else {
                    var color_message = "alert-warn"
                }
                var c = '<div class="new-update clearfix '+color_message+'">\
                    <span class="update-alert">\
                      <strong>'+activity.lifecycle+' '+activity.id+'</strong>\
                      <span class="activity-details">'+timespan+'</span>\
                    </span><span class="update-date"><span class="update-day">'+activity.state_msg+'</span>code: '+activity.state+'</span>\
                  </div>';

                $('#activity-timeline').append(c);

            });

            $('#page_loading_spinner').hide();
            $('#dashboard_timeline .widget-content').fadeIn();

        }});


        var dashboardCostStats = new DashboardCostStats([], {service: "ec2_rds", frequency: "days", count: 5});
        dashboardCostStats.fetch({success: function(err, data){
            var today = moment().utc().startOf('day').unix();

            $('#cost_day').html('$'+data.cost.day.toFixed(2));
            if (data.cost.daily_det.ec2[today] !== undefined)
                $('#ec2_cost').html('$'+Math.ceil(data.cost.daily_det.ec2[today]));

            if (data.cost.daily_det.rds[today] !== undefined)
                $('#rds_cost').html('$'+Math.ceil(data.cost.daily_det.rds[today]));

            $('#cost_dayp').html('$'+data.cost.dayp.toFixed(2));
            $('#cost_month').html('$'+data.cost.month.toFixed(2));
            $('#cost_monthp').html('$'+data.cost.monthp.toFixed(2));

            var daily_ec2_costs = [],
                daily_rds_costs = []

            _(data.cost.daily_det.ec2).each(function(p, ts) {
                daily_ec2_costs.push(p.toFixed(2))
            })

            $(".stat-boxes.ec2 .line_graph").sparkline( daily_ec2_costs , {
                type: "line",
                fillColor: "lightblue",
                lineColor: "#459D1C",
                strokeWidth: 1,
                delimeter: ",",
                height: 54,
                max: null,
                min: 0,
                width: 90
            }); 

            _(data.cost.daily_det.rds).each(function(p, ts) {
                daily_rds_costs.push(p.toFixed(2))
            })
            
            $(".stat-boxes.rds .line_graph").sparkline( daily_rds_costs, {
                type: "line",
                fillColor: "orange",
                lineColor: "#459D1C",
                strokeWidth: 1,
                delimeter: ",",
                height: 54,
                max: null,
                min: 0,
                width: 90
            }); 

            $('#dashboard_cost .widget-content').fadeIn();
        }});

        var dashboardGraphSummary = new DashboardGraphSummary([], { service: "ec2", level: "summary"});
        dashboardGraphSummary.fetch({success: function(err, values){
            console.log("dashboardGraphSummary ec2");
            console.log(values);

            $(".stat-boxes.ec2 .bar_graph").sparkline(values, {
                type: "bar",
                barColor: "lightblue",
                barWidth: "20",
                zeroAxis: true,
                height: 54,
                width: 90
            });
        }});

        var dashboardGraphSummaryRDS = new DashboardGraphSummary([], { service: "rds", level: "summary"});
        dashboardGraphSummaryRDS.fetch({success: function(err, values){
            console.log("dashboardGraphSummary rds");
            console.log(values);

            $(".stat-boxes.rds .bar_graph").sparkline(values, {
                type: "bar",
                barColor: "orange",
                barWidth: "20",
                zeroAxis: true,
                height: 54,
                width: 90
            });
        }});

        this.headerView = new HeaderView();
        $('#main_nav_container').html(this.headerView.el);

        if (!this.homeView) {
            this.homeView = new HomeView();
        }

        $('#main_container').html(this.homeView.el);
    },

    dashboard_activity: function() {
        appCore.dashboardLoadCSS();        
        appCore.dashboardNavFooter();

        appCore.alertLoadingProgress();
        
        this.DashboardActivityView = new DashboardActivityView();
        $('#main_container').append(this.DashboardActivityView.el);
        var dashboardActivity = new DashboardActivity([], {limit: "all"});
        dashboardActivity.fetch({success: function(err, data){
            appCore.alertLoadingDone();
            $('#dashboard-activity').show()

            var data = data,
                activity_list = "";

            _(data).each(function(activity_group, rt) {
                _(activity_group).each(function(activity, rid) {
                    activity_list += "<tr>";
                    activity_list += "<td>"+rt+"</td>";
                    activity_list += "<td>"+activity.id+"</td>";
                    activity_list += "<td>"+activity.lifecycle+"</td>";
                    activity_list += "<td>"+activity.launched_h+"</td>";
                    if (activity.updated_h == null) {
                        activity_list += "<td>"+activity.launched_h+"</td>";
                    } else {
                        activity_list += "<td>"+activity.updated_h+"</td>";
                    }
                    
                    if (activity.state != null) {
                        activity_list += "<td>"+activity.state_msg+" ("+activity.state+")"+"</td>";
                    } else {
                        activity_list += "<td>"+activity.state_msg+"</td>";
                    }

                    activity_list += "</tr>";
                });
            });
            
            $('#activity_list').append(activity_list);

            $('.table-pageable').dataTable( { } );

        }});

    },

    ec2_instances_list_all: function() {
        appCore.dashboardLoadCSS();        
        appCore.dashboardNavFooter();
        appCore.alertLoadingProgress();
        
        appCore.ec2_instances_list('all');
    },

    ec2_instances_list: function() {
        appCore.dashboardLoadCSS();        
        appCore.dashboardNavFooter();
        appCore.alertLoadingProgress();

        appCore.ec2_instances_list('active');
    },

    ec2_DescribePlacementGroups: function() {
        var ec2InstanceList = new EC2Collection();
    },

    rds_instances_list_all: function() {
        appCore.dashboardLoadCSS();        
        appCore.dashboardNavFooter();
        appCore.alertLoadingProgress();
        
        appCore.rds_instances_list('all');
    },

    rds_instances_list: function() {
        appCore.dashboardLoadCSS();        
        appCore.dashboardNavFooter();
        appCore.alertLoadingProgress();

        appCore.rds_instances_list('active');

/*
        var RDSInstanceList = new RDSCollection();
        RDSInstanceList.fetch({success: function(){
            appCore.alertLoadingDone();
            
            $.extend( $.fn.dataTableExt.oStdClasses, {
                "sWrapper": "dataTables_wrapper form-inline"
            } );

            console.log(RDSInstanceList);
            $("#main_container").append(new RDSInstancesLGView({model: RDSInstanceList, mode: "fat"}).el);

            $('.table-pageable').dataTable( {
                //"sDom": "<'row'<'span2'l><'span10'f>r>t<'row'<'span6'i><'span6'p>>"
            } );

        }});
*/
    },

    instance_cost_view: function(service, timespan) {
        appCore.dashboardLoadCSS();        
        appCore.dashboardNavFooter();

        appCore.alertLoadingProgress();
        appCore.costChart(service, timespan);
    },

    public_cloud_cost: function(service, timespan) {
        appCore.pubPage('public_cloud_cost');
    },

    instance_cost_table_view: function(service, timespan) {
        appCore.dashboardLoadCSS();        
        appCore.dashboardNavFooter();

        appCore.alertLoadingProgress();
        appCore.pricingTable(service, timespan);
    },

    stack_lookinglass: function() {
        appCore.dashboardLoadCSS();        
        appCore.dashboardNavFooter();

        appCore.alertLoadingProgress();
        var StackInstanceList = new StackCollection();
        StackInstanceList.fetch({success: function(){
            appCore.alertLoadingDone();
            
            $.extend( $.fn.dataTableExt.oStdClasses, {
                "sWrapper": "dataTables_wrapper form-inline"
            } );

            $("#main_container").append(new StackInstancesLGView({model: StackInstanceList, mode: "fat"}).el);

            $('.table-pageable').dataTable( {
                //"sDom": "<'row'<'span2'l><'span10'f>r>t<'row'<'span6'i><'span6'p>>"
            } );

        }});


        //this.headerView.selectMenuItem('home-menu');
    }
});

utils.loadTemplate(['HomeView', 'DashboardActivityView', 'HeaderView', 'AboutView', 'WelcomeView', 'LoginView', 'SigninView', 'PricingView', 'FeaturesView', 'PubNavView', 'ec2InstancesLGView', 'ec2InstancesLGInstanceView', 'RDSInstancesLGView', 'RDSInstancesLGInstanceView', 'StackInstancesLGView', 'StackInstancesLGInstanceView'], function() {
    app = new AppRouter();
    Backbone.history.start({pushState: false});
});
