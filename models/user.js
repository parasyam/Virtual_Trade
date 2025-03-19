const mongoose=require("mongoose");
const stockSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required:true,
    },

    presentPrice:{
        type:Number,
        default:0,
    }
});
const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type: String,
        required: true,
        unique: true,

    },
    password:{
        type:String,
        required:true,
    },
    favoriteStocks: [stockSchema],
    realizedProfit: { type: Number, default: 0 }
})
const User=mongoose.model("User",userSchema);
module.exports=User;