import ChatDelegate from "../services/ChatDelegate.js";
import { createSidebar } from "../components/Sidebar.js";
import { createChatArea } from "../components/ChatArea.js";

export default function Home() {
    const root = document.createElement("div");
    root.className = "app-container";

    root.innerHTML = `
        <div class="login-screen">
            <div class="login-card">
                <h2>Ingresar a Compunet Chat</h2>
                <input type="text" id="userInput" placeholder="Tu usuario (ej: johan)">
                <button id="btnLogin">Entrar</button>
            </div>
        </div>
    `;

    setTimeout(() => {
        const btnLogin = root.querySelector("#btnLogin");
        const userInput = root.querySelector("#userInput");

        btnLogin.onclick = async () => {
            const username = userInput.value.trim();
            if(!username) return;

            btnLogin.textContent = "Conectando...";
            try {
                // 1. Inicializar ICE
                await ChatDelegate.init(username);

                // 2. Renderizar interfaz principal
                renderMainLayout(username);
            } catch (e) {
                console.error(e);
                alert("Error conectando a servicios: " + e.message);
                btnLogin.textContent = "Entrar";
            }
        };
    }, 0);

    // Función principal de renderizado
    const renderMainLayout = (username) => {
        root.innerHTML = ""; // Limpiar login
        root.classList.add("logged-in");

      //necesito cargar los usuarios y grupos

        // Crear componentes
        const chatArea = createChatArea(username);

        const sidebar = createSidebar(username, myContacts, myGroups, (target, type) => {
            // Al hacer click en un chat
            chatArea.loadChat(target, type);
        });

        root.appendChild(sidebar);
        root.appendChild(chatArea);


        let audioCtx = null;
        let isCalling = false;

        // 1. Al recibir llamada
        ChatDelegate.onIncomingCall = (caller) => {
            if(chatArea.showIncomingCall) {
                chatArea.showIncomingCall(caller);
            }
        };

        // 2. Al aceptar/conectarse
        ChatDelegate.onCallAccepted = (peer) => {
            if(chatArea.setCallActive) chatArea.setCallActive();
            isCalling = true;
            startMicrophone(peer);
        };

        // 3. Al recibir audio
        ChatDelegate.onAudioReceived = (bytes) => {
            playAudioChunk(bytes);
        };

        // logica de audio para llamadas
        const playAudioChunk = (bytes) => {
            if (!bytes || bytes.length === 0) return;
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            const uint8 = new Uint8Array(bytes);
            const buffer = audioCtx.createBuffer(1, uint8.length / 2, 44100);
            const channelData = buffer.getChannelData(0);

            for (let i = 0; i < channelData.length; i++) {
                const lo = uint8[i * 2];
                const hi = uint8[i * 2 + 1];
                let sample = (hi << 8) | lo;
                if (sample >= 0x8000) sample = sample - 0x10000;
                channelData[i] = sample / 32768.0;
            }

            const src = audioCtx.createBufferSource();
            src.buffer = buffer;
            src.connect(audioCtx.destination);
            src.start();
        };

        const startMicrophone = async (target) => {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = audioCtx.createMediaStreamSource(stream);
                const processor = audioCtx.createScriptProcessor(2048, 1, 1);

                processor.onaudioprocess = (e) => {
                    if (!isCalling) return;

                    const input = e.inputBuffer.getChannelData(0);
                    const buffer = new ArrayBuffer(input.length * 2);
                    const view = new DataView(buffer);

                    for (let i = 0; i < input.length; i++) {
                        let s = Math.max(-1, Math.min(1, input[i]));
                        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                    }

                    const bytes = new Uint8Array(buffer);
                    ChatDelegate.sendAudioChunk(target, bytes);
                };

                source.connect(processor);
                processor.connect(audioCtx.destination);
            } catch(err) {
                console.error("Error micrófono:", err);
                alert("No se pudo acceder al micrófono");
            }
        };
    };

    return root;
}
