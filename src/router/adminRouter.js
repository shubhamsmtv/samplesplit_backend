const express = require('express');
const app = express();

const adminController = require('../controller/adminController');
const validatetoken = require('../helper/validatetoken');
const sendMail = require('../helper/sendEmail');

app.post('/login', adminController.login);
app.post('/forgetPassword', adminController.sendOTP);
app.post('/otpVerify', adminController.otpverify);
app.put('/resetPassword', adminController.resetPassword);
app.post('/audioUpload', validatetoken.validateToken, adminController.audioUpload);
app.get('/getAllAudio',validatetoken.validateToken, adminController.getAllAudio);
app.get('/editAudio/:audioId',validatetoken.validateToken, adminController.editAudio);
app.post('/updateAudioById/:audioId', validatetoken.validateToken, adminController.updateMusic);
app.get('/changeStatus/:audioId',validatetoken.validateToken, adminController.changeStatus);
app.post('/AddPayment', validatetoken.validateToken, adminController.AddPayment);
app.delete('/deleteAudio/:audioId',validatetoken.validateToken, adminController.deleteAudio);
app.get('/getAdminProfile', validatetoken.validateToken, adminController.getProfile);
app.post('/updateProfile', validatetoken.validateToken, adminController.updateProfile);
app.post('/changePassword', validatetoken.validateToken, adminController.changePassword);
app.get('/topTrack', validatetoken.validateToken, adminController.getTopTrack);
app.get('/toptrackByDate', validatetoken.validateToken, adminController.topTrackByDate);
app.post('/createBlog', validatetoken.validateToken, adminController.createBlog);
app.get('/getTopFans', validatetoken.validateToken, adminController.topFans);
app.post('/createSubscription', validatetoken.validateToken, adminController.createSubscription);
app.delete('/logOut', validatetoken.validateToken, adminController.logOut);
app.get('/getTotalSubAmount',validatetoken.validateToken, adminController.getTotalSubAmount);
app.get('/totalSubByuser', validatetoken.validateToken, adminController.totalSub);
app.get('/getAllBlog', validatetoken.validateToken, adminController.getAllBlog);
app.get('/getBlogById/:id', validatetoken.validateToken, adminController.getBlogById);
app.put('/updateBlogById/:blogId', validatetoken.validateToken, adminController.updateBlogById);
app.delete('/deleteblog/:blogId', validatetoken.validateToken, adminController.deleteBlog);
app.get('/countAllSong', validatetoken.validateToken, adminController.countAllSong);
app.get('/getAlluser/:page', validatetoken.validateToken, adminController.user_list);
app.get('/getuserDetiails/:id',  adminController.user_detail);
app.get ('/getAllDonation', validatetoken.validateToken, adminController.totalDonation);

module.exports = app;   