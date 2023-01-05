const { DATE } = require('sequelize');
const {sequelize, Sequelize:{DataTypes}} = require('../helper/SequelizeConnection');

// Admin Table Module Start ->>>>
const Admin = sequelize.define('admin', {
    name : {
        type : DataTypes.STRING,
        allowNull : false
    },
    email : {
        type : DataTypes.STRING,
        allowNull : false
    },
    otp : {
        type : DataTypes.INTEGER,
        defaultValue : null
    },
    password : {
        type : DataTypes.STRING,
        allowNull : false
    },
    createDate : {
        type : DataTypes.DATE,
        defaultValue : Date.now()
    },
    updateDate : {
        type : DataTypes.DATE,
        defaultValue : Date.now()
    }
},{tableName : 'admin'});
// Admin Table Module End ->>>>



// Admin Table store token Module Start ->>>>
const StoreToken = sequelize.define('userToken',{
    userId :{
        type : DataTypes.STRING,
        allowNull : false
    },
    email :{
        type : DataTypes.STRING,
        allowNull : false
    },
    userToken :{
        type : DataTypes.STRING,
        allowNull : false
    },
},{tableName : 'userToken'});
// Admin Table store token Module End ->>>>



// Music Table Module Start ->>>>
const AdminMusic = sequelize.define('Music',{
    trackTitle :{
        type: DataTypes.STRING,
        allowNull : false
    },
    trackType : {
        type : DataTypes.STRING,
        allowNull : false
    },
    bpm : {
        type : DataTypes.STRING,
        allowNull : false
    },
    keyOptional : {
        type : DataTypes.STRING,
        allowNull :false
    },
    primaryGenre : {
        type : {
            type : DataTypes.STRING,
            allowNull : false
        }
    },
    type : {
        type : {
            type : DataTypes.STRING,
            allowNull : false
        }
    },
    imageName : {
        type : {    
            type : DataTypes.STRING,
            allowNull : false
        }
    },
    music : {
        type : {    
            type : DataTypes.STRING,
            allowNull : false
        }
    },
    musicPlayed : {
        type : DataTypes.NUMBER,
        defaultValue : 0
    },
    mostDiscuss : {
        type : DataTypes.NUMBER,
        defaultValue : 0
    },
    price : {
        type : DataTypes.NUMBER,
        defaultValue : 0
    },
    updatedDate : {
        type : DataTypes.DATE,
        defaultValue : Date.now
    }
},{tableName : 'Music'});
// Music Table Module End ->>>>



// Blogs Table Module Start ->>>>
const Blog = sequelize.define('blogs',{
    title : {
        type : DataTypes.STRING,
        allowNull : false
    },
    description : {
        type : DataTypes.STRING,
        allowNull : false
    },
    imageName : {
        type : DataTypes.STRING,
        defaultValue : 'Null'
    },
    type : {
        type : DataTypes.STRING,
        allowNull : false
    },
    createDate : {
        type : DataTypes.DATE,
        defaultValue : Date.now
    }
},{tableName : 'blogs'});
// Blogs Table Module End ->>>>



// Save OTP Module Start ->>>>
const OTP = sequelize.define('userOTP',{
    userId : {
        type : DataTypes.NUMBER,
        allowNull : false
    },
    userEmail : {
        type : DataTypes.STRING,
        allowNull : false
    },
    otp : {
        type : DataTypes.STRING,
        allowNull : false
    },
    createDate : {
        type : DATE,
        defaultValue : Date.now
    }
},{tableName : 'userOTP'});
// Save OTP Module Start ->>>>

// Subscription Table module Start ->>>>
const Subscription = sequelize.define('subscription',{
    subscriptionTitle : {
        type : DataTypes.STRING,
        allowNull : false
    },
    subscriptionPrice : {
        type : DataTypes.STRING,
        allowNull : false
    },
    subscriptionPlanDays : {
        type : DataTypes.STRING,
        allowNull : false
    },
    updateDate : {
        type : DataTypes.DATE,
        defaultValue : Date.now
    }
},{tableName : 'subscription'})
// Subscription Table module End ->>>>

module.exports = {
    Admin,
    StoreToken,
    AdminMusic,
    Blog,
    OTP,
    Subscription,
}