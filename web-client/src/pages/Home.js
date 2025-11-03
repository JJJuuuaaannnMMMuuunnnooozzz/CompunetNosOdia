export default function Home() {
    const container = document.createElement("div");

    // WebSocket para mensajes entrantes
    const socket = new WebSocket("ws://localhost:3002");

    socket.onopen = () => {
        console.log("Conectado al WebSocket del proxy.");
    };

    socket.onmessage = (event) => {
        try {
            const fullMessage = JSON.parse(event.data);

            const receivedBox = container.querySelector("#receivedMessages");
            const nuevo = document.createElement("div");

            if (fullMessage.command === "GET_MESSAGE") {
                const msgData = fullMessage.data;
                const sender = msgData.sender || "Desconocido";
                const content = msgData.message;

                console.log("Mensaje privado recibido:", content);
                nuevo.textContent = `[Privado] ${sender} -> TÚ: ${content}`;
                receivedBox.appendChild(nuevo);

            } else if (fullMessage.command === "GET_MSG_GROUP") {
                const msgData = fullMessage.data;
                const sender = msgData.sender || "Desconocido";
                const content = msgData.message;
                const group = msgData.group;

                console.log("Mensaje de grupo recibido:", content);
                nuevo.textContent = `[Grupo: ${group}] ${sender}: ${content}`;
                receivedBox.appendChild(nuevo);

            }

        } catch (err) {
            console.error("Error al parsear JSON del proxy:", err);
        }
    };

    container.innerHTML = `
    <h1>Proxy Chat App Test</h1>
    <div style="display: flex; gap: 20px;">
        <div style="flex: 1;">
            <h2>Usuario y Chat Privado</h2>
            <form id="registerForm">
                <h3>1. Registrar Usuario</h3>
                <input type="text" id="username" placeholder="Usuario" value="user1" required style="width: 100%; padding: 8px; margin-bottom: 5px;" />
                <input type="text" id="clientIp" placeholder="IP del cliente (ej: 127.0.0.1)" value="127.0.0.1" required style="width: 100%; padding: 8px; margin-bottom: 10px;" />
                <button type="submit">Registrar</button>
            </form>
            
            <hr>

            <form id="chatForm">
                <h3>2. Enviar Mensaje Privado</h3>
                <input type="text" id="sender" placeholder="Emisor" value="user1" required style="width: 100%; padding: 8px; margin-bottom: 5px;" />
                <input type="text" id="receiver" placeholder="Receptor" value="user2" required style="width: 100%; padding: 8px; margin-bottom: 5px;" />
                <input type="text" id="message" placeholder="Mensaje" required style="width: 100%; padding: 8px; margin-bottom: 10px;" />
                <button type="submit">Enviar Privado</button>
            </form>
        </div>

        <div style="flex: 1;">
            <h2> Funcionalidades de Grupo</h2>
            <form id="createGroupForm">
                <h3>3. Crear Grupo</h3>
                <input type="text" id="groupNameCreate" placeholder="Nombre del Grupo" value="Devs" required style="width: 100%; padding: 8px; margin-bottom: 10px;" />
                <button type="submit">Crear Grupo</button>
            </form>

            <hr>

            <form id="addToGroupForm">
                <h3>4. Añadir a Grupo</h3>
                <input type="text" id="groupNameAdd" placeholder="Nombre del Grupo" value="Devs" required style="width: 100%; padding: 8px; margin-bottom: 5px;" />
                <input type="text" id="membersToAdd" placeholder="Miembros (ej: user2,user3)" value="user2,user3" required style="width: 100%; padding: 8px; margin-bottom: 10px;" />
                <button type="submit">Añadir Miembros</button>
            </form>

            <hr>

            <form id="groupMessageForm">
                <h3>5. Enviar Mensaje a Grupo</h3>
                <input type="text" id="groupNameMsg" placeholder="Nombre del Grupo" value="Devs" required style="width: 100%; padding: 8px; margin-bottom: 5px;" />
                <input type="text" id="senderGroup" placeholder="Emisor" value="user1" required style="width: 100%; padding: 8px; margin-bottom: 5px;" />
                <input type="text" id="groupMessage" placeholder="Mensaje de Grupo" required style="width: 100%; padding: 8px; margin-bottom: 10px;" />
                <button type="submit">Enviar a Grupo</button>
            </form>
        </div>
    </div>

    <hr style="margin-top: 20px;">
    
    <h2>Resultados del Proxy</h2>
    <label for="responseBox"><strong>Respuesta HTTP del Proxy:</strong></label>
    <pre id="responseBox" style="background-color: #eee; padding: 10px; border: 1px solid #ddd; max-height: 150px; overflow-y: auto;"></pre>

    <label for="receivedMessages"><strong>Mensajes recibidos (WebSocket):</strong></label>
    <div id="receivedMessages" style="border:1px solid #ccc; padding:10px; margin-top:5px; max-height:200px; overflow-y:auto; background-color: #f9f9f9;"></div>
  `;

    const responseBox = container.querySelector("#responseBox");

    const handleFormSubmit = async (url, body, successMessage) => {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            const status = res.status;
            responseBox.textContent = `[STATUS: ${status}] ${JSON.stringify(data, null, 2)}`;
            console.log(successMessage, data);
        } catch (err) {
            responseBox.textContent = "Error: " + err.message;
            console.error("Error en la petición:", err);
        }
    };

    const registerForm = container.querySelector("#registerForm");
    registerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = container.querySelector("#username").value;
        const clientIp = container.querySelector("#clientIp").value;
        handleFormSubmit("http://localhost:3001/register", { username, clientIp }, "Registro exitoso:");
    });


    const chatForm = container.querySelector("#chatForm");
    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const sender = container.querySelector("#sender").value;
        const receiver = container.querySelector("#receiver").value;
        const message = container.querySelector("#message").value;
        handleFormSubmit("http://localhost:3001/chat", { sender, receiver, message }, "Mensaje privado enviado:");
    });


    const createGroupForm = container.querySelector("#createGroupForm");
    createGroupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const groupName = container.querySelector("#groupNameCreate").value;
        handleFormSubmit("http://localhost:3001/group/create", { groupName }, "Grupo creado:");
    });


    const addToGroupForm = container.querySelector("#addToGroupForm");
    addToGroupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const groupName = container.querySelector("#groupNameAdd").value;
        // cpnvertir en lista una entrada separada por comas
        const members = container.querySelector("#membersToAdd").value.split(',').map(m => m.trim()).filter(m => m.length > 0);
        handleFormSubmit("http://localhost:3001/group/add", { groupName, members }, "Miembros añadidos al grupo:");
    });


    const groupMessageForm = container.querySelector("#groupMessageForm");
    groupMessageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const groupName = container.querySelector("#groupNameMsg").value;
        const sender = container.querySelector("#senderGroup").value;
        const message = container.querySelector("#groupMessage").value;
        handleFormSubmit("http://localhost:3001/group/message", { groupName, sender, message }, "Mensaje de grupo enviado:");
    });

    return container;
}