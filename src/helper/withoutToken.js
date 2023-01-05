const jwt = require('jsonwebtoken');
const {StoreToken} = require('../module/adminModule');

module.exports.withoutValidation = async(req, res, next)=> {
    try {
        const token = req.headers['authorization'];
        if(!token){
            next();
        }
        else{
            const splitToken = token.split(' ').pop();
            const veryifyToken = jwt.verify(splitToken, process.env.SECRET_KEY);
            const tokenNum = veryifyToken.userToken;
            const getTokenNum = await StoreToken.findOne({where : {userToken : tokenNum}});
            if(!getTokenNum){
                res.status(400).json({'status': 'false', 'message':'token Expire'})
            }
            else{
                next();
            }
        }
    } catch (error) {
        console.log('DecodeToken Error', error);
        res.status(400).json(error.message);
    }
}