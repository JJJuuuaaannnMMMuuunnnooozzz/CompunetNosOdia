const express = require('express')
const net = require('net')
const cors = require('cors')


const socket = new net.Socket();
let connected = false;

socket.connect(9090, "127.0.0.1", () =>{
  connected = true;
})


const app = express();
app.use(cors());
const port = 3000
app.use(express.json());

app.post('/chat',(req,res) =>{
    const body = req.body
    const backReq = {
        command: "MSG_USER",
        data: body
    }
    const bodyStr = JSON.stringify(backReq)
    if(connected){
        socket.write(bodyStr)
        socket.write("\n")
        socket.once("data", (data) => {
            const message = data.toString().trim();
            console.log("Respuesta del servidor:", message);
            try{
                res.json(JSON.parse(message));
            }catch(e){
                res.status(500).json({ error: "Error al procesar la respuesta del servidor" });
            }
        });
    }else{
        res.status(500).json({ error: "Socket no conectado" });
    }


});

app.post('/register', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: "Falta el campo 'username' en el cuerpo de la solicitud." });
    }

    const command = `REGISTER ${username}`;

    if (connected) {

        socket.write(command);
        socket.write("\n");

        socket.once("data", (data) => {
            const message = data.toString().trim();
            console.log(`Respuesta del servidor para registro de ${username}:`, message);

            if (message.includes("Bienvenido") || !message.includes("uso")) {
                res.json({ success: true, message: message });
            } else {
                res.status(409).json({ success: false, error: message });
            }
        });

        socket.once('error', (err) => {
            console.error('Error de socket durante el registro:', err);
            res.status(500).json({ error: "Error de conexión con el servidor de chat." });
        });

    } else {
        res.status(503).json({ error: "Socket no conectado al servidor Java." });
    }
});

app.post('/group/create', (req, res) =>{
    const { groupName } = req.body

    if(!groupName){
        return res.status(400).json( {error: "No esta el nombre del grupo"})
    }

    const command = 'CREATE_GROUP' + {groupName}
    if(connected){
        socket.write(command)
        socket.write("\n")

        socket.once("data", (data) =>{
            const message = data.toString().trim();
            console.log("Respuesta del servidor (CREATE_GROUP):", message);

            if (message.includes("creado") && message.includes(groupName) || !message.includes("existe")) {
                res.json({ success: true, message: message });
            } else {
                res.status(409).json({ success: false, error: message });
            }
        })



    }else{
        res.status(500).json({ error: "Socket no conectado" });
    }
})

app.post('/group/add', (req, res) => {

    const { groupName, targetUser } = req.body;

    if (!groupName || !targetUser) {
        return res.status(400).json({ error: "Faltan los campos 'groupName' o 'targetUser'." });
    }

    const command = `ADD_TO_GROUP ${groupName} ${targetUser}`;

    if (connected) {
        socket.write(command);
        socket.write("\n");

        socket.once("data", (data) => {
            const message = data.toString().trim();
            console.log("Respuesta del servidor (ADD_TO_GROUP):", message);

            if (message.includes("agregado") && message.includes(targetUser) || !message.includes("no existe")) {
                res.json({ success: true, message: message });
            } else {
                res.status(404).json({ success: false, error: message });
            }
        });

        socket.once('error', (err) => {
            console.error('Error de socket durante ADD_TO_GROUP:', err);
            res.status(500).json({ error: "Error de conexión con el servidor de chat." });
        });

    } else {
        res.status(503).json({ error: "Socket no conectado al servidor Java." });
    }
});





