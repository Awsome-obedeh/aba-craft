import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        trim: true,

    },

    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
    },

    password: {
        type: String,
        required: [true, "Password is required"],
    },

    phoneNumber: {
        type: String,
       

    },

    sex: {
        type: String,
        enum: ["male", "female", "other"],
        
    },

    role:{
        type:String,
        enum:['vendor', 'admin'],
        default:"vendor"
    },

    profilePicture: {
        type: String,
        

    },

    emailVerified:{
        type:Boolean,
        default:false
    },

    onBoardingStatus:{
        type:String,
        enum:['in_progress', 'completed'],
        default:"in_progress"
    },

    verificationMethod:{
        type:String,
        enum:['NIN', 'voters_card', 'bvn'],
        required:false
    }

}, {timestamps:true});

const User=mongoose.models.User ||
mongoose.model("User", userSchema);

export default User

