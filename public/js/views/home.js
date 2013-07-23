window.HomeView = Backbone.View.extend({

    initialize:function () {
        this.render();
    },

    render:function () {
        $(this.el).html(this.template());
        return this;
    },

    selectMenuItem: function (menuItem) {
        $('ul[id=home-nav-bar] li').removeClass('active');
        $('ul[id=home-nav-bar] li[id="'+menuItem+'-nav"]').addClass('active');
    }


});

window.DashboardActivityView = Backbone.View.extend({

    initialize:function () {
        this.render();
    },

    render:function () {
        $(this.el).html(this.template());
        return this;
    },

});



window.AppView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template());
        return this;
    },

    selectMenuItem: function (menuItem) {
        $('ul[id=home-nav-bar] li').removeClass('active');
        $('ul[id=home-nav-bar] li[id="'+menuItem+'-nav"]').addClass('active');
    }

});

window.WelcomeView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template());
        return this;
    },

    selectMenuItem: function (menuItem) {
        $('ul[id=home-nav-bar] li').removeClass('active');
        $('ul[id=home-nav-bar] li[id="'+menuItem+'-nav"]').addClass('active');
    }

});

window.LoginView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    events: {
        "click #login-check"   : "checkLoginCredentials",
    },

    render: function () {
        $(this.el).html(this.template());
        return this;
    },

    selectMenuItem: function (menuItem) {
        $('ul[id=home-nav-bar] li').removeClass('active');
        $('ul[id=home-nav-bar] li[id="'+menuItem+'-nav"]').addClass('active');
    },

    checkLoginCredentials: function() {
        console.log('checking');

        var self = this;
        this.model.attributes.username = $('#login-email').val();
        this.model.attributes.password = $('#login-password').val();

        this.model.save(null, {
            success: function (model) {
                if (model.attributes.success == 1) {
                    utils.showAlert('Success!', 'Taking you to the dashboard now!', 'alert-success');
                    app.navigate('#dashboard', true);
                } else {
                    utils.showAlert('Error', 'Invalid username and password combination, please try again!', 'alert-error');
                }

//                
            },
            error: function () {
                utils.showAlert('Error', 'Invalid username and password combination, please try again!', 'alert-error');
            }
        });


    }
});


window.SigninView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template());
        return this;
    },

    selectMenuItem: function (menuItem) {
        $('ul[id=home-nav-bar] li').removeClass('active');
        $('ul[id=home-nav-bar] li[id="'+menuItem+'-nav"]').addClass('active');
    }

});


window.PricingView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template());
        return this;
    },

    selectMenuItem: function (menuItem) {
        $('ul[id=home-nav-bar] li').removeClass('active');
        $('ul[id=home-nav-bar] li[id="'+menuItem+'-nav"]').addClass('active');
    }

});

window.FeaturesView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template());
        return this;
    },

    selectMenuItem: function (menuItem) {
        $('ul[id=home-nav-bar] li').removeClass('active');
        $('ul[id=home-nav-bar] li[id="'+menuItem+'-nav"]').addClass('active');
    }

});
