// web-client/src/pages/Home.js
import { renderChatList } from "../components/chatList.js";

export default function Home({ chatId } = {}) {
  const container = document.createElement("div");
  container.className = "layout";

  // WebSocket entrante (sin cambios de endpoints ni formato)
  const socket = new WebSocket("ws://localhost:3002");
  socket.onopen = () => console.log("Conectado al WebSocket del proxy.");
  socket.onmessage = (event) => {
    try {
      const fullMessage = JSON.parse(event.data);
      const receivedBox = container.querySelector("#receivedMessages");
      const nuevo = document.createElement("div");

      if (fullMessage.command === "GET_MESSAGE") {
        const msgData = fullMessage.data || {};
        const sender = msgData.sender || "Desconocido";
        const content = msgData.message;
        nuevo.className = "ws-item";
        nuevo.innerHTML = `<span class="tag">Privado</span> <strong>${sender}:</strong> ${content}`;
        receivedBox?.prepend(nuevo);
      } else if (fullMessage.command === "GET_GROUP_MESSAGE") {
        const msgData = fullMessage.data || {};
        const groupName = msgData.groupName || "Grupo";
        const sender = msgData.sender || "Desconocido";
        const content = msgData.message;
        nuevo.className = "ws-item";
        nuevo.innerHTML = `<span class="tag tag-group">${groupName}</span> <strong>${sender}:</strong> ${content}`;
        receivedBox?.prepend(nuevo);
      } else {
        nuevo.className = "ws-item muted";
        nuevo.textContent = JSON.stringify(fullMessage);
        receivedBox?.prepend(nuevo);
      }
    } catch (err) {
      console.error("Error al parsear JSON del proxy:", err);
    }
  };

  // UI
  container.innerHTML = `
    <div class="sidebar">
      <div class="side-header">
        <div class="avatar"></div>
        <div>
          <div class="me">Cliente HTTP</div>
          <small>Conectado</small>
        </div>
      </div>
      <div class="side-section">
        <h3>Chats</h3>
        <div id="chatList" class="chat-list"></div>
      </div>
    </div>

    <div class="main">
      <header class="main-header">
        <div>
          <h1>Proxy Chat (HTTP)</h1>
          <p class="muted">Crea grupos, envía mensajes y consulta historial vía proxy Express → backend Java (TCP)</p>
        </div>
        ${chatId ? `<div class="pill">Chat seleccionado: <strong>${chatId}</strong></div>` : ""}
      </header>

      <div class="panels">
        <section class="panel">
          <h2>Usuario y Chat Privado</h2>

          <form id="registerForm" class="form">
            <h3>1. Registrar Usuario</h3>
            <input type="text" id="username" placeholder="Usuario" required />
            <input type="text" id="clientIp" placeholder="IP del cliente (opcional)" />
            <button type="submit">Registrar</button>
          </form>

          <form id="chatForm" class="form">
            <h3>2. Enviar Mensaje Privado</h3>
            <input type="text" id="sender" placeholder="Emisor" required />
            <input type="text" id="receiver" placeholder="Receptor" required />
            <input type="text" id="message" placeholder="Mensaje" required />
            <button type="submit">Enviar Privado</button>
          </form>

          <form id="historyForm" class="form">
            <h3>3. Historial Privado</h3>
            <input type="text" id="historyUser" placeholder="Usuario" required />
            <button type="submit">Consultar Historial</button>
          </form>
        </section>

        <section class="panel">
          <h2>Funcionalidades de Grupo</h2>

          <!-- 3. Crear Grupo (solo nombre) -->
          <form id="createGroupForm" class="form">
            <h3>3. Crear Grupo</h3>
            <input type="text" id="groupName" placeholder="Nombre del grupo" required />
            <button type="submit">Crear Grupo</button>
          </form>

          <!-- 4. Añadir a Grupo (grupo + miembro único) -->
          <form id="addToGroupForm" class="form">
            <h3>4. Añadir a Grupo</h3>
            <input type="text" id="groupNameAdd" placeholder="Nombre del grupo" required />
            <input type="text" id="memberToAdd" placeholder="Usuario a añadir" required />
            <button type="submit">Añadir Miembros</button>
          </form>

          <!-- 5. Enviar Mensaje a Grupo (grupo + emisor + mensaje) -->
          <form id="groupMessageForm" class="form">
            <h3>5. Enviar Mensaje a Grupo</h3>
            <input type="text" id="groupNameMsg" placeholder="Nombre del grupo" required />
            <input type="text" id="senderGroup" placeholder="Emisor" required />
            <input type="text" id="groupMessage" placeholder="Mensaje" required />
            <button type="submit">Enviar a Grupo</button>
          </form>
        </section>
      </div>

      <section class="results">
        <div class="result-box">
          <h3>Respuesta HTTP del Proxy</h3>
          <pre id="responseBox"></pre>
        </div>
        <div class="result-box">
          <h3>Mensajes recibidos (WebSocket)</h3>
          <div id="receivedMessages" class="ws-box"></div>
        </div>
      </section>
    </div>
  `;

  // Sidebar: demo (no toca backend)
  const chatListEl = container.querySelector("#chatList");
  try {
    const sample = [
      { id: "ana", name: "Ana", lastMessage: "¿Listo para la demo?" },
      { id: "equipo", name: "Equipo SID2", lastMessage: "Reunión 7pm" },
    ];
    renderChatList(chatListEl, sample);

    if (chatId) {
      const recv = container.querySelector("#receiver");
      const groupNameMsg = container.querySelector("#groupNameMsg");
      if (recv) recv.value = chatId;
      if (groupNameMsg) groupNameMsg.value = chatId;
    }
  } catch (e) {
    console.warn("No se pudo renderizar la lista de chats:", e);
  }

  // Utilidad para peticiones HTTP al proxy (mismos endpoints)
  const responseBox = container.querySelector("#responseBox");
  const handleFormSubmit = async (url, body, okMsg) => {
    responseBox.textContent = "Cargando...";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      responseBox.textContent = `[STATUS: ${res.status}] ${typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}`;
      console.log(okMsg, parsed);
    } catch (err) {
      responseBox.textContent = "Error: " + err.message;
      console.error("Error en la petición:", err);
    }
  };

  // Listeners (sin cambios en rutas del proxy)
  container.querySelector("#registerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = container.querySelector("#username").value;
    const clientIp = container.querySelector("#clientIp").value;
    handleFormSubmit("http://localhost:3001/register", { username, clientIp }, "Registro exitoso:");
  });

  container.querySelector("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const sender = container.querySelector("#sender").value;
    const receiver = container.querySelector("#receiver").value;
    const message = container.querySelector("#message").value;
    handleFormSubmit("http://localhost:3001/chat", { sender, receiver, message }, "Mensaje privado enviado:");
  });

  container.querySelector("#historyForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const historyUser = container.querySelector("#historyUser").value;
    handleFormSubmit("http://localhost:3001/history", { user: historyUser }, "Historial cargado:");
  });

  // 3. Crear grupo (solo groupName)
  container.querySelector("#createGroupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const groupName = container.querySelector("#groupName").value;
    // Enviar solo el nombre del grupo, tal como tu backend original espera
    handleFormSubmit("http://localhost:3001/group/create", { groupName }, "Grupo creado:");
  });

  // 4. Añadir a grupo (groupName + member único)
  container.querySelector("#addToGroupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const groupName = container.querySelector("#groupNameAdd").value;
    const member = container.querySelector("#memberToAdd").value;
    // Enviar las variantes más comunes para compatibilidad con tu proxy original
    handleFormSubmit(
      "http://localhost:3001/group/add",
      { groupName, member, username: member, members: [member] },
      "Miembro añadido al grupo:"
    );
  });

  // 5. Enviar mensaje a grupo (groupName + sender + message)
  container.querySelector("#groupMessageForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const groupName = container.querySelector("#groupNameMsg").value;
    const sender = container.querySelector("#senderGroup").value;
    const message = container.querySelector("#groupMessage").value;
    handleFormSubmit("http://localhost:3001/group/message", { groupName, sender, message }, "Mensaje de grupo enviado:");
  });

  return container;
}