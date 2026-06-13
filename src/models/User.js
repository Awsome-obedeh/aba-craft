import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        trim: true,
        default: null

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
        default: null
       

    },

    sex: {
        type: String,
        enum: ["male", "female", "other", null],
        default: null
        
    },

    role:{
        type:String,
        enum:['vendor', 'admin', 'customer'],
        default:"vendor"
    },

    profilePicture: {
        type: String,
        default: null
        

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

    verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
    },

    verificationMethod:{
        type:String,
        enum:['NIN', 'voters_card', 'bvn'],
        required:false,
        default:null
    },

    verificationNumber:{
        type:String,
        required:false,
        default:null
    }

}, {timestamps:true});

const User=mongoose.models.User ||
mongoose.model("User", userSchema);

export default User

