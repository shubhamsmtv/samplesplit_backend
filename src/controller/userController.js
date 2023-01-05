const joi = require('joi');
const sha1 = require('sha1');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const moment = require('moment');
const geoIp = require('geoip-lite');
const { Op } = require('sequelize');
const paypal = require('paypal-rest-sdk');
const fileSystem = require('file-system');
const fs = require('fs');
const random = require('random');
const cron = require('node-cron');
const exec = require('child_process').exec;
const { dirname } = require('path');
const joiValidation = require('../helper/joiValidation');
const { User, Playmusic, DownloadMusic, UserSubscription, Donation } = require('../module/userModule');
const { StoreToken, AdminMusic, Blog, Subscription } = require('../module/adminModule');
const { sequelize } = require('../helper/SequelizeConnection');
const decodeToken = require('../helper/decodedtoken');
const emailmodel = require('../helper/sendEmail');

const { v4: uuidv4 } = require('uuid');

//paypal config file Start ->>>>
paypal.configure({
    'mode': 'sandbox',
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET
});
//paypal config file End ->>>>



// Create user Api Start =>>>>
module.exports.createUser = async (req, res) => {
    try {
        const ip = '2405:201:300c:9120:ecd2:4d0:5523:6114';
        const geo = geoIp.lookup(ip);
        console.log(geo);
        const schema = joi.object({
            username: joi.string().required(),
            email: joi.string().email().required(),
            password: joi.string().required()
        });
        joiValidation.validateSchema(schema, req.body);
        const country = geo.country;
        const { username, email } = req.body;
        const data = { username, email, country };
        const password = sha1(req.body.password);
        data.password = password;
        if (req.body.email) {
            const email = req.body.email;
            const checkEmail = await User.findOne({ where: { email: email } });
            if (checkEmail == null) {
                const createAdmin = await User.create(data);
                if (createAdmin) {
                    res.status(201).json({ 'status': 'true', 'message': 'One User Created Successefully' });
                }
            }
            else {
                res.status(400).json({ 'status': 'false', 'message': 'use athore Email' })
            }
        }
    } catch (error) {
        console.log('createAdmin Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Create user Api End =>>>>


// User Login Api Start =>>>>
module.exports.login = async (req, res) => {
    try {
        const schema = joi.object({
            email: joi.string().email().required(),
            password: joi.string().required()
        });
        joiValidation.validateSchema(schema, req.body);
        const email = req.body.email;
        const password = sha1(req.body.password);
        const getUser = await User.findOne({ where: { email: email } });
        if (getUser) {
            if (getUser.password == password) {
                const token = jwt.sign(
                    {
                        userId: getUser.id,
                        email: getUser.email,
                        userToken: uuid.v1()
                    },
                    process.env.SECRET_KEY,
                    {
                        expiresIn: process.env.EXPRIE_TIME
                    }
                );
                const { userId, email, userToken } = jwt.verify(token, process.env.SECRET_KEY);
                const data = { userId, email, userToken };
                await StoreToken.create(data);
                res.status(200).json({ 'status': 'true', token: token });
            }
            else {
                res.status(401).json({ 'status': 'false', 'message': 'password  does not match' })
            }
        }
        else {
            res.status(401).json({ 'status': 'false', 'message': 'invalid credentials' })
        }
    } catch (error) {
        console.log('Login Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// User Login Api End =>>>>

// Forget password send otp API Stat ->>>>
module.exports.sendOtp = async (req, res) => {
    try {
        const schema = joi.object({
            email: joi.string().email().required(),
        });
        joiValidation.validateSchema(schema, req.body);
        const email = req.body.email;
        const emailData = await User.findOne({ where: { email: email } });
        if (emailData) {
            console.log('emailData', emailData)
            const otp = random.int(100000, 900000);
            const subject = "OTP For conformation Email";
            const text = "Hello Sir" + ' ' + emailData.name + ' ' + " Your otp is" + ' ' + otp;
            const updateDate = new Date();
            data = { updateDate, otp };
            await emailmodel.sendMail(email, subject, text);
            await User.update(data, { where: { email: email } });
            res.status(200).json({ 'status': 'true', 'message': 'Send otp your Email' });
        }
        else {
            res.status(401).json({ 'status': 'false', 'message': 'given email does not exist' })
        }
    } catch (error) {
        console.log('Login Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Forget password send otp API End ->>>>

// otp_verify API Start ->>>>
module.exports.otp_verify = async (req, res) => {
    try {
        const schema = joi.object({
            email: joi.string().email().required(),
            otp: joi.number().min(6).required(),
        });
        joiValidation.validateSchema(schema, req.body);
        const email = req.body.email;
        const otp = req.body.otp;
        const otpData = await User.findOne({ where: { email: email, otp: otp } });
        if (otpData) {
            const currentTime = new Date();
            const createTime = otpData.updateDate;
            var difference = currentTime.getTime() - createTime.getTime();
            var Minutes = Math.round(difference / 60000);
            console.log("@@@@@@@@",currentTime, createTime)
            console.log('result',Minutes)
            if(Minutes > -1 && Minutes < "5"){
                res.status(200).json({ 'status': 'true', 'message': 'OTP is veryfied' });
            }
            else {
                res.status(400).json({ 'status': 'false', 'message': 'Your OTP is expired' });
            }
        }
        else {
            res.status(404).json({ 'status': 'false', 'message': 'invalid OTP' })
        }
    } catch (error) {
        console.log('Login Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// otp_verify API End ->>>>


// Reset Password Api Start ->>>>
module.exports.resetPassword = async (req, res) => {
    try {
        const schema = joi.object({
            email: joi.string().email().required(),
            password: joi.string().min(6).required(),
            confirmation_password: joi.any().equal(joi.ref('password'))
                .required()
                .label('Confirm password')
                .messages({ 'any.only': '{{#label}} does not match' })
        });
        joiValidation.validateSchema(schema, req.body);
        const email = req.body.email;
        const password = sha1(req.body.password);
        if (email) {
            const respons = await User.update({ password: password }, { where: { email: email } });
            if (respons) {
                res.status(200).json({ 'status': 'true', 'message': 'Password Update Successfully' })
            }
        }
        else {
            res.status(400).json({ 'message': 'password is required' });
        }
    } catch (error) {
        console.log('resetPassword Error', error);
        res.status(400).json(error);
    }
}
// Reset Password Api End ->>>>


// Get all public song's Api Start =>>>>
module.exports.getallPublicMusic = async (req, res) => {
    try {
        const page = req.query.page;
        const getAllmusic = await AdminMusic.findAll({
            order: [['trackTitle', 'ASC']],
            attributes: [
                'id', 'trackTitle', 'trackType', 'bpm', 'keyOptional', 'primaryGenre', 'type', 'price',
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/MusicImage/', imageName)`), 'imageName'],
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}Music/', music)`), 'music']
            ],
            // limit : [((page-1)*5),5],
            where: {
                type: 'public',
            }
        });
        if (getAllmusic) {
            res.status(200).json({ 'status': 'true', getAllmusic });
        }
        else {
            res.status(404).json({ 'status': 'false', 'message': 'Music not Found' })
        }
    } catch (error) {
        console.log('getallPublicMusic', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Get all public song's Api End =>>>>


// most played song stored By Id Api Start ->>>>
module.exports.mostplayed = async (req, res) => {
    try {
        const musicId = req.params.musicId;
        const musicdetial = {}
        if (musicId) {
            const getData = await AdminMusic.findOne({
                attributes: ['musicPlayed', 'id', 'trackTitle'], where: { id: musicId }
            });
            if (req.headers['authorization']) {
                const getDataByToken = await decodeToken.decodeToken(req);
                if (getDataByToken) {
                    const userId = getDataByToken.userId;
                    const getUser = await User.findOne({ where: { id: userId } });
                    if (getUser) {
                        let topuser = getUser.topuser;
                        topuser += 1;
                        await User.update({ topuser: topuser }, { where: { id: userId } });
                    }
                }
            }
            if (getData) {
                musicdetial.songId = getData.id;
                musicdetial.trackTitle = getData.trackTitle;
                const store = await Playmusic.create(musicdetial);
                let musicPlayed = getData.dataValues.musicPlayed
                musicPlayed += parseInt('1');
                const updatecolum = await AdminMusic.update({ musicPlayed: musicPlayed }, { where: { id: musicId } });
                if (updatecolum) {
                    res.status(200).json({ 'status': 'true', 'message': 'updated' });
                }
            }
            else {
                res.status(400).json('Music Not Found To Update');
            }
        }
        else {
            res.status(400).json({ 'status': 'false', 'message': 'Id is required' });
        }
    } catch (error) {
        console.log('mostPlayed Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// most played song stored By Id Api End ->>>>


// Most Discuss Song Api Start ->>>>
module.exports.mostDiscuss = async (req, res) => {
    try {
        const musicId = req.params.musicId;
        if (musicId) {
            const getData = await AdminMusic.findOne({ where: { id: musicId } });
            if (getData) {
                let mostDiscuss = getData.mostDiscuss;
                mostDiscuss += 1;
                const response = await AdminMusic.update({ mostDiscuss: mostDiscuss }, { where: { id: musicId } });
                if (response) {
                    res.status(200).json({ 'status': 'true', 'message': 'most Discuss Updated' });
                }
            }
        }
        else {
            res.status(400).json({ 'status': 'false', 'message': 'Please Select musicId' });
        }
    } catch (error) {
        console.log('mostDiscuss Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Most Discuss Song Api End ->>>>


// Get all Blog's Api Start =>>>>
module.exports.getBlog = async (req, res) => {
    try {
        const page = req.query.page;
        const findBlog = await Blog.findAndCountAll({
            attributes: [
                'id', 'title', 'type', 'description',
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/BlogImage/', imageName)`), 'imageName'],
                [sequelize.fn('TIME', sequelize.col('createDate')), 'Time'],
                [sequelize.fn('DATE', sequelize.col('createDate')), 'Date']


            ],
            limit: [((page - 1) * 5), 5],
            order: [['createDate', 'DESC']]
        })
        if (findBlog) {
            // console.log('find', findBlog[0].dataValues.imageName);
            res.status(200).json({ 'status': 'true', findBlog });
        }
        else {
            res.status(404).json({ 'status': 'false', 'message': 'Blogs not Found' });
        }
    } catch (error) {
        console.log('Get Blog Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Get all Blog's Api End =>>>>


// Search Api Start ->>>>
module.exports.search = async (req, res) => {
    try {
        const keyWord = req.query.keyWord;
        const getSong = await AdminMusic.findAll({
            attributes: [
                'id', 'trackTitle', 'trackType', 'bpm', 'keyOptional', 'primaryGenre', 'type',
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/MusicImage/', imageName)`), 'imageName'],
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}Music/', music)`), 'music']
            ],
            where: {
                [Op.or]: [
                    { trackTitle: { [Op.like]: '%' + keyWord + '%' } },
                    { trackType: { [Op.like]: '%' + keyWord + '%' } },
                    { bpm: { [Op.like]: '%' + keyWord + '%' } },
                ]
            },
            order: [['trackTitle', 'ASC']]
        });
        if (getSong && getSong.length != 0) {
            res.status(200).json({ 'status': 'true', getSong });
        }
        else {
            res.status(404).json({ 'status': 'false', 'message': 'Music Not Found' });
        }
    } catch (error) {
        console.log('search Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Search Api End ->>>>

//Get Song's By Filter Api Start =>>>>
module.exports.getSongByTracktype = async (req, res) => {
    try {
        const keyWord = req.query.filterKey;
        const page = req.query.page;
        let trackType;
        switch (keyWord) {
            case "Drums":
                trackType = 'Drums';
                break;
            case "Vocals":
                trackType = 'Vocals';
                break;
            case "Samples":
                trackType = 'Samples';
                break;
            case "Beats":
                trackType = 'Beats';
                break;
            default:
                trackType = 'public';
        }
        const getSongData = await AdminMusic.findAll({
            attributes: [
                'id', 'trackTitle', 'tracktype', 'bpm', 'keyOptional',
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/MusicImage/', imageName)`), 'imageName'],
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}Music/', music)`), 'music']
            ],
            where: {
                [Op.or]: [
                    { trackType: trackType },
                    { type: trackType }
                ]
            },
            order: [['trackTitle', 'ASC']]
        });
        if (getSongData) {
            res.status(200).json({ 'status': 'true', getSongData });
        }
    } catch (error) {
        console.log('getSongByTracktype', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
//Get Song's By Filter Api End =>>>>


// Get Downloaded Song's Api Start ->>>>
module.exports.getDownloadSong = async (req, res) => {
    try {
        const musicId = req.params.id;
        if (musicId) {
            const getSong = await AdminMusic.findOne({
                attributes: [
                    [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/MusicImage/', imageName)`), 'imageName'],
                    [sequelize.literal(`CONCAT('${process.env.BASE_URL}Music/', music)`), 'music']
                ],
                where: { id: musicId }
            });
            if (getSong) {
                res.status(200).json({ 'status': 'true', 'data': getSong });
            }
            else {
                res.status(404).json({ 'status': 'true', 'message': 'Music Not Avalable' });
            }
        }
    } catch (error) {
        console.log('getDownloadSong Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Get Downloaded Song's Api End ->>>>



// DownloadSong Api Start ->>>>
module.exports.downloadSong = async (req, res) => {
    try {
        const tokenData = await decodeToken.decodeToken(req);
        if (tokenData) {
            if (req.query.trackTitle) {
                console.log(req.query.trackTitle);
                const downloaded = '1'
                const todayDate = moment().format('YYYY-MM-DD');
                const data = {
                    musicName: req.query.trackTitle,
                    userId: tokenData.userId,
                    downloaded,
                    createDate: todayDate
                }
                const downloadedStored = await DownloadMusic.create(data);
                const totalDownloaded = await DownloadMusic.sum('downloaded', {
                    where: {
                        userId: data.userId,
                        createDate: {
                            [Op.gte]: todayDate
                        }
                    }
                });
                if (totalDownloaded > 3) {
                    const subscription = await UserSubscription.findOne({ where: { userId: data.userId } });
                    if (subscription) {
                        const expireDate = subscription.expireDate;
                        if (expireDate > todayDate) {
                            res.status(200).json({ 'status': 'true', 'message': 'Download Success' });
                        }
                    }
                    else {
                        res.status(200).json({ 'status': 'false', 'message': 'Please Buy Subscription' })
                    }
                }
                else {
                    res.status(200).json({ 'status': 'true', 'message': 'Download Success' });
                }
            }
        }
    } catch (error) {
        console.log('download Song Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// DownloadSong Api End ->>>>


// Get All Subscription Api Start ->>>>
module.exports.getSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findAll();
        if (subscription) {
            res.status(200).json({ 'status': 'true', subscription });
        }
        else {
            res.status(404).json({ 'status': 'false', 'message': 'Data not Found' });
        }
    } catch (error) {
        console.log('getSubscription Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}


// Create payment Api Start ->>>>
module.exports.pay = async (req, res) => {
    try {
        const SubID = req.params.id;
        if (SubID) {
            const SubData = await Subscription.findOne({ where: { id: SubID } });
            if (SubData) {
                const create_payment_json = {
                    "intent": "sale",
                    "payer": {
                        "payment_method": "paypal"
                    },
                    "redirect_urls": {
                        "return_url": "http://localhost:3000/plansuccess",
                        "cancel_url": "http://localhost:3000/plancancell"
                    },
                    "transactions": [{
                        "item_list": {
                            "items": [{
                                "name": SubData.subscriptionTitle,
                                // "sku": "001",
                                "price": SubData.subscriptionPrice,
                                "currency": "USD",
                                "quantity": 1
                            }]
                        },
                        "amount": {
                            "currency": "USD",
                            "total": SubData.subscriptionPrice
                        },
                        "description": "Hat for the best team ever"
                    }]
                }

                paypal.payment.create(create_payment_json, function (error, payment) {
                    if (error) {
                        throw error;
                    } else {
                        for (let i = 0; i < payment.links.length; i++) {
                            if (payment.links[i].rel === 'approval_url') {
                                let links = payment.links[i].href;
                                res.status(200).json({ 'status': 'true', links });
                                // res.redirect(payment.links[i].href);
                            }
                        }
                    }
                });
            }
        }
        else {
            res.status(400).json('Subcription Id is Required');
        }
    }
    catch (error) {
        console.log('createPayment Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Create payment Api End ->>>>


// Success payment Api Start ->>>>
module.exports.paymentSuccess = async (req, res) => {
    try {
        const SubID = req.params.id;
        const tokenData = await decodeToken.decodeToken(req);
        if (SubID) {
            const SubData = await Subscription.findOne({ where: { id: SubID } });
            if (SubData) {
                const payerId = req.query.PayerID;
                const paymentId = req.query.paymentId;
                const userId = tokenData.userId;
                let [days] = SubData.subscriptionPlanDays.split(' ');
                const expireDate = moment().add(days, 'days').format('YYYY-MM-DD');
                const details = {
                    subscriptionId: SubData.id,
                    subscriptionTitle: SubData.subscriptionTitle,
                    subscriptionPrice: SubData.subscriptionPrice,
                    subscriptionPlanDays: SubData.subscriptionPlanDays,
                    expireDate,
                    userId,
                    paymentId
                }
                const execute_payment_json = {
                    "payer_id": payerId,
                    "transactions": [{
                        "amount": {
                            "currency": "USD",
                            "total": SubData.subscriptionPrice
                        }
                    }]
                }
                paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
                    if (error) {
                        throw error;
                    } else {
                        const createData = await UserSubscription.create(details);
                        if (createData) {
                            res.status(200).json({ 'status': 'true', payment });
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.log('success Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Success payment Api Start ->>>>



// Cancel payment Api Start ->>>>
module.exports.cancelPayment = (req, res) => {
    try {
        res.status(200).json({ 'status': 'true', 'message': 'Your Payment Is Cancelled' });
    } catch (error) {
        console.log('cancelPayment Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Cancel payment Api Start ->>>>



// Get Subscription Detail Api Start ->>>>
module.exports.getUserDetail = async (req, res) => {
    try {
        const tokenData = await decodeToken.decodeToken(req);
        const userId = tokenData.userId;
        const todayDate = moment().format('YYYY-MM-DD');
        if (userId) {
            const getData = await User.findOne({
                where: {
                    id: userId
                }
            });
            if (getData && getData.id) {
                let subPlanData = await UserSubscription.findOne({
                    where: {
                        userId: getData.id
                    }
                });
                console.log('subplan', subPlanData.expireDate)
                if (subPlanData && subPlanData.expireDate >= todayDate) {
                    let PlanData = subPlanData;
                    const exfDate = subPlanData.expireDate;
                    let diff = moment(exfDate);
                    let currentDate = moment(todayDate);
                    const Datediff = diff.diff(currentDate, 'days');
                    console.log('dateDiff', Datediff)
                    PlanData.dataValues.expireIn = Datediff + ' ' + 'days';
                    res.status(200).json({ 'status': 'true', PlanData, getData });
                }
                else {
                    res.status(200).json({ 'status': 'true', 'message': 'plan Expire', getData });
                }
            }
            else {
                res.status(404).json({ 'status': 'false', 'message': 'Enter A valid Token' });
            }
        }
    } catch (error) {
        console.log('subscriptionDetail Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Get Subscription Detail Api End ->>>>



// Donation Pay Api Start ->>>>
module.exports.DonationPay = (req, res) => {
    try {
        const title = req.body.title;
        const amount = req.body.amount;
        console.log(title, amount);
        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": "http://localhost:3000/donationsuccess",
                "cancel_url": "http://localhost:3000/donationcancell"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": title,
                        "sku": "001",
                        "price": amount,
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": amount
                },
                "description": "Hat for the best team ever"
            }]
        }
        paypal.payment.create(create_payment_json, function (error, payment) {
            if (error) {
                throw error;
            } else {
                for (let i = 0; i < payment.links.length; i++) {
                    if (payment.links[i].rel === 'approval_url') {
                        let links = payment.links[i].href;
                        res.status(200).json({ 'status': 'true', links });
                        // res.redirect(payment.links[i].href);
                    }
                }
            }
        });

    } catch (error) {
        console.log('DonationPay Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}


// Success Donation Api Start ->>>>
module.exports.successDonation = (req, res) => {
    try {
        const payerId = req.query.PayerID;
        const paymentId = req.query.paymentId;
        const amount = req.query.amount;
        const execute_payment_json = {
            "payer_id": payerId,
            "transactions": [{
                "amount": {
                    "currency": "USD",
                    "total": amount
                }
            }]
        };
        paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
            if (error) {
                console.log(error.response);
                throw error;
            } else {
                const payData = {
                    fullName: payment.payer.payer_info.shipping_address.recipient_name,
                    userEmail: payment.payer.payer_info.email,
                    city: payment.payer.payer_info.shipping_address.city,
                    postalCode: payment.payer.payer_info.shipping_address.postal_code,
                    countryCode: payment.payer.payer_info.shipping_address.country_code,
                    amount: payment.transactions[0].amount.total
                }
                const response = await Donation.create(payData);
                if (response) {
                    res.status(200).json({ 'status': 'true', 'message': 'Payment Success' })
                }

            }
        });
    } catch (error) {
        console.log('success Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// Success Donation Api End ->>>>



// get 2 stems Music Api Start ->>>>>
module.exports.getTwoStemsAudio = async (req, res) => {
    try {
        if (req.files && req.files.file_name) {
            const today = new Date();
            let fileName = today.getTime() + random.int(1, 1000);
            const music = req.files.file_name;
            const folder = moment().format('YYYY_MM_DD');
            const yesterDay = moment().subtract(2, 'days').format('YYYY-MM-DD');
            console.log('tow', yesterDay)
            let extension = music.name.split('.').pop();
            if (!fs.existsSync('public/files2stem/' + folder)) {
                fs.mkdirSync('public/files2stem/' + folder);
            }
            if (!fs.existsSync('public/2stemoutput/' + folder)) {
                fs.mkdirSync('public/2stemoutput/' + folder);
            }
            const uploadPath = 'public/files2stem/' + folder + '/' + fileName + '.' + extension;
            await music.mv(uploadPath);
            const stems = req.body.stems;
            const type = req.body.type;
            // cron.schedule("* * */1 * * *", function () {
            //     fs.rmSync('public/files2stem/' + folder, { recursive: true, force: true });
            //     fs.rmSync('public/2stemoutput/' + folder, { recursive: true, force: true });
            //     console.log("running a task every 10 second");
            // });
            if (music.mimetype.indexOf('audio/') > -1) {
                exec("spleeter separate -p spleeter:2stems -o public/2stemoutput/" + folder + " " + uploadPath + " -c " + extension, (error, stdout, stderr) => {
                    if (error) {
                        console.log(`error: ${error.message}`);
                        throw error
                    }
                    if (stderr) {
                        console.log('stderr', stderr);
                        res.status(200).json(stderr);
                    }
                    console.log('stdout', stdout);
                    if (stdout) {
                        if (type == 'vocals') {
                            res.status(200).json({
                                "status": 'true',
                                "message": 'Record Found',
                                fileName,
                                vocals: process.env.API_URL + '/2stemoutput/' + folder + '/' + fileName + '/vocals.' + extension,
                            });
                        }
                        else {
                            res.status(200).json({
                                "status": 'true',
                                "message": 'Record Found',
                                fileName,
                                accompaniment: process.env.API_URL + '/2stemoutput/' + folder + '/' + fileName + '/accompaniment.' + extension
                            });
                        }
                    } else {
                        res.status(400).json({ 'message': 'Please Select A File' });
                    }
                })
            }
            else {
                res.status(209).json({ 'message': 'Please Select A musicFile' });
            }
        } else {
            res.status(400).json({ 'message': 'Please Select A File' });
        }
    } catch (error) {
        console.log('getTwoStemsAudio Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// get 2 stems Music Api End ->>>>>




// get 4 stems music Api Start ->>>>
module.exports.getFourStemsAudio = async (req, res) => {
    try {
        if (req.files && req.files.music) {
            const music = req.files.music;
            if (music.mimetype.indexOf('audio/') > -1) {
                const today = new Date();
                let fileName = today.getTime() + random.int(1, 1000);
                const music = req.files.music;
                const folder = moment().format('YYYY_MM_DD');
                const yesterDay = moment().subtract(2, 'days').format('YYYY-MM-DD');
                let extension = music.name.split('.').pop();
                if (!fs.existsSync('public/files4stem/' + folder)) {
                    fs.mkdirSync('public/files4stem/' + folder);
                }
                if (!fs.existsSync('public/4stemoutput/' + folder)) {
                    fs.mkdirSync('public/4stemoutput/' + folder);
                }
                const uploadPath = 'public/files4stem/' + folder + '/' + fileName + '.' + extension;
                await music.mv(uploadPath);
                const stems = req.body.stems;
                const type = req.body.type;
                // cron.schedule("* * */1 * * *", function () {
                //     fs.rmSync('public/files4stem/' + folder, { recursive: true, force: true });
                //     fs.rmSync('public/4stemoutput/' + folder, { recursive: true, force: true });
                //     console.log("running a task every 10 second");
                // });
                exec("spleeter separate -p spleeter:4stems -o public/4stemoutput/" + folder + " " + uploadPath + " -c " + extension, (error, stdout, stderr) => {
                    if (error) {
                        console.log(`error: ${error.message}`);
                        throw error
                    }
                    if (stderr) {
                        console.log('stderr', stderr);
                        res.status(200).json(stderr);
                    }
                    console.log('stdout', stdout);
                    if (stdout) {
                        if (type == 'vocals') {
                            res.status(200).json({
                                "status": 'true',
                                "message": 'Record Found',
                                fileName,
                                fourStemsVocals: process.env.API_URL + '/4stemoutput/' + folder + '/' + fileName + '/vocals.' + extension,
                            });
                        }
                        else if (type == 'bass') {
                            res.status(200).json({
                                "status": 'true',
                                "message": 'Record Found',
                                fileName,
                                bass: process.env.API_URL + '/4stemoutput/' + folder + '/' + fileName + '/bass.' + extension,
                            });
                        }
                        else if (type == 'drums') {
                            res.status(200).json({
                                "status": 'true',
                                "message": 'Record Found',
                                fileName,
                                drums: process.env.API_URL + '/4stemoutput/' + folder + '/' + fileName + '/drums.' + extension,
                            });
                        }
                        else {
                            res.status(200).json({
                                "status": 'true',
                                "message": 'Record Found',
                                fileName,
                                other: process.env.API_URL + '/4stemoutput/' + folder + '/' + fileName + '/other.' + extension
                            });
                        }
                    }

                })
            }
            else {
                res.status(209).json({ 'message': 'Please Select A musicFile' });
            }
        }
    } catch (error) {
        console.log('getFourStemsAudio Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// get 4 stam music Api End ->>>>



// User logOut Api Start =>>>>
module.exports.logOut = async (req, res) => {
    try {
        const getDataByToken = await decodeToken.decodeToken(req);
        if (getDataByToken && getDataByToken.userToken) {
            const userToken = getDataByToken.userToken;
            const response = await StoreToken.destroy({ where: { userToken: userToken } });
            if (response) {
                res.status(200).json({ 'status': 'true', "message": 'User LogOut Successfully' });
            }
        }
        else {
            res.status(404).json({ 'status': 'false', 'message': 'invalid credentials ' })
        }
    } catch (error) {
        console.log('LogOut Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}
// User logOut Api End =>>>>



// check Token API
module.exports.check = async (req, res) => {
    try {
        const getDataByToken = await decodeToken.decodeToken(req);
        console.log('Token', getDataByToken);
        if (getDataByToken.userId) {
            res.status(200).json({ 'status': 'true', 'message': 'logedIN' });
        }
        else {
            res.status(200).json({ 'status': 'false', 'message': 'Not logedIN' });
        }
    } catch (error) {
        console.log('LogOut Error', error);
        res.status(400).json({ 'status': 'false', error });
    }
}