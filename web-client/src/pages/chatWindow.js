export function renderChatWindow(container, chatId) {
    container.innerHTML = `
    <h2>Chat con ID: ${chatId}</h2>
    <div class="messages">Aquí irían los mensajes...</div>
    <input type="text" placeholder="Escribe un mensaje..." />
  `;


}
