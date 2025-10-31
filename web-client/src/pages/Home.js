export default function Home() {
    const container = document.createElement("div");

    const socket = new WebSocket("ws://localhost:3002");
    // Home.js (Frontend)
    socket.onmessage = (event) => {
        try {
            const fullMessage = JSON.parse(event.data);

            if (fullMessage.command === "GET_MESSAGE") {

                const msgData = fullMessage.data;

                const sender = msgData.sender || "Desconocido";
                const content = msgData.message;

                console.log("Mensaje recibido:", content);

                const receivedBox = container.querySelector("#receivedMessages");
                const nuevo = document.createElement("div");

                nuevo.textContent = `${sender}: ${content}`;
                receivedBox.appendChild(nuevo);
            }

        } catch (err) {
            console.error("Error al parsear JSON del proxy:", err);
        }
    };

    container.innerHTML = `
    <h1>Chat App</h1>
    <form id="registerForm">
      <input type="text" id="username" placeholder="Usuario" required />
      <input type="text" id="clientIp" placeholder="IP del cliente" required />
      <button type="submit">Registrar</button>
    </form>

    <form id="chatForm">
      <input type="text" id="sender" placeholder="Emisor" required />
      <input type="text" id="receiver" placeholder="Receptor" required />
      <input type="text" id="message" placeholder="Mensaje" required />
      <button type="submit">Enviar</button>
    </form>

    <label for="receivedMessages"><strong>Mensajes recibidos:</strong></label>
    <div id="receivedMessages" style="border:1px solid #ccc; padding:10px; margin-top:5px; max-height:200px; overflow-y:auto;"></div>

    <pre id="responseBox"></pre>
  `;

    const registerForm = container.querySelector("#registerForm");
    const chatForm = container.querySelector("#chatForm");
    const responseBox = container.querySelector("#responseBox");

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = container.querySelector("#username").value;
        const clientIp = container.querySelector("#clientIp").value;
        try {
            const res = await fetch("http://localhost:3001/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, clientIp })
            });

            const data = await res.json();
            responseBox.textContent = JSON.stringify(data);
        } catch (err) {
            responseBox.textContent = "Error: " + err.message;
        }
    });

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const sender = container.querySelector("#sender").value;
        const receiver = container.querySelector("#receiver").value;
        const message = container.querySelector("#message").value;

        try {
            const res = await fetch("http://localhost:3001/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sender, receiver, message }),
            });

            const data = await res.json();
            responseBox.textContent = JSON.stringify(data);
        } catch (err) {
            responseBox.textContent = "Error: " + err.message;
        }
    });

    return container;
}
