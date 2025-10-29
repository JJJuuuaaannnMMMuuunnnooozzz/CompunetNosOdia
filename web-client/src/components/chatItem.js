export function createChatItem(chat) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.innerHTML = `
    <h4>${chat.name}</h4>
    <p>${chat.lastMessage}</p>
  `;
    div.addEventListener('click', () => {
        window.location.hash = `#chat/${chat.id}`;
    });
    return div;
}
