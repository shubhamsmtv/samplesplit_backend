const Sequelize = require('sequelize');
const sequelize = new Sequelize('samplesplit', '1972-project', 'Project@1972#',{
    timezone: 'Asia/Kolkata', //We tried, ETC/GMT0+05:30
    host : "localhost",
    dialect : "mysql",
    define : {
        timestamps : false,
    },
    logging : false
});

module.exports = {
    sequelize, Sequelize
};

