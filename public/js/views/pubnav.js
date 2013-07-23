window.PubNavView = Backbone.View.extend({

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
