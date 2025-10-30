// src/pages/Home.js
export default function Home() {
    const container = document.createElement("div");
    container.innerHTML = `
    <h1>Chat App</h1>
    <form id="registerForm">
      <input type="text" id="username" placeholder="Usuario" required />
      <input type="text" id="clientIp" placeholder="IP del cliente" required />
      <button type="submit">Registrar</button>
    </form>

    <form id="chatForm">
      <input type="text" id="message" placeholder="Mensaje" required />
      <button type="submit">Enviar</button>
    </form>

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

        const message = container.querySelector("#message").value;

        try {
            const res = await fetch("http://localhost:3001/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: message }),
            });

            const data = await res.json();
            responseBox.textContent = JSON.stringify(data);
        } catch (err) {
            responseBox.textContent = "Error: " + err.message;
        }
    });

    return container;
}
