const express = require('express')
const net = require('net')
const cors = require('cors')
const WebSocket = require('ws')


const app = express();
app.use(cors());
app.use(express.json());


const WSPORT = 3002;
const wss = new WebSocket.Server({ port: WSPORT });

wss.on('connection', (ws) =>{
    console.log("Cliente web iniciado")

    ws.on('close', () =>{
        console.log("Cliente web cerrado");

    });

});

const socket = new net.Socket();
let connected = false;

socket.connect(9090, "127.0.0.1", () =>{
  connected = true;
  console.log(connected)

    socket.on("data", (data) => {
        const messageStr = data.toString().trim();
        console.log(messageStr)
        try {
            const message = JSON.parse(messageStr);


            switch(message.command){
                case "GET_MESSAGE":
                    console.log("si llego el mensaje")
                    if (message.command === "GET_MESSAGE") {
                        console.log(`[ASYNC] Mensaje recibido y reenviado: ${messageStr}`);

                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(messageStr); // Envía la cadena JSON completa
                            }
                        });
                    }
                    break;

                case "GET_VOICE_CALL":
                    break;

            }

        }catch (e){

        }


    })
});




app.post('/chat',(req,res) =>{
    const { sender, receiver, message } = req.body;
    const backReq = {
        command: "MSG_USER",
        data: {
            "sender" : sender,
            "receiver" : receiver,
            "message" : message,
        }
    }
    const bodyStr = JSON.stringify(backReq)

    if(connected){
        socket.write(bodyStr)
        socket.write("\n")
        socket.once("data", (data) => {
            const message = data.toString().trim();
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

app.post('/register', async (req, res) => {
    const { username, clientIp } = req.body;

    const raw = {
        command: "REGISTER",
        data: {
            username: username,
            clientIp: clientIp
        }
    };
    const request = JSON.stringify(raw);



    if (connected) {

        socket.write(request);
        socket.write("\n");
        socket.once("data", (data) => {
            const message = data.toString().trim();

            if (message.includes("OK")) {
                res.json( message );
            } else {
                res.status(409).json(message );
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

        socket.once("message", (data) =>{
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

        socket.once("message", (data) => {
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

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Proxy escuchando en http://localhost:${PORT}`);
});






