const jwt = require('jsonwebtoken');

module.exports.decodeToken = (req) =>{
    return new Promise((response, reject) =>{
        const userToken = req.headers['authorization'];
        const bearer = userToken.split(" ").pop();
        const getuserData = jwt.verify(bearer, process.env.SECRET_KEY);
        if(!getuserData){
            reject(error);
        }
        else{
            response(getuserData);
        }
    })
}