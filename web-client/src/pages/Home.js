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
      } else if (fullMessage.command === "GET_MSG_GROUP") {
        const msgData = fullMessage.data || {};
        const groupName = msgData.group || msgData.groupName || "Grupo";
        const sender = msgData.sender || "Desconocido";
        const content = msgData.message;
        nuevo.className = "ws-item";
        nuevo.innerHTML = `<span class="tag tag-group">${groupName}</span> <strong>${sender}:</strong> ${content}`;
        receivedBox?.prepend(nuevo);
      } else {
        // Otros mensajes WS (debug)
        nuevo.className = "ws-item muted";
        nuevo.textContent = JSON.stringify(fullMessage);
        receivedBox?.prepend(nuevo);
      }
    } catch (err) {
      console.error("Error al parsear JSON del proxy:", err);
    }
  };

  // UI (sidebar rediseñado: Notas de voz + Llamadas)
  container.innerHTML = `
    <div class="sidebar">
      <div class="side-header">
        <div class="avatar"></div>
        <div>
          <div class="me">Cliente HTTP</div>
          <small>Conectado</small>
        </div>
      </div>

      <div class="side-stack">
        <!-- Tarjeta: Notas de voz -->
        <div class="side-card">
          <h3 class="side-title">Notas de voz</h3>
          <p class="side-subtitle">Envía notas a un usuario o a un grupo</p>

          <div class="segmented">
            <label class="seg active">
              <input type="radio" name="vnMode" checked>
              <span>Usuario</span>
            </label>
            <label class="seg">
              <input type="radio" name="vnMode">
              <span>Grupo</span>
            </label>
          </div>

          <input class="input" type="text" placeholder="Destino (usuario o grupo)">

          <div class="row">
            <button type="button" class="btn">Abrir micrófono</button>
            <button type="button" class="btn ghost">Detener</button>
          </div>

          <button type="button" class="btn">Enviar nota</button>
        </div>

        <!-- Tarjeta: Llamadas -->
        <div class="side-card">
          <h3 class="side-title">Llamadas</h3>
          <p class="side-subtitle">Inicia/termina llamadas a usuario o grupo</p>

          <div class="segmented">
            <label class="seg active">
              <input type="radio" name="callMode" checked>
              <span>Usuario</span>
            </label>
            <label class="seg">
              <input type="radio" name="callMode">
              <span>Grupo</span>
            </label>
          </div>

          <input class="input" type="text" placeholder="Destino (usuario o grupo)">

          <div class="row">
            <button type="button" class="btn">Llamar</button>
            <button type="button" class="btn ghost">Colgar</button>
            <!-- Si prefieres rojo para colgar:
                <button type="button" class="btn danger">Colgar</button> -->
          </div>
        </div>

        <!-- Contenedor de chats oculto para no romper código existente -->
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
            <p>Se consultará automáticamente el historial del usuario loggeado.</p>
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

          <!-- 5. Enviar Mensaje a Grupo (groupName + message) -->
          <form id="groupMessageForm" class="form">
            <h3>5. Enviar Mensaje a Grupo</h3>
            <input type="text" id="groupNameMsg" placeholder="Nombre del grupo" required />
            <input type="text" id="groupMessage" placeholder="Mensaje" required />
            <button type="submit">Enviar a Grupo</button>
          </form>
        </section>
      </div>

      <!-- RESULTADOS: solo WebSocket, a todo el ancho -->
      <section class="results" style="grid-template-columns: 1fr;">
        <div class="result-box">
          <h3>Mensajes recibidos (WebSocket)</h3>
          <div id="receivedMessages" class="ws-box"></div>
        </div>
      </section>

      <!-- Modal de historial (se mantiene igual) -->
      <div id="historyModal" class="modal hidden">
        <div class="modal-content">
          <span id="closeModal" class="close">&times;</span>
          <h2>Historial completo</h2>
          <pre id="modalContent"></pre>
        </div>
      </div>

      <!-- (oculto) placeholder para no romper el código que escribe respuestas HTTP -->
      <pre id="responseBox" style="display:none"></pre>
    </div>
  `;

  // Mantengo tu bloque que intentaba renderizar chats; ahora no se verá (display:none)
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
    console.warn("No se pudo renderizar la lista (omitido):", e);
  }

  // Utilidad para peticiones HTTP al proxy (mismos endpoints)
  const responseBox = container.querySelector("#responseBox"); // oculto
  const handleFormSubmit = async (url, body, okMsg) => {
    if (responseBox) responseBox.textContent = "Cargando...";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }

      if (url.includes("/history")) {
        const modal = container.querySelector("#historyModal");
        const modalContent = container.querySelector("#modalContent");

        if (parsed?.data?.length) {
          const mensajes = parsed.data.map(msg => {
            const from = msg.from || "Desconocido";
            const to = msg.to || "Desconocido";
            const content = msg.content || "";
            const tipo = msg.type || "text";
            return `${from} → ${to} [${tipo}]: ${content}`;
          }).join("\n");

          modalContent.textContent = `Historial (${parsed.data.length} mensajes):\n\n${mensajes}`;
        } else {
          modalContent.textContent = "No hay mensajes en el historial.";
        }
        modal.classList.remove("hidden");
      } else {
        if (responseBox) {
          responseBox.textContent = `[STATUS: ${res.status}] ${typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)
            }`;
        } else {
          console.log("[RESPUESTA HTTP]", res.status, parsed);
        }
      }

      console.log(okMsg, parsed);
    } catch (err) {
      if (responseBox) responseBox.textContent = "Error: " + err.message;
      console.error("Error en la petición:", err);
    }
  };

  // Listeners (sin cambios en rutas del proxy)
  container.querySelector("#registerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = container.querySelector("#username").value;
    const clientIp = container.querySelector("#clientIp").value;
    window.loggedUser = username;
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

    if (!window.loggedUser) {
      alert("Primero registre un usuario.");
      return;
    }

    handleFormSubmit("http://localhost:3001/history", { user: window.loggedUser }, "Historial cargado:");
  });


  // 3. Crear grupo
  container.querySelector("#createGroupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const groupName = container.querySelector("#groupName").value;
    handleFormSubmit("http://localhost:3001/group/create", { groupName }, "Grupo creado:");
  });

  // 4. Añadir a grupo
  container.querySelector("#addToGroupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const groupName = container.querySelector("#groupNameAdd").value;
    const member = container.querySelector("#memberToAdd").value;
    handleFormSubmit(
      "http://localhost:3001/group/add",
      { groupName, member, username: member, members: [member] },
      "Miembro añadido al grupo:"
    );
  });

  // 5. Enviar mensaje a grupo (tu contrato: groupName + message)
  container.querySelector("#groupMessageForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const groupName = container.querySelector("#groupNameMsg").value;
    const message = container.querySelector("#groupMessage").value;
    handleFormSubmit("http://localhost:3001/group/message", { groupName, message }, "Mensaje de grupo enviado:");
  });

  // Modal Historial
  const modal = container.querySelector("#historyModal");
  const closeModal = container.querySelector("#closeModal");
  closeModal.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  return container;
}
