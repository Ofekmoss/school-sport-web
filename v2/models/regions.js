
function Regions(db) {
    this.db = db;
}

Regions.prototype.list = function (callback) {
    this.db.connect()
        .then(
            function (connection) {
                connection.request(
                    "select REGION_ID as \"Region\", REGION_NAME as \"Name\" " +
                    "from REGIONS where DATE_DELETED is null order by REGION_NAME")
                    .then(
                        function (records) {
                            connection.complete();

                            var result = records.map(function (x) {
                                return {
                                    id: x.Region,
                                    name: x.Name
                                }
                            });

                            callback(null, result);
                        },
                        function (err) {
                            connection.complete();
                            callback(err);
                        });
            },
            function (err) {
                callback(err);
            }
        );
};


module.exports = new Regions(require('./db'));