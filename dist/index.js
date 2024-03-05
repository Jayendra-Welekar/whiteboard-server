"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("./Schema/User"));
const cors_1 = __importDefault(require("cors"));
require('dotenv').config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
console.log(process.env.MONGODB_URL);
if (process.env.MONGODB_URL) {
    mongoose_1.default.connect(process.env.MONGODB_URL);
    console.log("connected to mongoose");
}
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*"
    }
});
//Room manager
const rooms = {};
const roomCanvas = {};
let users = [];
io.on('connection', (socket) => {
    socket.emit('connection-made');
    socket.on("join-room", ({ name, room }) => {
        console.log(`${name} joined room ${room}`);
        if (!roomCanvas[room]) {
            roomCanvas[room] = [];
        }
        // Add user to the room
        socket.join(room);
        // Update user information with room
        let userIndex = users.findIndex((user) => user.socket === socket);
        if (userIndex !== -1) {
            users[userIndex].name = name;
            users[userIndex].room = room;
        }
        else {
            users.push({ socket, name, room });
        }
        userIndex = users.findIndex((user) => user.socket === socket);
        if (rooms[room]) {
            rooms[room].push(users[userIndex]);
        }
        else {
            rooms[room] = [];
            rooms[room].push(users[userIndex]);
        }
        // Send room joined confirmation and current users in the room
        const s = roomCanvas[room].length;
        const sendingUsers = rooms[room].map(user => { if (user.name != name) {
            return user.name;
        } });
        socket.emit("room-joined", { room, canvasState: roomCanvas[room][s - 1], sendingUsers });
        // Send new user notification to other users in the same room
        socket.to(room).emit("user-joined", { name });
    });
    socket.on('mouseMove', ({ x, y, room }) => {
        users.forEach(user => {
            if (user.socket == socket) {
                user.socket.to(room).emit("mouseMove", { x, y, user: user.name });
            }
        });
    });
    socket.on('newPathCreated', ({ Object, id, room, canvasState }) => {
        console.log("newPathCreated");
        if (roomCanvas[room].length < 10) {
            roomCanvas[room].push(canvasState);
        }
        else {
            roomCanvas[room].splice(0, 1);
            roomCanvas[room].push(canvasState);
        }
        console.log(roomCanvas[room].length);
        users.forEach(user => {
            if (user.socket == socket) {
                user.socket.to(room).emit("newPathCreated", { Object, id });
            }
        });
    });
    socket.on('objectAdded', ({ obj, room, canvasState }) => {
        var _a;
        console.log("New object addd");
        if (((_a = roomCanvas[room]) === null || _a === void 0 ? void 0 : _a.length) < 10) {
            roomCanvas[room].push(canvasState);
        }
        else {
            roomCanvas[room].splice(0, 1);
            roomCanvas[room].push(canvasState);
        }
        console.log(roomCanvas[room].length);
        console.log("roomCanvas.size = " + roomCanvas[room].length);
        users.forEach(user => {
            if (user.socket == socket) {
                user.socket.to(room).emit('newObjectAdded', obj);
            }
        });
    });
    socket.on('objectModify', ({ obj, room, canvasState }) => {
        users.forEach(user => {
            if (user.socket == socket) {
                user.socket.to(room).emit('newObjectModify', obj);
            }
        });
    });
    socket.on('latest-canvas', ({ canvas }) => {
        users.forEach(user => {
            if (user.socket == socket) {
                user.socket.emit("newcanvas", { canvas });
            }
        });
    });
    socket.on('objectRemove', ({ id, room, canvasState }) => {
        if (roomCanvas[room].length < 10) {
            roomCanvas[room].push(canvasState);
        }
        else {
            roomCanvas[room].splice(0, 1);
            roomCanvas[room].push(canvasState);
        }
        console.log(roomCanvas[room].length);
        console.log("roomCanvas.size = " + roomCanvas[room].length);
        users.forEach(user => {
            if (user.socket == socket) {
                user.socket.to(room).emit('removeObject', id);
            }
        });
    });
    socket.on("disconnect", () => {
        const userIndex = users.findIndex((user) => user.socket === socket);
        if (userIndex !== -1) {
            const { name, room } = users[userIndex];
            console.log(`${name} left room ${room}`);
            rooms[room] = rooms[room].filter(user => {
                if (user.name != name)
                    return user;
            });
            // Remove user from the room and users array
            console.log('eflksajdf');
            socket.leave(room);
            users.splice(userIndex, 1);
            //remove the room from entries of room
            if (rooms[room].length == 0) {
                console.log(rooms);
                delete rooms[room];
                console.log(rooms);
            }
            else {
                // Notify other users in the room about the user's departure
                socket.to(room).emit("user-left", { name });
            }
        }
    });
    socket.on('undoCanvasChange', ({ room }) => {
        console.log('undoCanvasChange');
        const size = roomCanvas[room].length;
        if (size > 1) {
            const canvasState = roomCanvas[room].pop();
            console.log("roomCanvas.size = " + roomCanvas[room].length);
            socket.emit("undoCanvasChange", { canvasState });
        }
    });
});
app.get('/', (req, res) => {
    res.json({ "hello": "hello" });
});
app.post('/newUser', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, id } = req.body;
    const newUser = yield User_1.default.create({
        name,
        email,
        password,
        id
    });
    return res.json({ newUser });
}));
app.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const user = yield User_1.default.findOne({ email: email });
    if (!user) {
        return res.status(404).json({ "error": "sign up no user found" });
    }
    else {
        if (user.password != password) {
            return res.status(403).json({ "error": "incorrect password" });
        }
    }
    return res.status(200).json({ user });
}));
app.get('/allBoards', (req, res) => {
    let allRooms = [];
    Object.keys(rooms).forEach(key => {
        allRooms.push({ key, ele: rooms[key].length });
    });
    res.status(200).json({ allRooms });
});

httpServer.listen(3000, () => {
    console.log("on port 3000");
});

