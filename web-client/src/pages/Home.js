import { renderChatList } from '../components/chatList.js';
import { renderChatWindow } from './chatWindow.js';

function Home(){
    const container = document.createElement('div');
    container.id = 'home-page';

    const title = document.createElement("h1")
    title.innerText = "Chat"
    title.classList = "title"

    container.appendChild(title)
    console.log("dede")


    const chats = [
        { id: 1, name: 'Juan', lastMessage: 'Hola!' },
        { id: 2, name: 'Grupo Icesi', lastMessage: 'Reunión mañana' },
    ];
    renderChatList(container, chats);

    return container;
}

export default Home