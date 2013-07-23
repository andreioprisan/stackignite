window.WelcomeView = Backbone.Model.extend({
    urlRoot: "/",

});

window.Dashboard_m = Backbone.AssociatedModel.extend({
    urlRoot: "/dashboard",
    idAttribute: "_id",
    initialize: function () {
    },

    defaults: {
        _id: null,
    }
});

window.DashboardActivityView = Backbone.Model.extend({
    urlRoot: "/dashboard/activity",
});


window.Login = Backbone.Model.extend({
    urlRoot: "/login",
    idAttribute: "_id",
    defaults: {
        _id: null,
        email: "",
        password: "",
    }
});

window.LoginCollection = Backbone.Collection.extend({
    model: Login,
    url: "/login"
});


window.Cloudformation = Backbone.Model.extend({

    urlRoot: "/cloudformation",

    idAttribute: "_id",

    initialize: function () {
        this.validators = {};

        this.validators.name = function (value) {
            return value.length > 0 ? {isValid: true} : {isValid: false, message: "You must enter a name"};
        };

        this.validators.grapes = function (value) {
            return value.length > 0 ? {isValid: true} : {isValid: false, message: "You must enter a grape variety"};
        };

        this.validators.country = function (value) {
            return value.length > 0 ? {isValid: true} : {isValid: false, message: "You must enter a country"};
        };
    },

    validateItem: function (key) {
        return (this.validators[key]) ? this.validators[key](this.get(key)) : {isValid: true};
    },

    // TODO: Implement Backbone's standard validate() method instead.
    validateAll: function () {

        var messages = {};

        for (var key in this.validators) {
            if(this.validators.hasOwnProperty(key)) {
                var check = this.validators[key](this.get(key));
                if (check.isValid === false) {
                    messages[key] = check.message;
                }
            }
        }

        return _.size(messages) > 0 ? {isValid: false, messages: messages} : {isValid: true};
    },

    defaults: {
        _id: null
    }
});

window.CloudformationCollection = Backbone.Collection.extend({

    model: Cloudformation,

    url: "/cloudformation"

});

window.EC2_m = Backbone.AssociatedModel.extend({

    urlRoot: "/ec2",

    idAttribute: "_id",

    initialize: function () {
        if (this.attributes.instancesSet &&
            this.attributes.instancesSet.item &&
            this.attributes.instancesSet.item.tagSet &&
            this.attributes.instancesSet.item.tagSet.length != 0 &&
            this.attributes.instancesSet.item.tagSet.item.length != 0) {
            var name = "",
                client = "",
                env = "",
                project = "",
                func = "";

            _(this.attributes.instancesSet.item.tagSet.item).each(function(a) 
            { 
                if (a['key'] == "Name") { 
                    name = a['value']; 
                } else if (a['key'] == "Client") { 
                    client = a['value']; 
                } else if (a['key'] == "Environment") { 
                    env = a['value']; 
                } else if (a['key'] == "Project") { 
                    project = a['value']; 
                } else if (a['key'] == "Function") { 
                    func = a['value']; 
                } 

            })

            this.set({
                identifying: {
                    name: name,
                    client: client,
                    env: env,
                    project: project,
                    func: func,
                }
            });
            
        }
        
    },

    defaults: {
        _id: null,
        identifying: {
            name: null,
            client: null,
            env: null,
            func: null,
            project: null,
        }
    }
});

window.DashboardStats = Backbone.Collection.extend({
    model: Dashboard_m,
    url: "/dashboard/stats",
    initialize: function () {
    }
});


window.DashboardActivity = Backbone.Collection.extend({
    initialize: function(models, options) {
        this.url = "/dashboard/activity/" + options.limit;
      },
    model: Dashboard_m,
});

window.DashboardCostStats = Backbone.Collection.extend({
    initialize: function(models, options) {
        this.url = "/dashboard/stats/costs/" + options.service + "/" + options.frequency + "/" + options.count;
      },
    model: Dashboard_m,
});


window.DGS_m = Backbone.AssociatedModel.extend({

    urlRoot: "/dashboard/stats/graphs",

    idAttribute: "_id",

    initialize: function () {
    },

    defaults: {
        _id: null,
    }
});


window.DashboardGraphSummary = Backbone.Collection.extend({
    initialize: function(models, options) {
        this.url = "/dashboard/stats/graphs/service/" + options.service + "/level/" + options.level;
      },
    model: DGS_m,
});

window.EC2Collection = Backbone.Collection.extend({

    model: EC2_m,

    initialize: function (model, options) {
        if (model != undefined &&
            model.timespan != undefined) {
            this.url = "/dashboard/find/instances/ec2/"+model.timespan;
        } else {
            this.url = "/dashboard/find/instances/ec2/";            
        }
    }

});


window.RDS_m = Backbone.AssociatedModel.extend({

    urlRoot: "/rds",

    initialize: function () {

        if (this.attributes.tagSet &&
            this.attributes.tagSet.length != 0) {
            var name = "",
                client = "",
                env = "",
                project = "",
                func = "db";

            _(_.flatten(this.attributes.tagSet)).each(function(a) 
            { 
                if (a.Key == "Client") { 
                    client = a.Value; 
                } else if (a.Key == "Environment") { 
                    env = a.Value; 
                } else if (a.Key == "Project") { 
                    project = a.Value; 
                } else if (a.Key == "Function") { 
                    func = a.Value; 
                } 

            })

            this.set({
                identifying: {
                    name: this.attributes.DBInstanceIdentifier,
                    client: client,
                    env: env,
                    project: project,
                    func: func,
                }
            });            
        }
    },

    defaults: {
        identifying: {
            name: null,
            client: null,
            env: null,
            func: null,
            project: null,
        }
    }
});

window.RDSCollection = Backbone.Collection.extend({

    model: RDS_m,

    initialize: function (model, options) {
        if (model != undefined &&
            model.timespan != undefined) {
            this.url = "/dashboard/find/instances/rds/"+model.timespan;
        } else {
            this.url = "/dashboard/find/instances/rds/";            
        }
    }

});


window.Stack_m = Backbone.AssociatedModel.extend({
    urlRoot: "/stack",

    idAttribute: "_id",

    relations: [
                {
                    type: Backbone.Many,
                    key: 'ec2',
                    relatedModel: EC2_m
                },
                {
                    type:Backbone.Many,
                    key:'rds',
                    relatedModel: RDS_m
                },
               ],

    initialize: function () {
        // technically nothing to do here
    },

    defaults: {
        ec2: [],
        rds: []
    }
});

window.StackCollection = Backbone.Collection.extend({

    model: Stack_m,

    url: "/stack/lookinglass",

    initialize: function () {
        console.log('aws api call to /stack/lookinglass');
    }

});


window.ServicePricingTableCollection = Backbone.Collection.extend({

    model: RDS_m,

    initialize: function (service, timespan) {
        if (service != undefined &&
            timespan != undefined) {
            this.url = "/dashboard/"+service+"/types/"+timespan;
        } else {
            this.url = "/dashboard/ec2/types/ondemand";            
        }
    }

});
