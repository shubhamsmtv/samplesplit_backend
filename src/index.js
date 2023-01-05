const express = require('express');
const app = express();

const adminRouter = require('./router/adminRouter');
const userRouter = require('./router/userRouter');

app.use('/admin', adminRouter);
app.use('/user', userRouter);

module.exports = app;