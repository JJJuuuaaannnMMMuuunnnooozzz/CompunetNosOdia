import { createChatItem } from './chatItem.js';

export function renderChatList(container, chats) {
    chats.forEach(chat => {
        const item = createChatItem(chat);
        container.appendChild(item);
    });
}

