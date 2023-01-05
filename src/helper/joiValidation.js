module.exports.validateSchema  = (schema, data)=> {
    const result = schema.validate(data);
    if(result.error){
        let error = {
            message : result.error.details[0].message
        }
        throw error;
    }
}