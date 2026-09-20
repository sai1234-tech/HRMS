const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    departmentCode:{
        type:String,
        required:[true,'Department code is required'],
        unique:true,
        trim:true
    },
    departmentName:{
        type:String,
        required:[true,'Department name is required'],
        trim:true
    },
    managerName:{
        type:String,
        default:"",
        trim:true
    },
    description:{
        type:String,
        default:"",
        trim:true
    },
    managerEmail:{
        type:String,
        default:"",
        trim:true,
        lowercase:true
    },
    location:{
        type:String,
        default:"",
        trim:true
    },
    status:{
        type:String,
        enum:['Active','Inactive'],
        default:'Active'
    }
},
{
    timestamps:true
});

module.exports = mongoose.model('Department',departmentSchema);