var schools = [
    {
        name: 'כצנלסון',
        id: 16,
    },{
        name: 'ברנר',
        id: 11,
    },{
        name: 'עמי אסף',
        id: 12,
    }
];

function Schools() {

}

Schools.prototype.listRegistrations = function(season, options, callback){
    callback(null, schools);
};

module.exports = new Schools();