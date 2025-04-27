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
        set: (v) => v || "https://i.pinimg.com/736x/9a/b0/75/9ab075d8b2f6cd9ccb084cf43ff88fd5.jpg"
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
