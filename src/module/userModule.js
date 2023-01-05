const {sequelize, Sequelize:{DataTypes}} = require('../helper/SequelizeConnection');


// User Table Module Start ->>>>
const User = sequelize.define('users', {
    username : {
        type : DataTypes.STRING,
        allowNull : false
    },
    email : {
        type : DataTypes.STRING,
        allowNull : false
    },
    password : {
        type : DataTypes.STRING,
        allowNull : false
    },
    otp : {
        type : DataTypes.STRING,
        defaultValue : null
    },
    country : {
        type : DataTypes.STRING,
        allowNull : false
    },
    topuser : {
        type : DataTypes.NUMBER,
        defaultValue : 0
    },
    createDate : {
        type : DataTypes.DATE,
        defaultValue : new Date()
    },
    updateDate : {
        type : DataTypes.DATE,
        defaultValue : new Date()
    }

},{tableName : 'users'});
// User Table Module End ->>>>


// Played music Table Module Start ->>>>
const Playmusic = sequelize.define('playmusic',{
    songId : {
        type : DataTypes.NUMBER,
        allowNull : false

    },
    trackTitle : {
        type : DataTypes.STRING,
        allowNull : false
        
    },
    Played : {
        type : DataTypes.NUMBER,
        defaultValue : 1
        
    },
    createDate : {
        type : DataTypes.DATE,
        defaultValue : new Date()
        
    }
}, {tableName : 'playmusic'});
// Played music Table Module End ->>>>

// Download music Table Module Start ->>>>
const DownloadMusic = sequelize.define('downloadMusic',{
    userId : {
        type : DataTypes.NUMBER,
        allowNull : false,
    },
    musicName : {
        type : DataTypes.NUMBER,
        allowNull : false,
    },
    downloaded : {
        type : DataTypes.NUMBER,
        defaultValue : 0
    },
    createDate : {
        type : DataTypes.DATE,
        allowNull : false
    }
},{tableName : 'downloadMusic'})
// Download music Table Module End->>>>

// Subscription Table module Start ->>>>
const UserSubscription = sequelize.define('userSubscription',{
    userId : {
        type : DataTypes.NUMBER,
        allowNull : false
    },
    subscriptionId :{
        type : DataTypes.NUMBER,
        allowNull : false
    },
    paymentId :{
        type : DataTypes.STRING,
        allowNull : false
    },
    subscriptionTitle : {
        type : DataTypes.STRING,
        allowNull : false
    },
    subscriptionPrice : {
        type : DataTypes.DECIMAL,
        allowNull : false
    },
    subscriptionPlanDays : {
        type : DataTypes.STRING,
        allowNull : false
    },
    createDate : {
        type : DataTypes.DATE,
        defaultValue : new Date()
    },
    expireDate : {
        type : DataTypes.DATE,
        allowNull : false
    }
},{tableName : 'userSubscription'});
// Subscription Table module End ->>>>

UserSubscription.hasOne(User,{
    sourceKey:'userId',
    foreignKey:'id',
    as:'users'
});


const Donation = sequelize.define('userDonation',{
    fullName : {
        type : DataTypes.STRING,
        allowNull : false,
    },
    userEmail : {
        type : DataTypes.STRING,
        allowNull : false,
    },
    city : {
        type : DataTypes.STRING,
        allowNull : false,
    },
    postalCode : {
        type : DataTypes.STRING,
        allowNull : false,
    },
    countryCode : {
        type : DataTypes.STRING,
        allowNull : false,
    },
    amount : {
        type : DataTypes.STRING,
        allowNull : false,
    },
    createDate : {
        type : DataTypes.DATE,
        defaultValue : Date.now
    },
},{tableName : 'userDonation'})

module.exports = {
    User,
    Playmusic,
    DownloadMusic,
    UserSubscription,
    Donation
}