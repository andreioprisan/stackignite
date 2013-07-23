window.StackInstancesLGView = Backbone.View.extend({
    preloading: function () {
        $(this.el).html(this.template());
    },

    initialize: function () {
        this.render();
    },

    render: function () {
        var instances = this.model.models,
            ec2_instances = this.model.models[0].attributes.ec2.models,
            rds_instances = this.model.models[0].attributes.rds.models,
            mode = this.mode,
            ec2_len = ec2_instances.length,
            rds_len = rds_instances.length,
            sidebar = "",
            main_content = "",
            grouping = 
                {   '_all':         [], 
                    '_not_tagged':  [] },
            stats = {   
                        'total': {
                            clients:    0,
                            projects:   0 },
                        'ec2': {
                            instances:  0 },
                        'rds': {
                            instances:  0 },
                    };

        if (ec2_len > 0) {
            _(ec2_instances).each(function(a) {
                stats.ec2.instances += 1;
                if (a.attributes.identifying.client !== null &&
                    a.attributes.identifying.client != "") {
                    if (grouping[a.attributes.identifying.client] == undefined) {
                        grouping[a.attributes.identifying.client] = {};
                    }
                    if (a.attributes.identifying.project !== null &&
                        a.attributes.identifying.project != "") {

                        if (grouping[a.attributes.identifying.client][a.attributes.identifying.project] == undefined) {
                            grouping[a.attributes.identifying.client][a.attributes.identifying.project] = {};
                        }

                        if (a.attributes.identifying.env !== null &&
                            a.attributes.identifying.env != "") {
                                if (grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env] == undefined) {
                                    grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env] = {};
                                }

                                if (a.attributes.identifying.func !== null &&
                                    a.attributes.identifying.func != "") {

                                        if (grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env][a.attributes.identifying.func] == undefined) {
                                            grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env][a.attributes.identifying.func] = [];
                                        }

                                        if (a.attributes.instancesSet.item != undefined) {
                                            grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env][a.attributes.identifying.func].push([ a.attributes.instancesSet.item.instanceId ]);
                                        }

                                } else {
                                    if (grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env]['_not_tagged'] == undefined) {
                                        grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env]['_not_tagged'] = [];
                                    }
                                    grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env]['_not_tagged'].push([ a.attributes.instancesSet.item.instanceId ]);

                                }
                        } else {
                            if (grouping[a.attributes.identifying.client][a.attributes.identifying.project]['_not_tagged'] == undefined) {
                                grouping[a.attributes.identifying.client][a.attributes.identifying.project]['_not_tagged'] = [];
                            }
                            grouping[a.attributes.identifying.client][a.attributes.identifying.project]['_not_tagged'].push([ a.attributes.instancesSet.item.instanceId ]);
                        }
                    } else {
                        if (grouping[a.attributes.identifying.client]['_not_tagged'] == undefined) {
                            grouping[a.attributes.identifying.client]['_not_tagged'] = [];
                        }
                        grouping[a.attributes.identifying.client]['_not_tagged'].push([ a.attributes.instancesSet.item.instanceId ]);
                    }
                } else {
                    grouping['_not_tagged'].push([ a.attributes.instancesSet.item.instanceId ]);                    
                }

                grouping['_all'].push(a.attributes.instancesSet.item.instanceId);
            });


            if (rds_len > 0) {
                _(rds_instances).each(function(a) {
                    stats.rds.instances += 1;
                    if (a.attributes.identifying.client !== null &&
                        a.attributes.identifying.client != "") {
                        if (grouping[a.attributes.identifying.client] == undefined) {
                            grouping[a.attributes.identifying.client] = {};
                        }
                        if (a.attributes.identifying.project !== null &&
                            a.attributes.identifying.project != "") {

                            if (grouping[a.attributes.identifying.client][a.attributes.identifying.project] == undefined) {
                                grouping[a.attributes.identifying.client][a.attributes.identifying.project] = {};
                            }

                            if (a.attributes.identifying.env !== null &&
                                a.attributes.identifying.env != "") {
                                    if (grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env] == undefined) {
                                        grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env] = {};
                                    }

                                    if (a.attributes.identifying.func !== null &&
                                        a.attributes.identifying.func != "") {

                                            if (grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env][a.attributes.identifying.func] == undefined) {
                                                grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env][a.attributes.identifying.func] = [];
                                            }

                                            if (a.attributes.DBInstanceIdentifier != undefined) {
                                                grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env][a.attributes.identifying.func].push([ a.attributes.DBInstanceIdentifier ]);
                                            }

                                    } else {
                                        if (grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env]['_not_tagged'] == undefined) {
                                            grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env]['_not_tagged'] = [];
                                        }
                                        grouping[a.attributes.identifying.client][a.attributes.identifying.project][a.attributes.identifying.env]['_not_tagged'].push([ a.attributes.DBInstanceIdentifier ]);

                                    }
                            } else {
                                if (grouping[a.attributes.identifying.client][a.attributes.identifying.project]['_not_tagged'] == undefined) {
                                    grouping[a.attributes.identifying.client][a.attributes.identifying.project]['_not_tagged'] = [];
                                }
                                grouping[a.attributes.identifying.client][a.attributes.identifying.project]['_not_tagged'].push([ a.attributes.DBInstanceIdentifier ]);
                            }
                        } else {
                            if (grouping[a.attributes.identifying.client]['_not_tagged'] == undefined) {
                                grouping[a.attributes.identifying.client]['_not_tagged'] = [];
                            }
                            grouping[a.attributes.identifying.client]['_not_tagged'].push([ a.attributes.DBInstanceIdentifier ]);
                        }
                    } else {
                        grouping['_not_tagged'].push([ a.attributes.DBInstanceIdentifier ]);                    
                    }

                    grouping['_all'].push(a.attributes.DBInstanceIdentifier);
                });
            }

            _(grouping).each(function(a,b) {
                if(!(b == "_all" || b == "_not_tagged")) {
                    sidebar += '<li class="nav-header" style="font-size: 14px; padding: 4px 2px 10px 2px; color: black;">'+b+'</li>';
                    stats.total.clients += 1;

                    _(a).each(function(c,d) {
                        stats.total.projects += 1;

                        sidebar += '<li class=""><a href="#tabs-client-'+b.replace(" ","_")+'-'+d.replace(" ","_")+'" data-toggle="tab">'+d+'</a></li>';

                        main_content += '\
                        <div id="tabs-client-'+b.replace(" ","_")+'-'+d.replace(" ","_")+'" class="tab-pane">\
                            <div class="tabbable">\
                              <ul class="nav nav-tabs">';


                        main_content_sub_table = "";
                        var active_tab_counter = 0;
                        var active_tab = '';
                        _(c).each(function(e,f) {
                            active_tab_counter += 1;
                            if (active_tab_counter == 1) {
                                active_tab = ' active';
                            } else {
                                active_tab = '';
                            }

                            main_content += '<li class="'+active_tab+'"><a href="#tabs-client-'+b.replace(" ","_")+'-'+d.replace(" ","_")+f.replace(" ","_")+'" data-toggle="tab">'+f.replace(" ","_")+'</a></li>';

                            main_content_sub_table += '\
                                <div id="tabs-client-'+b.replace(" ","_")+'-'+d.replace(" ","_")+f.replace(" ","_")+'" class="tab-pane '+active_tab+'">\
                                    <div class="well well-small"><h2>EC2 Instances</h2></div>\
                                    <table class="table table-bordered table-pageable ec2-client-instances-'+b.replace(" ","_")+'-'+d.replace(" ","_")+'-'+f.replace(" ","_")+'">\
                                        <thead><tr><th>Func</th><th>Account</th><th>i-ID</th><th>Name</th><th>Zone</th><th>Type</th><th>R Type</th><th>Arch</th><th>State</th><th>Launched</th><th>Actions</th></tr></thead>\
                                    </table>\
                                    <br>\
                                    <div class="well well-small"><h2>RDS Instances</h2></div>\
                                    <table class="table table-bordered table-pageable rds-client-instances-'+b.replace(" ","_")+'-'+d.replace(" ","_")+'-'+f.replace(" ","_")+'">\
                                        <thead><tr><th>Name</th><th>Account</th><th>Multi-AZ</th><th>Zone</th><th>Type</th><th>State</th><th>Storage</th><th>Engine</th><th>Launched</th><th>Actions</th></tr></thead>\
                                    </table>\
                                </div>';
                        });

                        main_content += '</ul>\
                            </div>\
                            <div class="tab-content">';
                        main_content += main_content_sub_table;

                        main_content += '\
                              </div>\
                            </div>';

                    });
                } else {
                    main_content += '\
                        <div id="tabs-client-'+b+'" class="tab-pane">\
                            <div class="well well-small"><h2>EC2 Instances</h2></div>\
                            <table class="table table-bordered table-pageable ec2-client-instances-'+b+'">\
                                <thead><tr><th>Func</th><th>Account</th><th>i-ID</th><th>Name</th><th>Zone</th><th>Type</th><th>R Type</th><th>Arch</th><th>State</th><th>Launched</th><th>Actions</th></tr></thead>\
                            </table>\
                            <br>\
                            <div class="well well-small"><h2>RDS Instances</h2></div>\
                            <table class="table table-bordered table-pageable rds-client-instances-'+b+'">\
                                <thead><tr><th>Name</th><th>Account</th><th>Multi-AZ</th><th>Zone</th><th>Type</th><th>State</th><th>Storage</th><th>Engine</th><th>Launched</th><th>Actions</th></tr></thead>\
                            </table>\
                        </div>';
                }
            });

            sidebar += '<li class="nav-header" style="font-size: 14px; padding: 4px 2px 10px 2px;">Across Clients</li>';
            sidebar += '<li class=""><a href="#tabs-client-_all" data-toggle="tab">View All</a></li>';
            sidebar += '<li class=""><a href="#tabs-client-_not_tagged" data-toggle="tab">Not Tagged</a></li>';

            $(this.el).append('\
                <div class="tabbable tabs-left">\
                    <ul class="nav nav-tabs span2"> '+sidebar+'</ul>\
                    <div class="tab-content span9">\
                        <div id="tabs-client-_starter" class="tab-pane active">\
                            <div class="hero-unit">\
                                <h2><span id=cv-stats-instances class="badge badge-inverse" style="font-size: 28px;">'+stats.ec2.instances+'</span> EC2 & <span id=cv-stats-instances class="badge badge-inverse" style="font-size: 28px;">'+stats.rds.instances+'</span> RDS instaces for <span id=cv-stats-clients class="badge badge-info" style="font-size: 28px;">'+stats.total.clients+'</span> clients across <span id=cv-stats-projects class="badge badge-success" style="font-size: 28px;">'+stats.total.projects+'</span> projects</h2>\
                                <p><br>All data is live queried.<br>Grouping is automatic based on instance tag information.<br><br>Select a client on the left to get started. </p>\
                            </div>\
                        </div>\
                        '+main_content+'\
                    </div>\
                </div>\
                ');
            
            for (var i = 0; i < ec2_len; i++) {
                $('.ec2-client-instances-_all', this.el).append(new ec2InstancesLGInstanceView({model: ec2_instances[i]}).render().el);

                var full_client_project_name = ec2_instances[i].attributes.identifying.client+"-"+ec2_instances[i].attributes.identifying.project+"-"+ec2_instances[i].attributes.identifying.env
                $('.ec2-client-instances-'+full_client_project_name.replace(" ","_"), this.el).append(new ec2InstancesLGInstanceView({model: ec2_instances[i]}).render().el);

                if (_.indexOf(_.flatten(grouping['_not_tagged']), ec2_instances[i].attributes.instancesSet.item.instanceId) !== -1) {
                    $('.ec2-client-instances-_not_tagged', this.el).append(new ec2InstancesLGInstanceView({model: ec2_instances[i]}).render().el);
                }
            }

            for (var i = 0; i < rds_len; i++) {
                $('.rds-client-instances-_all', this.el).append(new RDSInstancesLGInstanceView({model: rds_instances[i]}).render().el);

                var full_client_project_name = rds_instances[i].attributes.identifying.client+"-"+rds_instances[i].attributes.identifying.project+"-"+rds_instances[i].attributes.identifying.env
                $('.rds-client-instances-'+full_client_project_name.replace(" ","_"), this.el).append(new RDSInstancesLGInstanceView({model: rds_instances[i]}).render().el);

                if (_.indexOf(_.flatten(grouping['_not_tagged']), rds_instances[i].attributes.DBInstanceIdentifier) !== -1) {
                    $('.rds-client-instances-_not_tagged', this.el).append(new RDSInstancesLGInstanceView({model: rds_instances[i]}).render().el);
                }
            }

        }

        return this;
    }
});

window.StackInstancesLGInstanceView = Backbone.View.extend({

    tagName: "tr",

    initialize: function () {
        this.model.bind("change", this.render, this);
        this.model.bind("destroy", this.close, this);
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    }

});
