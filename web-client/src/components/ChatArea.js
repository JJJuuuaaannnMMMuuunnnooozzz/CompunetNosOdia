import ChatDelegate from "../services/ChatDelegate.js";

export function createChatArea(currentUser) {
    const container = document.createElement("main");
    container.className = "chat-area empty";

    // Estado inicial vacío
    container.innerHTML = `
        <div class="empty-state">
            <h2>Bienvenido al Chat P2P</h2>
            <p>Selecciona un chat para comenzar a enviar mensajes o llamar.</p>
        </div>
    `;

    // Método para cargar un chat específico
    container.loadChat = (targetName, type) => {
        container.className = "chat-area";
        container.innerHTML = `
            <header class="chat-header">
                <div class="chat-title">
                    <div class="avatar">${type === 'group' ? 'G' : 'I'}</div>
                    <h3>${targetName}</h3>
                </div>
                <div class="chat-actions">
                    ${type === 'user' ? `<button id="btnCall" class="icon-btn" title="Llamar"> </button>` : ''}
                </div>
            </header>
            
            <div class="messages-container" id="msgsBox">
                <!-- Mensajes aquí -->
            </div>
            
            <footer class="chat-input">
                <input type="text" placeholder="Escribe un mensaje..." id="msgInput">
                <button id="btnSend">➤</button>
            </footer>

            <div id="callOverlay" class="call-overlay hidden">
                <div class="call-card">
                    <h3 id="callStatus">Llamando...</h3>
                    <div class="avatar large">I</div>
                    <h2 id="callTarget">${targetName}</h2>
                    <div class="call-controls">
                        <button id="btnAnswer" class="btn-circle green hidden">📞</button>
                        <button id="btnHangup" class="btn-circle red">❌</button>
                    </div>
                </div>
            </div>
        `;

        // Lógica de Mensajes (REST / Proxy WS)
        const btnSend = container.querySelector("#btnSend");
        const input = container.querySelector("#msgInput");

        const sendMessage = () => {
            const txt = input.value.trim();
            if(!txt) return;
            //Ahora lo hago
            console.log("Enviar mensaje texto:", txt);
            input.value = "";
        };

        btnSend.onclick = sendMessage;
        input.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };

        // Llamada individuo a individuo
        if(type === 'user') {
            const btnCall = container.querySelector("#btnCall");
            btnCall.onclick = () => startCallUI(targetName);
        }

        // Referencias para manejo de llamadas externo
        container.callOverlay = container.querySelector("#callOverlay");
        container.statusLabel = container.querySelector("#callStatus");
        container.btnAnswer = container.querySelector("#btnAnswer");
        container.btnHangup = container.querySelector("#btnHangup");

        // Evento de colgar
        container.btnHangup.onclick = () => {
            endCallUI();
            location.reload(); // Solución simple para limpiar estado de audio por ahora
        };
    };

    // Helpers UI
    const startCallUI = (target) => {
        container.callOverlay.classList.remove("hidden");
        container.statusLabel.textContent = "Llamando...";
        container.btnAnswer.classList.add("hidden");
        ChatDelegate.callUser(target);
    };

    const endCallUI = () => {
        container.callOverlay.classList.add("hidden");
    };

    // Métodos expuestos para que Home.js los use al recibir eventos ICE
    container.showIncomingCall = (caller) => {

        container.callOverlay.classList.remove("hidden");
        container.querySelector("#callTarget").textContent = caller;
        container.statusLabel.textContent = "Llamada Entrante";
        container.btnAnswer.classList.remove("hidden");

        // Configurar botón contestar dinámicamente
        container.btnAnswer.onclick = () => {
            container.statusLabel.textContent = "Conectado";
            container.btnAnswer.classList.add("hidden");
            ChatDelegate.answerCall(caller);
            // Iniciar lógica de audio aquí (o delegarla al callback onCallAccepted)
        };
    };

    container.setCallActive = () => {
        container.statusLabel.textContent = "En llamada";
        container.btnAnswer.classList.add("hidden");
    };

    return container;
}
