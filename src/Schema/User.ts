import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        default: 'jisetij503@sfpixel.com'
    },
    password: {
        type: String,
        require: true,
        default: "password"
    },
    id: {
        type: String,
        unique: true
    }
})

const User = mongoose.model('User', UserSchema)
export default User