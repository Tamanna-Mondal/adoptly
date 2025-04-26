const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adoptSchema = new Schema({
    category: {
        type: String,
        required: true
    },
    breed: {
        type: String,
        required: true
    },
    age: {
        type: String,
        required: true
    },
    gender : {
        type: String,
        
    },
    place: {
        type: String,
        required: true
    },
    price: Number,
    image: {
        type: String,
        set: (v) => v || "https://i.pinimg.com/736x/b4/55/1f/b4551f8d549b7e6f7f63d789fa06fb3b.jpg"
    },
    description: {
        type: String,
        required: true
    },
    food_suggestions: {
        type: String,
       
    },
    medicine: {
        type: String,
       
    },
    care_suggestions: {
        type: String,
       
    },
    owner: {
        type:Schema.Types.ObjectId,
        ref:'User' 
    }
});

const Adopt = mongoose.model("Adopt", adoptSchema);
module.exports = Adopt;
