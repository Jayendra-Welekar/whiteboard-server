import express from "express";
import { Socket, Server } from "socket.io";
import {createServer} from "http"
import mongoose from "mongoose";
import User from "./Schema/User";
import cors from "cors"

require('dotenv').config();
const app = express()
app.use(express.json())
app.use(cors())
console.log(process.env.MONGODB_URL)
if(process.env.MONGODB_URL){

    mongoose.connect(process.env.MONGODB_URL)
    console.log("connected to mongoose")
}

const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
})

interface User {
    socket: Socket,
    name: string,
    room: string
}

//Room manager
const rooms: { [key: string]: User[] } = {}; 

const roomCanvas: { [key: string]: [canvasEntry:string][] } = {}

let users: User[] = [];

io.on('connection', (socket: Socket)=>{
    socket.emit('connection-made')

    socket.on("join-room", ({ name, room }) => {
        console.log(`${name} joined room ${room}`);
        if(!roomCanvas[room]){
            roomCanvas[room] = []
        }
        // Add user to the room
        socket.join(room);
    
        // Update user information with room
        let userIndex = users.findIndex((user) => user.socket === socket);
        if (userIndex !== -1) {
          users[userIndex].name = name;
          users[userIndex].room = room;
        } else {
          users.push({ socket, name, room });
        }

        userIndex = users.findIndex((user) => user.socket === socket);

        if(rooms[room]){
            rooms[room].push(users[userIndex])
        } else {
            rooms[room] = [];
            rooms[room].push(users[userIndex])
        }

    
        // Send room joined confirmation and current users in the room
        const s = roomCanvas[room].length
        const sendingUsers = rooms[room].map(user => {if(user.name != name){ return user.name}})
        socket.emit("room-joined", { room, canvasState: roomCanvas[room][s-1], sendingUsers});
    
        // Send new user notification to other users in the same room
        socket.to(room).emit("user-joined", { name });
      });

    socket.on('mouseMove', ({x, y, room})=>{
        
        users.forEach(user => {
            if(user.socket == socket){
                user.socket.to(room).emit("mouseMove", {x, y, user: user.name})
            }
        })
    })

    socket.on('newPathCreated', ({Object, id, room, canvasState})=>{
        console.log("newPathCreated")
        if(roomCanvas[room].length < 10){
            roomCanvas[room].push(canvasState)
        } else {
            roomCanvas[room].splice(0, 1);
            roomCanvas[room].push(canvasState)
        }
        console.log(roomCanvas[room].length)

        users.forEach(user => {
            if(user.socket == socket){
                user.socket.to(room).emit("newPathCreated", {Object, id})
            }
        })
    }
    )

    socket.on('objectAdded', ({obj, room, canvasState})=>{
        console.log("New object addd")
        if(roomCanvas[room]?.length < 10){
            roomCanvas[room].push(canvasState)
        } else {
            roomCanvas[room].splice(0, 1);
            roomCanvas[room].push(canvasState)
        }
        console.log(roomCanvas[room].length)


        console.log("roomCanvas.size = " + roomCanvas[room].length)

        users.forEach(user => {
            if(user.socket == socket){
                user.socket.to(room).emit('newObjectAdded', obj)
            }
        })
    })

    socket.on('objectModify', ({obj, room, canvasState})=>{

        users.forEach(user => {
            if(user.socket == socket){
                user.socket.to(room).emit('newObjectModify', obj)
            }
        })
    })

    socket.on('latest-canvas', ({canvas})=>{
        
        users.forEach(user => {
            if(user.socket == socket){
                user.socket.emit("newcanvas", {canvas})
            }
        })
    })

    socket.on('objectRemove', ({id, room, canvasState})=>{
        if(roomCanvas[room].length < 10){
            roomCanvas[room].push(canvasState)
        } else {
            roomCanvas[room].splice(0, 1);
            roomCanvas[room].push(canvasState)
        }
        console.log(roomCanvas[room].length)


        console.log("roomCanvas.size = " + roomCanvas[room].length)

        users.forEach(user => {
            if(user.socket == socket){
                user.socket.to(room).emit('removeObject', id)
            }
        })
    })


    socket.on("disconnect", () => {
        const userIndex = users.findIndex((user) => user.socket === socket);
        if (userIndex !== -1) {
          const { name, room } = users[userIndex];
          console.log(`${name} left room ${room}`);
          
          rooms[room] = rooms[room].filter(user => {
            if(user.name != name) return user
          })

          

          // Remove user from the room and users array
          console.log('eflksajdf')
          socket.leave(room);
          users.splice(userIndex, 1);
            //remove the room from entries of room
            if(rooms[room].length == 0){
                console.log(rooms)
                delete rooms[room]
                console.log(rooms)

            }else {
                // Notify other users in the room about the user's departure
                socket.to(room).emit("user-left", { name });
            }
            
        }
      });



      socket.on('undoCanvasChange', ({room})=>{
        console.log('undoCanvasChange')
        const size = roomCanvas[room].length
        if(size > 1){
            const canvasState = roomCanvas[room].pop()
            console.log("roomCanvas.size = " + roomCanvas[room].length)
            socket.emit("undoCanvasChange", {canvasState})
        }
      })

})

httpServer.listen(3000, ()=>{
    console.log("on port 3000")
})

app.post('/newUser', async (req, res)=>{
    const {name, email, password, id} = req.body
    const newUser = await User.create({
        name,
        email,
        password,
        id
    })

    return res.json({newUser})
})

app.post('/login', async (req, res)=>{
    const {email, password} = req.body;
    const user = await User.findOne({email: email})
    if(!user){
        return res.status(404).json({"error": "sign up no user found"})
    } else {
        if(user.password != password){
            return res.status(403).json({"error": "incorrect password"})
        }
    }

    return res.status(200).json({user})
})

app.get('/allBoards', (req, res)=>{
    let allRooms: {key:string, ele: number}[] = []
    Object.keys(rooms).forEach(key => {
        allRooms.push({key, ele: rooms[key].length})
    })
    res.status(200).json({allRooms})
})

// app.listen(3000, ()=>{
//     console.log("servre active on port 3001")
// })