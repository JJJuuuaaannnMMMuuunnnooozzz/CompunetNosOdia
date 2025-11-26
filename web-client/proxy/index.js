const express = require('express')
const net = require('net')
const cors = require('cors')
const WebSocket = require('ws')

const app = express();
app.use(cors()); // Permite peticiones desde Apache
app.use(express.json());

// node proxy/index.js
const args = process.argv.slice(2);
const JAVA_SERVER_IP = args[0] || "127.0.0.1"; // IP donde corre el Server.jar

// Configuración de red para que sea accesible desde fuera
const BIND_IP = "0.0.0.0"; // Escuchar en TODAS las interfaces
const WSPORT = 3002;
const HTTP_PORT = 3001;

// --- Servidor WebSocket ---

const wss = new WebSocket.Server({ port: WSPORT, host: BIND_IP });

wss.on('connection', (ws) => {
    console.log("Cliente web conectado al WebSocket Proxy");
    ws.on('close', () => {
        console.log("Cliente web desconectado");
    });
});

// --- Conexión al Backend Java (TCP) ---
const socket = new net.Socket();
let connected = false;

console.log(`Conectando al backend Java en ${JAVA_SERVER_IP}:9090...`);
socket.connect(9090, JAVA_SERVER_IP, () => {
    connected = true;
    console.log(`Conectado exitosamente al backend Java (${JAVA_SERVER_IP}:9090)`);

    // Escuchar mensajes que llegan desde Java
    socket.on("data", (data) => {
        const messageStr = data.toString().trim();
        try {

            const lines = messageStr.split('\n');
            lines.forEach(line => {
                if(!line) return;
                try {
                    const message = JSON.parse(line);
                    // Reenviar eventos a todos los clientes web conectados
                    if (message.command === "GET_MESSAGE" || message.command === "GET_MSG_GROUP") {
                        wss.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(message));
                            }
                        });
                    }
                } catch(e) {
                    console.log(e);
                }
            });
        } catch (e) {
            console.error("Error procesando data del socket:", e);
        }
    });
});

socket.on('error', (err) => {
    console.error("Error en conexión con Java:", err.message);
    connected = false;
});

socket.on('close', () => {
    console.warn("Conexión con Java cerrada. Reintentando...");
    connected = false;
    setTimeout(() => {
        socket.connect(9090, JAVA_SERVER_IP);
    }, 3000);
});


// --- Endpoints HTTP (Express) ---

app.post('/messages', (req, res) => {
    const { sender, receiver, message } = req.body;
    const backReq = {
        command: "MSG_USER",
        data: { "sender": sender, "receiver": receiver, "message": message }
    }
    sendToJava(backReq, res);
});

app.post('/users', (req, res) => {
    const { username, clientIp } = req.body;
    console.log("Registrando usuario:", username);
    const raw = {
        command: "REGISTER",
        data: { username: username, clientIp: clientIp }
    };
    sendToJava(raw, res);
});

app.get('/users/:username/history', (req, res) => {
    const user = req.params.username;
    const payload = {
        command: "GET_HISTORY",
        data: { user: user }
    };
    sendToJava(payload, res);
});

app.post('/groups', (req, res) => {
    const { groupName } = req.body;
    const raw = {
        command: "CREATE_GROUP",
        data: { group: groupName }
    };
    sendToJava(raw, res);
});

app.post('/groups/:groupName/members', (req, res) => {
    const groupName = req.params.groupName;
    const { members } = req.body;
    const payload = {
        command: "ADD_TO_GROUP",
        data: { group: groupName, members: members }
    };

    sendToOneWayJava(payload, res);
});

app.post('/groups/:groupName/messages', (req, res) => {
    const groupName = req.params.groupName;
    const { sender, message } = req.body;
    const payload = {
        command: "MSG_GROUP",
        data: { group: groupName, sender: sender, message: message }
    };
    sendToOneWayJava(payload, res);
});


// --- Funciones Helper para no repetir código ---

function sendToJava(jsonObj, res) {
    if (connected) {
        socket.write(JSON.stringify(jsonObj));
        socket.write("\n");

        // Esperamos una respuesta única
        socket.once("data", (data) => {
            const message = data.toString().trim();
            try {
                const parsed = JSON.parse(message);
                res.json(parsed);
            } catch (e) {

                if (message.includes("OK")) res.json(message);
                else res.json({ raw: message });
            }
        });
    } else {
        res.status(503).json({ error: "Socket no conectado al servidor Java." });
    }
}

function sendToOneWayJava(jsonObj, res) {
    if (connected) {
        socket.write(JSON.stringify(jsonObj));
        socket.write("\n");

        res.json({ success: true, status: "sent" });
    } else {
        res.status(503).json({ error: "Socket no conectado al servidor Java." });
    }
}

// --- Iniciar Servidor ---
app.listen(HTTP_PORT, BIND_IP, () => {
    console.log(`Proxy HTTP escuchando en http://${BIND_IP}:${HTTP_PORT}`);
    console.log(`Proxy WS escuchando en ws://${BIND_IP}:${WSPORT}`);
});
