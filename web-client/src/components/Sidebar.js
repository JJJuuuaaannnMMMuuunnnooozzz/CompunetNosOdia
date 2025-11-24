export function createSidebar(username, contacts, groups, onSelectChat) {
    const aside = document.createElement("aside");
    aside.className = "sidebar";

    aside.innerHTML = `
        <div class="sidebar-header">
            <div class="avatar">I</div>
            <h3>${username}</h3>
        </div>
        <div class="search-box">
            <input type="text" placeholder="Buscar o iniciar nuevo chat">
        </div>
        <div class="chat-list">
          
        </div>
    `;

    const listContainer = aside.querySelector(".chat-list");

    // Función para renderizar un item
    const renderItem = (name, type) => {
        const div = document.createElement("div");
        div.className = "chat-item";
        div.innerHTML = `
            <div class="avatar">${type === 'group' ? 'G' : 'I'}</div>
            <div class="chat-info">
                <div class="chat-name">${name}</div>
                <div class="chat-status">Click para abrir chat</div>
            </div>
        `;
        div.onclick = () => {
            // Marcar activo
            document.querySelectorAll(".chat-item").forEach(el => el.classList.remove("active"));
            div.classList.add("active");
            onSelectChat(name, type);
        };
        listContainer.appendChild(div);
    };

    // Renderizar grupos
    groups.forEach(g => renderItem(g, 'group'));
    contacts.forEach(c => renderItem(c, 'user'));

    return aside;
}
