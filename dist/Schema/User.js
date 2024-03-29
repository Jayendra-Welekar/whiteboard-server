"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const UserSchema = new mongoose_1.default.Schema({
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
});
const User = mongoose_1.default.model('User', UserSchema);
exports.default = User;
