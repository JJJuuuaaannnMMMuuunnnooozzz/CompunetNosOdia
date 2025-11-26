import { renderChatList } from "../components/chatList.js";
import chatDelegate from "../services/ChatDelegate.js";
import { playAudioChunk, startMicrophone, stopMicrophone } from "../components/Player.js";
import { startRecording, stopRecording } from "../components/VoiceRecorder.js";

export default function Home({ chatId } = {}) {
    const container = document.createElement("div");

    // WebSocket entrante (Proxy)
    const currentIp = window.location.hostname;

    const socket = new WebSocket(`ws://${currentIp}:3002`);

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
                nuevo.className = "ws-item muted";
                nuevo.textContent = JSON.stringify(fullMessage);
                receivedBox?.prepend(nuevo);
            }
        } catch (err) {
            console.error("Error al parsear JSON del proxy:", err);
        }
    };

    // Html
    container.innerHTML = `
    <!-- Login  -->
    <div id="loginOverlay" class="login-screen">
        <div class="login-card">
            <h2>Bienvenido al Chat</h2>
            <p>Ingresa tu usuario para conectar a ICE y Proxy</p>
            <form id="loginForm" class="form">
                <input type="text" id="loginUsername" placeholder="Nombre de usuario" required />
                <input type="text" id="loginIp" placeholder="IP del Servidor (opcional)" />
                <button type="submit">Conectar</button>
            </form>
        </div>
    </div>

    <!--main (Oculto inicialmente) -->
    <div id="mainLayout" class="layout hidden">
        <div class="sidebar">
            <div class="side-header">
                <div class="avatar"></div>
                <div>
                    <div class="me" id="displayUsername">Cliente HTTP</div>
                    <small style="color:var(--accent)">● Conectado</small>
                </div>
            </div>
            
            <!-- notitas de voz-->
            <div class="side-card">
                <h3 class="side-title">Notas de voz</h3>
                <p class="side-subtitle">Graba y envía audio por ICE</p>
                
                <div class="segmented">
                    <label class="seg active">
                        <input id="audioModeUser" type="radio" name="audioMode" checked>
                        <span>Usuario</span>
                    </label>
                    <label class="seg">
                        <input id="audioModeGroup" type="radio" name="audioMode">
                        <span>Grupo</span>
                    </label>
                </div>

                <input id="vnDestInput" class="input" type="text" placeholder="Usuario Destino">

                <div class="row">
                    <button id="audioOpenMicButton" type="button" class="btn">Grabar</button>
                    <button id="audioStopButton" type="button" class="btn ghost" disabled>Detener</button>
                </div>

                <button id="audioSendButton" type="button" class="btn" disabled>Enviar nota</button>
                <div id="audioStatus" class="muted" style="margin-top:5px; font-size:0.8em;"></div>
            </div>
            
            <!-- las llamadas van por aqui -->
            <div class="side-card">
                <h3 class="side-title">Llamadas</h3>
                <p class="side-subtitle">Inicia/termina llamadas a usuario o grupo</p>

                <div class="segmented">
                    <label class="seg active">
                        <input id="callModeUser" type="radio" name="callMode" checked>
                        <span>Usuario</span>
                    </label>
                    <label class="seg">
                        <input id="callModeGroup" type="radio" name="callMode">
                        <span>Grupo</span>
                    </label>
                </div>

                <input id="targetInputCall" class="input" type="text" placeholder="Destino (usuario o grupo)">

                <div class="row">
                    <button id="callButton" type="button" class="btn">Llamar</button>
                    <button id="hangUpButton" type="button" class="btn ghost">Colgar</button>
                </div>
            </div>

            <div id="chatList" class="chat-list"></div>
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

                    <!-- formulario de registro escondido (Necesario para la lógica interna) -->
                    <form id="registerForm" class="form hidden">
                        <h3>1. Registrar Usuario</h3>
                        <input type="text" id="username" placeholder="Usuario" required />
                        <input type="text" id="clientIp" placeholder="IP del cliente (opcional)" />
                        <button type="submit">Registrar</button>
                    </form>

                    <form id="chatForm" class="form">
                        <h3>2. Enviar Mensaje Privado</h3>
                        <!-- Sender ahora oculto, se llena solo -->
                        <input type="hidden" id="sender" />
                        <input type="text" id="receiver" placeholder="Receptor" required />
                        <input type="text" id="message" placeholder="Mensaje" required />
                        <button type="submit">Enviar Privado</button>
                    </form>

                    <form id="historyForm" class="form">
                        <h3>3. Historial Privado</h3>
                        <p>Se consultará automáticamente el historial del usuario loggeado.</p>
                        <button type="submit" class="ghost">Consultar Historial</button>
                    </form>
                </section>

                <section class="panel">
                    <h2>Funcionalidades de Grupo</h2>

                    <form id="createGroupForm" class="form">
                        <h3>3. Crear Grupo</h3>
                        <input type="text" id="groupName" placeholder="Nombre del grupo" required />
                        <button type="submit">Crear Grupo</button>
                    </form>

                    <form id="addToGroupForm" class="form">
                        <h3>4. Añadir a Grupo</h3>
                        <input type="text" id="groupNameAdd" placeholder="Nombre del grupo" required />
                        <input type="text" id="memberToAdd" placeholder="Usuario a añadir" required />
                        <button type="submit">Añadir Miembros</button>
                    </form>

                    <form id="groupMessageForm" class="form">
                        <h3>5. Enviar Mensaje a Grupo</h3>
                        <input type="text" id="groupNameMsg" placeholder="Nombre del grupo" required />
                        <input type="text" id="groupMessage" placeholder="Mensaje" required />
                        <button type="submit">Enviar a Grupo</button>
                    </form>
                </section>
            </div>

            <section class="results" style="grid-template-columns: 1fr;">
                <div class="result-box">
                    <h3>Mensajes recibidos (WebSocket)</h3>
                    <div id="receivedMessages" class="ws-box"></div>
                </div>
            </section>

            <div id="historyModal" class="modal hidden">
                <div class="modal-content">
                    <span id="closeModal" class="close">&times;</span>
                    <h2>Historial completo</h2>
                    <pre id="modalContent"></pre>
                </div>
            </div>

            <pre id="responseBox" style="display:none"></pre>
        </div>
    </div>
  `;

    const loginForm = container.querySelector("#loginForm");
    const loginOverlay = container.querySelector("#loginOverlay");
    const mainLayout = container.querySelector("#mainLayout");
    const loginUsername = container.querySelector("#loginUsername");
    const loginIp = container.querySelector("#loginIp");
    const displayUsername = container.querySelector("#displayUsername");
    const senderInput = container.querySelector("#sender");

    // 1. Cargar usuario guardado
    const savedUser = localStorage.getItem("chat_username");
    if (savedUser) loginUsername.value = savedUser;

    //Cargar IP (config.json)
    fetch('./config.json').then(r=>r.json()).then(c => {
        if(c.serverIp) loginIp.value = c.serverIp;
    }).catch(()=>{
        //Si no hay config, lo carga desde la url (normalmente da a localhost)
        const p = new URLSearchParams(window.location.search);
        if(p.get('ip')) loginIp.value = p.get('ip');
    });

    // SUBMIT DEL LOGIN
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = loginUsername.value.trim();
        const ip = loginIp.value.trim();
        if(!user) return;

        // Guardar datos
        localStorage.setItem("chat_username", user);
        window.loggedUser = user;

        // UI Transition
        loginOverlay.classList.add("hidden");
        mainLayout.classList.remove("hidden");
        displayUsername.textContent = user;
        if(senderInput) senderInput.value = user;

        // Llenar campos ocultos para compatibilidad
        container.querySelector("#username").value = user;
        container.querySelector("#clientIp").value = ip;

        // Actualizar URL para que ChatDelegate lea la IP correcta
        if (ip) {
            const u = new URL(window.location);
            u.searchParams.set("serverIp", ip);
            window.history.replaceState({}, "", u);
        }

        // Disparar registro HTTP
        handleFormSubmit(`http://${currentIp}:3001/users`, { username: user, clientIp: ip }, "POST","Registro exitoso:");

        // Inicializar ICE y conectar callbacks
        try {
            await chatDelegate.init(user);
            console.log("ICE Inicializado correctamente");

            //listeners de Ice
            setupIceCallbacks();

        } catch(err) {
            console.error("Error ICE:", err);
        }
    });


    // Botones de Audio
    const btnRec = container.querySelector("#audioOpenMicButton");
    const btnStopRec = container.querySelector("#audioStopButton");
    const btnSendAudio = container.querySelector("#audioSendButton");
    const inputAudioDest = container.querySelector("#vnDestInput");
    const audioStatus = container.querySelector("#audioStatus");

    // Botones de llamadas
    const btnCall = container.querySelector("#callButton");
    const btnHangup = container.querySelector("#hangUpButton");
    const inputCallDest = container.querySelector("#targetInputCall");
    const callModeRadios = container.querySelectorAll('input[name="callMode"]');

    let currentCallTarget = null;
    let isCurrentCallGroup = false;
    let recordedAudioBytes = null;

    // Función wrapper para los callbacks Ice
    function setupIceCallbacks() {
        chatDelegate.onAudioRecieved = (bytes) => {
            playAudioChunk(bytes);
        };

        chatDelegate.onIncomingCall = (caller) => {
            const accept = confirm(`Llamada entrante de ${caller}. ¿Contestar?`);
            if (accept) {
                chatDelegate.answerCall(caller);
                currentCallTarget = caller;
                isCurrentCallGroup = false;
                startMicrophone(caller, false);
            }
        };

        chatDelegate.onCallAccepted = (peer) => {
            alert(`Conexión establecida con ${peer}`);
            currentCallTarget = peer;
            isCurrentCallGroup = false;
            startMicrophone(peer, false);
        };

        chatDelegate.onIncomingGroupCall = (groupName, caller) => {
            const accept = confirm(`Llamada grupal entrante del grupo "${groupName}" iniciada por ${caller}. ¿Unirse?`);
            if (accept) {
                chatDelegate.answerGroupCall(groupName);
                currentCallTarget = groupName;
                isCurrentCallGroup = true;
                startMicrophone(groupName, true);
            }
        };

        chatDelegate.onGroupCallAccepted = (groupName, participant) => {
            console.log(`Usuario ${participant} se unió a la llamada grupal ${groupName}`);
            if (currentCallTarget === groupName) {
                console.log(`Nuevo participante: ${participant}`);
            }
        };

        chatDelegate.onVoiceNoteReceived = (fromUser, audioBytes) => {
            const blob = new Blob([audioBytes], { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);

            let senderDisplay = fromUser;
            let tagText = "Audio ICE";
            let tagStyle = "background:#e91e63;"

            if (fromUser.includes(":")) {
                const parts = fromUser.split(":");
                const groupName = parts[0];
                const userName = parts[1];
                senderDisplay = `${userName}`;
                tagText = `${groupName}`;
                tagStyle = "background:#2196f3;";
            }

            const box = container.querySelector("#receivedMessages");
            const div = document.createElement("div");
            div.className = "ws-item";
            div.innerHTML = `
            <span class="tag" style="${tagStyle}">${tagText}</span>
            <strong>${senderDisplay}:</strong>
            <br>
            <audio controls src="${url}" style="margin-top:5px; width:100%;"></audio>
            `;
            box?.prepend(div);
        };
    }



    // 2. BOTÓN LLAMAR
    btnCall.addEventListener("click", async () => {
        const target = inputCallDest.value.trim();
        if (!target) return alert("Escribe un usuario o grupo destino");

        // Detectar si es grupo o usuario (EXACTAMENTE COMO EL ORIGINAL)
        const isGroup = Array.from(callModeRadios).find(r => r.checked)?.nextElementSibling?.textContent === "Grupo";

        try {
            if (isGroup) {
                // Llamada grupal
                await chatDelegate.callGroup(target);
                console.log("Llamando a grupo...", target);
                currentCallTarget = target;
                isCurrentCallGroup = true;
                // Iniciar micrófono para grupo
                startMicrophone(target, true);
            } else {
                // Llamada individual
                await chatDelegate.callUser(target);
                console.log("Llamando a...", target);
                currentCallTarget = target;
                isCurrentCallGroup = false;
            }
        } catch (e) {
            console.error("Error al llamar:", e);
            alert("Error al iniciar la llamada: " + e.message);
        }
    });

    // 3. BOTÓN COLGAR
    btnHangup.addEventListener("click", () => {
        console.log("Colgando llamada...");
        stopMicrophone();
        currentCallTarget = null;
        isCurrentCallGroup = false;
        console.log("Llamada terminada");
    });


    // Notitas de voz
    btnRec.addEventListener("click", async () => {
        const started = await startRecording();
        if(started) {
            btnRec.disabled = true;
            btnRec.textContent = "Grabando...";
            btnStopRec.disabled = false;
            btnSendAudio.disabled = true;
            audioStatus.textContent = "Grabando...";
        }
    });

    btnStopRec.addEventListener("click", async () => {
        recordedAudioBytes = await stopRecording();
        btnRec.disabled = false;
        btnRec.textContent = "Grabar";
        btnStopRec.disabled = true;
        btnSendAudio.disabled = false;
        audioStatus.textContent = `Audio listo (${recordedAudioBytes.length} bytes)`;
    });

    btnSendAudio.addEventListener("click", () => {
        const target = inputAudioDest.value.trim();
        if(!target) return alert("Pon un usuario destino para el audio");
        if(!recordedAudioBytes) return alert("No hay audio grabado");

        const isGroupMode = container.querySelector('#audioModeGroup').checked;

        if (isGroupMode) {
            chatDelegate.sendGroupVoiceNote(target, recordedAudioBytes);
        } else {
            chatDelegate.sendVoiceNote(target, recordedAudioBytes);
        }

        // Reset UI
        recordedAudioBytes = null;
        btnSendAudio.disabled = true;
        audioStatus.textContent = "Enviado.";
    });

    // Utilidades UI
    const chatListEl = container.querySelector("#chatList");
    const setupSegmentedControl = (radioName) => {
        const radios = container.querySelectorAll(`input[name="${radioName}"]`);
        radios.forEach(radio => {
            radio.addEventListener("change", (e) => {
                radios.forEach(r => r.closest('.seg')?.classList.remove('active'));
                if (e.target.checked) {
                    e.target.closest('.seg')?.classList.add('active');
                }
            });
        });
    };
    setupSegmentedControl("audioMode");
    setupSegmentedControl("callMode");

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

    // HTTP Helper
    const responseBox = container.querySelector("#responseBox");
    const handleFormSubmit = async (url, body, method = "POST", okMsg) => {
        if (responseBox) responseBox.textContent = "Cargando...";
        try {
            const options = {
                method: method,
                headers: { "Content-Type": "application/json" },
            };
            if (method !== "GET") options.body = JSON.stringify(body);

            const res = await fetch(url, options);
            const text = await res.text();
            let parsed;
            try { parsed = JSON.parse(text); } catch { parsed = text; }

            if (url.includes("/history") && method === "GET") {
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
                    responseBox.textContent = `[STATUS: ${res.status}] ${typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}`;
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


    container.querySelector("#chatForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const sender = container.querySelector("#sender").value;
        const receiver = container.querySelector("#receiver").value;
        const message = container.querySelector("#message").value;
        handleFormSubmit(`http://${currentIp}:3001/messages`, { sender, receiver, message }, "POST","Mensaje privado enviado:");
        container.querySelector("#message").value = "";
    });

    container.querySelector("#historyForm").addEventListener("submit", (e) => {
        e.preventDefault();
        if (!window.loggedUser) return alert("Primero registre un usuario.");
        handleFormSubmit(`http://${currentIp}:3001/users/${window.loggedUser}/history`, null,"GET","Historial cargado:");
    });

    container.querySelector("#createGroupForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const groupName = container.querySelector("#groupName").value;
        handleFormSubmit(`http://${currentIp}:3001/groups`, { groupName }, "POST","Grupo creado:");
    });

    container.querySelector("#addToGroupForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const groupName = container.querySelector("#groupNameAdd").value;
        const member = container.querySelector("#memberToAdd").value;
        handleFormSubmit(
            `http://${currentIp}:3001/groups/${groupName}/members`,
            { members: [member] },
            "POST",
            "Miembro añadido al grupo:"
        );
    });

    container.querySelector("#groupMessageForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const message = container.querySelector("#groupMessage").value;
        const groupName = container.querySelector("#groupNameMsg").value;
        handleFormSubmit(`http://${currentIp}:3001/groups/${groupName}/messages`, { message }, "POST","Mensaje de grupo enviado:");
    });

    const modal = container.querySelector("#historyModal");
    const closeModal = container.querySelector("#closeModal");
    closeModal.addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

    return container;
}
