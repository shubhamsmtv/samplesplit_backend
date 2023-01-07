const joi = require('joi');
const sha1 = require('sha1');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const random = require('random');
const fs = require('file-system');
const joiValidation = require('../helper/joiValidation');
const { sequelize } = require('../helper/SequelizeConnection');
const { Admin, StoreToken, AdminMusic, Blog, OTP, Subscription } = require('../module/adminModule');
const { Playmusic, User, UserSubscription, Donation } = require('../module/userModule');
const decodeToken = require('../helper/decodedtoken');
const sendEmail = require('../helper/sendEmail');
const { Op} = require('sequelize');
const moment = require('moment');


// Login Api start ->>>>
module.exports.login = async (req, res) => {
    try {
        const schema = joi.object({
            email: joi.string().email().required(),
            password: joi.string().required()
        });
        joiValidation.validateSchema(schema, req.body);
        const email = req.body.email;

        const password = sha1(req.body.password);
        const getUser = await Admin.findOne({ where: { email: email } });
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
        console.log('Login Error', error.message);
        res.status(400).json(error.message);
    }
}
// Login Api End ->>>>



// Send otp for Reset password Api Start ->>>>
module.exports.sendOTP = async (req, res) => {
    try {
        const schema = joi.object({
            email: joi.string().email().required(),
        });
        joiValidation.validateSchema(schema, req.body);
        const email = req.body.email;
        const user = await Admin.findOne({ where: { email: email } });
        if (user) {
            const otp = random.int(1000, 9000);
            const userId = user.id;
            const subject = 'Send OTP';
            const updateDate = new Date()
            const data = { updateDate, otp }
            const text = "Hello" + ' ' + user.name + ' ' +
                'Send Otp Email verify your OTP is ' +
                otp;
            await sendEmail.sendMail(email, subject, text);
            await Admin.update(data, { where: { id: userId } });
            res.status(200).json({ 'status': 'true', 'message': 'Send otp your Email' });
        }
        else {
            res.status(401).json({ 'status': 'false', 'message': 'given email does not exist' })
        }
    } catch (error) {
        console.log('sendOTP Error', error);
        res.status(400).json(error.message);
    }
}
// Send otp for Reset password Api End ->>>>



// OTP veriyfication Api Start ->>>>
module.exports.otpverify = async (req, res) => {
    try {
        const schema = joi.object({
            email: joi.string().required(),
            otp: joi.number().required()
        });
        joiValidation.validateSchema(schema, req.body);
        const email = req.body.email;
        const otp = req.body.otp;
        const getOTP = await Admin.findOne({where: { email: email, otp: otp }});
        if (getOTP) {
            const currentTime = new Date();
            const createTime = getOTP.updateDate;
            var difference = currentTime.getTime() - createTime.getTime();
            var Minutes = Math.round(difference / 60000);
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
        console.log('otpverify Error', error);
        res.status(400).json(error.message);
    }
}
// OTP veriyfication Api End ->>>>



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
            const respons = await Admin.update({ password: password }, { where: { email: email } });
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



// Audio Upload Api Start ->>>>
module.exports.audioUpload = async (req, res) => {
    try {
        const schema = joi.object({
            trackTitle: joi.string().trim().required(),
            trackType: joi.string().required(),
            bpm: joi.string().required(),
            keyOptional: joi.string().required(),
            primaryGenre: joi.string().required(),
            type: joi.string().required(),
        });
        joiValidation.validateSchema(schema, req.body);
        const trackTitle = req.body.trackTitle;
        const getTarckTitle = await AdminMusic.findOne({ where: { trackTitle: trackTitle } });
        if (getTarckTitle) {
            res.status(200).json({ 'status': 'true', 'message': 'Please Enter A new tarckTitle' });
        }
        else {
            const today = new Date();
            if (req.files && req.files.image && req.files.music) {
                const music = req.files.music;
                const image = req.files.image;
                const trackTitle = req.body.trackTitle;
                const getSong = await AdminMusic.findOne({ where: { trackTitle: trackTitle } });
                const { trackType, bpm, keyOptional, primaryGenre, type } = req.body;
                let data = { trackTitle, trackType, bpm, keyOptional, primaryGenre, type };
                if (music.mimetype.indexOf('audio/') > -1) {
                    const musicName = music.name;
                    const musicExtantion = musicName.split('.').pop();
                    const musicNewName = trackTitle.replace(/[^a-zA-Z0-9]/g, '') + '.' + musicExtantion;
                    const uploadPath = 'public/Music/' + musicNewName;
                    await music.mv(uploadPath);
                    data.music = musicNewName;
                }
                else {
                    res.status(400).json({ 'message': 'Please Select A Audio' });
                }
                if (image.mimetype.indexOf('image/') > -1) {
                    const imageExtantion = image.name.split('.').pop();
                    const imageNewName = today.getTime() + '' + random.int(1, 10000) + '.' + imageExtantion;
                    const imageUploadPath = 'public/images/MusicImage/' + imageNewName;
                    await image.mv(imageUploadPath);
                    data.imageName = imageNewName;
                }
                else {
                    res.status(400).json({ 'message': 'Please Select A Image' });
                }
                const getresponse = await AdminMusic.create(data);
                if (getresponse) {
                    res.status(201).json({ 'status': 'true', 'message': 'Music Stored Successfully' })
                }
            }
            else {
                res.status(400).json({ 'message': 'image & musie is required' });
            }
        }
    } catch (error) {
        console.log('audioUpload Error', error);
        res.status(400).json(error.message);
    }
};
// Audio Upload Api End ->>>



// Get All Song && filter to song Api Start ->>>>
module.exports.getAllAudio = async (req, res) => {
    try {
        const filterSort = [];
        const filterkey = req.query.filterkey;
        const page = req.query.page;
        switch (filterkey) {
            case "MostPlayed":
                filterSort.push(['musicPlayed', 'DESC']);
                break;
            case "MostDiscuss":
                filterSort.push(['mostDiscuss', 'DESC']);
                break;
            case "Oldest":
                filterSort.push(['createDate', 'ASC']);
                break;
            case "Latest":
                filterSort.push(['updatedDate', 'DESC']);
                break;
            default:
                filterSort.push(['trackTitle', 'ASC']);
        }

        const allAudio = await AdminMusic.findAll({
            attributes: [
                'id', 'trackTitle', 'trackType', 'bpm', 'keyOptional', 'primaryGenre', 'type', 'price', 'musicPlayed', 'mostDiscuss', 'createDate', 'updatedDate',
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/MusicImage/', imageName)`), 'imageName'],
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}Music/', music)`), 'music']
            ],
            // limit : [((page-1)*5),5],
            raw: true,
            order: filterSort,
        });
        if (allAudio) {
            res.status(200).json({ 'status': 'true', allAudio: allAudio });
        }
        else {
            res.status(404).json({ 'status': 'false', 'message': 'not found' });
        }
    } catch (error) {
        console.log('audioUpload Error', error);
        res.status(400).json(error.message);
    }
}
// Get All Song && filter to song Api End ->>>>



// Get One Song By Id Api Start ->>>>
module.exports.editAudio = async (req, res) => {
    try {
        const audioId = req.params.audioId;
        if (audioId) {
            const getAudioById = await AdminMusic.findOne({
                attributes: [
                    'id', 'trackTitle', 'tracktype', 'bpm', 'keyOptional', 'primaryGenre', 'type',
                    [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/MusicImage/', imageName)`), 'imageName'],
                    [sequelize.literal(`CONCAT('${process.env.BASE_URL}Music/', music)`), 'music']
                ],
                where: {
                    id: audioId
                }
            });
            if (getAudioById) {
                res.status(200).json({ 'status': 'true', getAudioById });
            }
            else {
                res.status(404).json({ 'status': 'false', 'message': 'Date not Found' })
            }
        }
        else {
            res.status(404).json({ 'status': 'true', 'message': 'Music not Found' });
        }
    } catch (error) {
        console.log('editAudio Error', error);
        res.status(400).json(error.message);
    }
}
// Get One Song By Id Api Start ->>>>



// Update music Api Start ->>>>
module.exports.updateMusic = async (req, res) => {
    try {
        let data = {};
        if (req.body.trackTitle) {
            data.trackTitle = req.body.trackTitle
        }
        if (req.body.trackType) {
            data.trackType = req.body.trackType
        }
        if (req.body.bpm) {
            data.bpm = req.body.bpm
        }
        if (req.body.keyOptional) {
            data.keyOptional = req.body.keyOptional
        }
        if (req.body.primaryGenre) {
            data.primaryGenre = req.body.primaryGenre
        }
        if (req.body.type) {
            data.type = req.body.type
        }
        const trackTitle = req.body.trackTitle;
        const today = new Date();
        const AudioId = req.params.audioId;
        if (req.files) {
            if (req.files && req.files.image && req.files.music) {
                const getTarckTitle = await AdminMusic.findOne({ where: { trackTitle: trackTitle } });
                if (getTarckTitle) {
                    res.status(200).json({ 'status': 'true', 'message': 'Please Enter A new tarckTitle' });
                }
                else {
                    const trackTitle = req.body.trackTitle;
                    const music = req.files.music;
                    const musicName = music.name;
                    const musicExtantion = musicName.split('.').pop();
                    const musicNewName = trackTitle.replace(/[^a-zA-Z0-9]/g, '') + '.' + musicExtantion;
                    const image = req.files.image
                    const imageExtantion = image.name.split('.').pop();
                    const imageNewName = today.getTime() + '' + random.int(1, 10000) + '.' + imageExtantion;
                    const imageUploadPath = 'public/images/MusicImage/' + imageNewName;
                    const uploadPath = 'public/Music/' + musicNewName;
                    await image.mv(imageUploadPath);
                    await music.mv(uploadPath);
                    data.imageName = imageNewName;
                    data.music = musicNewName;
                    const getresponse = await AdminMusic.update(data, { where: { id: AudioId } });
                    if (getresponse) {
                        res.status(201).json({ 'status': 'true', 'message': 'Music Updated Successfully' })
                    }
                }
            } else if (req.files && req.files.music) {
                const getTarckTitle = await AdminMusic.findOne({ where: { trackTitle: trackTitle } });
                if (getTarckTitle) {
                    res.status(200).json({ 'status': 'true', 'message': 'Please Enter A new tarckTitle' });
                }
                else {
                    const trackTitle = req.body.trackTitle;
                    const music = req.files.music;
                    const musicName = music.name;
                    const musicExtantion = musicName.split('.').pop();
                    const musicNewName = trackTitle.replace(/[^a-zA-Z0-9]/g, '') + '.' + musicExtantion;
                    const uploadPath = 'public/Music/' + musicNewName;
                    await music.mv(uploadPath);
                    data.music = musicNewName;
                    const getresponse = await AdminMusic.update(data, { where: { id: AudioId } });
                    if (getresponse) {
                        res.status(201).json({ 'status': 'true', 'message': 'Music Updated Successfully' })
                    }
                }
            }
            else {
                const image = req.files.image
                const imageExtantion = image.name.split('.').pop();
                const imageNewName = today.getTime() + '' + random.int(1, 10000) + '.' + imageExtantion;
                const imageUploadPath = 'public/images/MusicImage/' + imageNewName;
                await image.mv(imageUploadPath);
                data.imageName = imageNewName;
                const getresponse = await AdminMusic.update(data, { where: { id: AudioId } });
                if (getresponse) {
                    res.status(201).json({ 'status': 'true', 'message': 'Music Updated Successfully' })
                }
            }
        }
        else {
            const getresponse = await AdminMusic.update(data, { where: { id: AudioId } });
            if (getresponse) {
                res.status(201).json({ 'status': 'true', 'message': 'Music Updated Successfully' })
            }
        }
    } catch (error) {
        console.log('updateMusic Error', error);
        res.status(400).json(error.message);
    }
}
// Update music Api End ->>>>



// Delete One Song By Id Api Start ->>>>
module.exports.deleteAudio = async (req, res) => {
    try {
        const audioId = req.params.audioId;
        if (audioId) {
            const getAudioById = await AdminMusic.findOne({ where: { id: audioId } });
            if (getAudioById) {
                const music = getAudioById.music;
                const deleteAudioById = await AdminMusic.destroy({ where: { id: audioId } });
                fs.unlink('public/Music/' + music, function (error) {
                    if (error) {
                        console.log(error);
                    }
                });
                if (deleteAudioById) {
                    res.status(200).json({ 'status': 'true', 'message': 'Audio Deleted Successfully' });
                }
            }
            else {
                res.status(404).json({ 'status': 'true', 'message': 'Invalid credentials' });
            }
        }
        else {
            res.status(400).json({ 'status': 'false', 'message': 'Id is Required' });
        }
    } catch (error) {
        console.log('deleteAudio Error', error);
        res.status(400).json(error.message);
    }
}
// Delete One Song By Id Api End ->>>>



// change Song status By Id Api Start ->>>>
module.exports.changeStatus = async (req, res) => {
    try {
        const type = req.query.type;
        const audioId = req.params.audioId;
        if (type) {
            const updateStatus = await AdminMusic.update({ type: type }, { where: { id: audioId } });
            res.status(200).json({ 'status': 'true', 'message': 'status update successfully' });
        }
        else {
            res.status(401).json({ 'status': 'fasle', 'message': 'Type is Required' });
        }
    } catch (error) {
        console.log('changeStatus Error', error);
        res.status(400).json(error.message);
    }
}
// change Song status By Id Api End ->>>>



// Add Payment on Song Api Start ->>>>
module.exports.AddPayment = async (req, res) => {
    try {
        const audioId = req.body.audioId;
        const amount = req.body.amount;
        if (audioId && amount) {
            const addPrice = await AdminMusic.update({ price: amount }, { where: { id: audioId } });
            if (addPrice) {
                res.status(200).json({ 'status': 'true', 'message': 'Add Price Successfullay' });
            }
        }
        else {
            res.status(400).json({ 'message': 'audio Id And Price is required' });
        }
    } catch (error) {
        console.log('AddPayment Error', error);
        res.status(400).json(error.message);
    }
}
// Add Payment on Song Api End ->>>>



// Get Admin Profile By Id Api Start ->>>>
module.exports.getProfile = async (req, res) => {
    try {
        const tokenData = await decodeToken.decodeToken(req);
        if (tokenData && tokenData.userId) {
            const adminId = tokenData.userId;
            const getAdminData = await Admin.findOne({
                attributes: ['id', 'name', 'email'],
                where: { id: adminId }
            });
            if (getAdminData) {
                res.status(200).json({ 'status': 'true', getAdminData });
            }
        }
        else {
            res.status(401).json({ 'status': 'false', 'message': 'unauthorized' })
        }
    } catch (error) {
        console.log('getAdminProfile', error);
        res.status(400).json(error.message);
    }
}
// Get Admin Profile By Id Api End ->>>>



// Update Admin Profile By Id Api Start ->>>>
module.exports.updateProfile = async (req, res) => {
    try {
        const schema = joi.object({
            name: joi.string().required(),
            email: joi.string().required(),
        });
        joiValidation.validateSchema(schema, req.body)
        const { name, email } = req.body;
        const adminData = { name, email };
        const tokenData = await decodeToken.decodeToken(req);
        if (tokenData && tokenData.userId) {
            const adminId = tokenData.userId;
            const update = await Admin.update(adminData, { where: { id: adminId } });
            if (update) {
                res.status(200).json({ 'status': 'true', 'message': 'Admin Profile Updated Successfullay' });
            }
        }
    } catch (error) {
        console.log('updateProfile Error', error);
        res.status(400).json(error.message);
    }
}
// Update Admin Profile By Id Api End ->>>>



// Change Password Api Start ->>>>
module.exports.changePassword = async (req, res) => {
    try {
        const schema = joi.object({
            password: joi.string().required(),
            confirmPassword: joi.any().valid(joi.ref('password')).required(),
        });
        joiValidation.validateSchema(schema, req.body);
        const tokenData = await decodeToken.decodeToken(req);
        if (tokenData && tokenData.userId) {
            const adminId = tokenData.userId;
            const password = sha1(req.body.password);
            const result = await Admin.update({ password: password }, { where: { id: adminId } });
            if (result) {
                res.status(200).json({ 'status': 'true', 'message': 'password Changed SuccessFully' });
            }
        }
        else {
            res.status(400).json('Jwt Exprire');
        }
    } catch (error) {
        console.log('changePassword Error', error);
        res.status(400).json(error.message);
    }
}
// Change Password Api End ->>>>



//Get Top Track Api Start ->>>>
module.exports.getTopTrack = async (req, res) => {
    try {
        const getTrack = await AdminMusic.findAll({
            attributes: [
                'id', 'trackTitle', 'trackType', 'bpm', 'keyOptional', 'primaryGenre', 'type', 'musicPlayed',
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/MusicImage/', imageName)`), 'imageName'],
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}Music/', music)`), 'music']
            ],
            order: [['musicPlayed', 'DESC']], limit: 4
        });
        if (getTrack) {
            res.status(200).json({ 'status': 'true', getTrack });
        }
    } catch (error) {
        console.log('getTopTrack Error', error);
        res.status(400).json(error.message);
    }
}
//Get Top Track Api End ->>>>



// Top Track By Date Api Start ->>>>
module.exports.topTrackByDate = async (req, res) => {
    try {
        const todayDate = new Date();
        const tDate = todayDate.getFullYear()+'-'+todayDate.getMonth()+1+'-'+todayDate.getDate();
        const beforOneWeek = moment().subtract(7, 'days').format('YYYY-MM-DD');
        const OneMonth = moment().subtract(30, 'days').format('YYYY-MM-DD');
        let filterSort;
        const filterkey = req.query.filterkey;
        if (filterkey == 'MONTH') {
            filterSort = OneMonth;
        }
        else if (filterkey == 'WEEK') {
            filterSort = beforOneWeek;
        }
        else {
            filterSort = tDate;
        }
        const sumtData = await Playmusic.sum('Played', {
            where: {
                createDate: {
                    [Op.gte]: filterSort
                }
            }
        })
        if (sumtData) {
            res.status(200).json({ 'status': 'true', sumtData });
        }
        else {
            res.status(404).json({ 'status': 'false', 'message': 'Data not Found' });
        }
    } catch (error) {
        console.log('topTrackBydate Error', error);
        res.status(400).json(error);
    }
}
// Top Track By Date Api End ->>>>



// Create Blog Api Start ->>>>
module.exports.createBlog = async (req, res) => {
    try {
        if (!req.body.title) {
            res.status(400).json('title is require');
        }
        if (!req.body.description) {
            res.status(400).json('description is require');
        }
        if (req.files && req.files.image) {
            const image = req.files.image;
            const picture = image.mimetype.indexOf('image/') > -1;
            const video = image.mimetype.indexOf('video/') > -1;
            if (picture || video) {
                let type;
                if (picture) {
                    type = 'picture';
                }
                else {
                    type = 'video';
                }
                const { title, description } = req.body;
                const blogData = { title, description, type };
                const image = req.files.image;
                const imageExtantion = image.name.split('.').pop();
                const today = new Date();
                const imageNewName = today.getTime() + random.int(1, 1000) + '.' + imageExtantion;
                const uploadImage = 'public/images/BlogImage/' + imageNewName;
                image.mv(uploadImage);
                blogData.imageName = imageNewName;
                const response = await Blog.create(blogData);
                if (response) {
                    res.status(201).json({ 'status': 'true', 'message': 'Blog Stored SuccessFully' });
                }
            }
            else {
                res.status(400).json({ 'message': 'Please Select Image OR Video' });
            }
        }
        else {
            const { title, description } = req.body;
            const type = 'text';
            const blogData = { title, description, type };
            const response = await Blog.create(blogData);
            if (response) {
                res.status(200).json({ 'status': 'true', 'message': 'Blog Stored SuccessFully' });
            }
        }
    } catch (error) {
        console.log('CreateBlog Error', error);
        res.status(400).json(error.message);
    }
}
// Create Blog Api End ->>>>

// Get All Block API Start ->>>>
module.exports.getAllBlog = async (req, res) => {
    try {
        const page = req.query.page;
        const findBlog = await Blog.findAndCountAll({
            attributes: [
                'id', 'title', 'type', 'description',
                [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/BlogImage/', imageName)`), 'imageName'],
                [sequelize.fn('TIME', sequelize.col('createDate')), 'Time'],
                [sequelize.fn('DATE', sequelize.col('createDate')), 'Date']
            ],
            limit: [((page - 1) * 10), 10],
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
        console.log('getAllBlog Error', error);
        res.status(400).json(error.message);
    }
}
// Get All Block API End ->>>>


// Get Block By Id API Start ->>>>
module.exports.getBlogById = async (req, res) => {
    try {
        const blogId = req.params.id;
        if (blogId) {
            const page = req.query.page;
            const findBlog = await Blog.findOne({
                attributes: [
                    'id', 'title', 'type', 'description',
                    [sequelize.literal(`CONCAT('${process.env.BASE_URL}images/BlogImage/', imageName)`), 'imageName'],
                    [sequelize.fn('TIME', sequelize.col('createDate')), 'Time'],
                    [sequelize.fn('DATE', sequelize.col('createDate')), 'Date']
                ],
                where: { id: blogId }
            })
            if (findBlog) {
                // console.log('find', findBlog[0].dataValues.imageName);
                res.status(200).json({ 'status': 'true', findBlog });
            }
            else {
                res.status(404).json({ 'status': 'false', 'message': 'Blogs not Found' });
            }
        }
        else {
            res.status(400).json({ 'status': 'false', 'message': 'id is require' });
        }
    } catch (error) {
        console.log('getAllBlog Error', error);
        res.status(400).json(error.message);
    }
}
// Get Block By Id API End ->>>>



// update Block By Id API Start ->>>>
module.exports.updateBlogById = async (req, res) => {
    try {
        const blogId = req.params.blogId;
        if (blogId) {
            if (!req.body.title) {
                res.status(400).json('title is require');
            }
            if (!req.body.description) {
                res.status(400).json('description is require');
            }
            if (req.files && req.files.imageName) {
                const image = req.files.imageName;
                const picture = image.mimetype.indexOf('image/') > -1;
                const video = image.mimetype.indexOf('video/') > -1;
                if (picture || video) {
                    let type;
                    if (picture) {
                        type = 'picture';
                    }
                    else {
                        type = 'video';
                    }
                    const { title, description } = req.body;
                    const blogData = { title, description, type };
                    const image = req.files.imageName;
                    const imageExtantion = image.name.split('.').pop();
                    const today = new Date();
                    const imageNewName = today.getTime() + random.int(1, 1000) + '.' + imageExtantion;
                    const uploadImage = 'public/images/BlogImage/' + imageNewName;
                    image.mv(uploadImage);
                    blogData.imageName = imageNewName;
                    const update = await Blog.update(blogData, { where: { id: blogId } });
                    if (update) {
                        res.status(201).json({ 'status': 'true', 'message': 'Blog Update SuccessFully' });
                    }
                }
                else {
                    res.status(400).json({ 'message': 'Please Select Image OR Video' });
                }
            }
            else {
                const { title, description } = req.body;
                const blogData = { title, description };
                const response = await Blog.update(blogData, { where: { id: blogId } });
                if (response) {
                    res.status(200).json({ 'status': 'true', 'message': 'Blog Update SuccessFully' });
                }
            }
        }
        else {
            res.status(400).json({ 'status': 'false', 'message': 'id is require' });
        }
    } catch (error) {
        console.log('updateBlogById Error', error);
        res.status(400).json(error.message);
    }
}
// Get Block By Id API End ->>>>


// Delete Blog By ID API Start ->>>>
module.exports.deleteBlog = async (req, res) => {
    try {
        const blogId = req.params.blogId;
        if (blogId) {
            const getBlogById = await Blog.findOne({ where: { id: blogId } });
            if (getBlogById) {
                const music = getBlogById.music;
                const deleteAudioById = await Blog.destroy({ where: { id: blogId } });
                if (music) {
                    fs.unlink('public/images/BlogImage/' + music, function (error) {
                        if (error) {
                            console.log(error);
                        }
                    });
                }
                if (deleteAudioById) {
                    res.status(200).json({ 'status': 'true', 'message': 'Blog Deleted Successfully' });
                }
            }
            else {
                res.status(404).json({ 'status': 'true', 'message': 'Invalid credentials' });
            }
        }
        else {
            res.status(400).json({ 'status': 'false', 'message': 'Id is Required' });
        }
    } catch (error) {
        console.log('deleteBlog Error', error);
        res.status(400).json(error.message);
    }
}
// Delete Blog By ID API End ->>>>



// Get Top Fans API Start ->>>> 
module.exports.topFans = async (req, res) => {
    try {
        const topFans = await User.findAll({
            order: [['topuser', 'DESC']], limit: 4
        });
        if (topFans) {
            res.status(200).json({ 'status': 'true', topFans });
        }
    } catch (error) {
        console.log('topFans Error', error);
        res.status(400).json(error.message);
    }
}
// Get Top Fans API End ->>>> 


// Create Subscription Api Start ->>>>>
module.exports.createSubscription = async (req, res) => {
    try {
        const schema = joi.object({
            subscriptionTitle: joi.string().required(),
            subscriptionPrice: joi.string().required(),
            subscriptionPlanDays: joi.string().required(),
        });
        joiValidation.validateSchema(schema, req.body);
        const { subscriptionTitle, subscriptionPrice, subscriptionPlanDays } = req.body;
        const data = { subscriptionTitle, subscriptionPrice, subscriptionPlanDays };
        const update = await Subscription.create(data);
        if (update) {
            res.status(201).json({ 'staus': 'true', 'message': 'Subscription Created Successfully' });
        }
    } catch (error) {
        console.log('createSubscription Error', error);
        res.status(400).json(error.message);
    }
}
// Create Subscription Api End ->>>>>


// Get total Amount API Start ->>>>>
module.exports.getTotalSubAmount = async (req, res) => {
    try {
        const tokenData = await decodeToken.decodeToken(req);
        const userId = tokenData.userId;
        if (userId) {
            const getTotal = await UserSubscription.sum('subscriptionPrice');
            res.status(200).json({ 'status': 'true', getTotal });
        }
        else {
            res.json('Token is required');
        }
    } catch (error) {
        console.log('getTotalSubAmount Error', error);
        res.status(400).json(error.message);
    }
}


// count buy user subscription Start ->>>>
module.exports.totalSub = async (req, res) => {
    try {
        const tokenData = await decodeToken.decodeToken(req);
        const userId = tokenData.userId;
        if (userId) {
            const getTotalSub = await UserSubscription.count('subscriptionTitle');
            res.status(200).json({ 'status': 'true', getTotalSub });
        }
        else {
            res.json('Token is required');
        }
    } catch (error) {
        console.log('getTotalSubAmount Error', error);
        res.status(400).json(error.message);
    }
}
// count buy user subscription End ->>>>


// Count All Songs Api Start ->>>>
module.exports.countAllSong = async (req, res) => {
    try {
        const totalSong = await AdminMusic.count();
        const Drums = await AdminMusic.count({ where: { trackType: "Drums" } });
        const Vocals = await AdminMusic.count({ where: { trackType: "Vocals" } });
        const Samples = await AdminMusic.count({ where: { trackType: "Samples" } });
        const Beats = await AdminMusic.count({ where: { trackType: "Beats" } });
        const public = await AdminMusic.count({ where: { type: "public" } });
        const private = await AdminMusic.count({ where: { type: "private" } });
        const allSong = [{ totalSong }];
        const type = [{ public, private }];
        const trackType = [{ Samples, Drums, Vocals, Beats }]
        res.status('200').json({ 'status': 'true', allSong, type, trackType });
    } catch (error) {
        console.log('countAllSong Error', error);
        res.status(400).json(error.message);
    }
}
// Count All Songs Api End ->>>>


// Get all user list API start ->>>>
module.exports.user_list = async(req,res) => {
    try {
        const page = req.params.page;
        const user_list = await User.findAndCountAll({
            attributes : [
                'id','username','email','country',
                // [sequelize.fn('TIME', sequelize.col('createDate')), 'Time'],
                [sequelize.fn('DATE', sequelize.col('createDate')), 'Date']
            ],
            limit :[((page-1)*5), 5],
            order : [['topuser','DESC']]
        });
        if(user_list){
            res.status(200).json({"status":"true",user_list});
        }
        else{
            res.status(404).json({"status":"false","message":"Data not found"});
        }
    } catch (error) {
        console.log('user_list Error', error);
        res.status(400).json(error.message);
    }
}
// Get all user list API end ->>>>


// Get user detail by Id API Start ->>>>>
module.exports.user_detail = async(req,res) => {
    try {
        const userId = req.params.id;
        console.log('userId',userId)
        const data = await User.findAll({include:[{model: Donation, as: 'assciationName'}]});
        console.log('dataa',data)
    } catch (error) {
        console.log('user_detail Error', error);
        res.status(400).json(error.message);
    }
}
// Get user detail by Id API Start ->>>>>

// Get All Donation API Start ->>>>>
module.exports.totalDonation = async(req,res) => {
    try {
        const data = await Donation.sum("amount");
        res.status(200).json({'status':'true',data});
    } catch (error) {
        console.log('totalDonation Error', error);
        res.status(400).json(error.message);
    }
}
// Get All Donation API Start ->>>>>



// Logout Admin API Start ->>>>
module.exports.logOut = async (req, res) => {
    try {
        const getDataByToken = await decodeToken.decodeToken(req);
        if (getDataByToken && getDataByToken.userToken) {
            const userToken = getDataByToken.userToken;
            const response = await StoreToken.destroy({ where: { userToken: userToken } });
            if (response) {
                res.status(200).json({ 'status': 'true', "message": 'Admin LogOut Successfully' });
            }
        }
        else {
            res.status(404).json({ 'status': 'false', 'message': 'invalid credentials ' })
        }
    } catch (error) {
        console.log('LogOut Error', error);
        res.status(400).json(error.message);
    }
}
// Logout Admin API Start ->>>>