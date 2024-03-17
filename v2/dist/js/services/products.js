define([], function () {
    var Products = new Vue({});
    Products.products = null;

    Products.get = function (callback) {
        var service = this;
        if (service.products == null) {
            Vue.http.get('/api/v2/finance/products')
                .then(
                    function (resp) {
                        service.products = {};
                        for (var i = 0; i < resp.body.length; i++) {
                            var product = resp.body[i];
                            service.products[product.id] = product;
                        }
                        callback(null, service.products);
                    },
                    function (err) {
                        callback(err);
                    }
                );
        }
        else {
            callback(null, service.products);
        }
    };

    Products.getById = function (id, callback) {
        this.get(function (err, products) {
            if (err) {
                callback(err);
            }
            else {
                callback(null, products[id]);
            }
        });
    };

    return Products;
});