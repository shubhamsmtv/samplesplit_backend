require('dotenv').config();
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');

app.use(express.static('public'));
app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({limit: "50mb", extended : true, parameterLimit: 50000}));
app.use(express.json());
app.use(fileUpload());
app.use(cors({origin: ['http://localhost:5001', 'http://localhost:3000', 'http://192.168.29.237:5001', 'http://192.168.29.237:3000']}));

const mainRouter = require('./src/index');

app.use('/api', mainRouter);



// cron.schedule("* * */1 * * *", function() {
//     console.log("running a task every 1 hours");
// });


const port = process.env.PORT_SERVER || 5001;
app.listen(port, (req, res) => {
    console.log('Server Start At Port', port);
});     