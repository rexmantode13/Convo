const socket = io();

// State
let me = null;
let users = []; 
let chats = {}; 
let currentChat = null;
let typingTimeout = null;

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const listScreen = document.getElementById('list-screen');
const chatScreen = document.getElementById('chat-screen');
const noticeOverlay = document.getElementById('notice-overlay');
const noticeText = document.getElementById('notice-text');

const nameInput = document.getElementById('name-input');
const nameError = document.getElementById('name-error');
const startBtn = document.getElementById('start-btn');

const myNameDisplay = document.getElementById('my-name-display');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const chatListAll = document.getElementById('chat-list-all');
const chatListContacts = document.getElementById('chat-list-contacts');
const emptyAll = document.getElementById('empty-all');
const emptyContacts = document.getElementById('empty-contacts');
const menuBtn = document.getElementById('menu-btn');
const menuDropdown = document.getElementById('menu-dropdown');
const searchBtn = document.getElementById('search-btn');
const fabBtn = document.getElementById('fab-btn');

const chatName = document.getElementById('chat-name');
const chatStatus = document.getElementById('chat-status');
const chatAvatar = document.getElementById('chat-avatar');
const messagesArea = document.getElementById('messages-area');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const backBtn = document.getElementById('back-btn');

// Utils
function getInitials(name) {
    return name.substring(0, 2).toUpperCase();
}
function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function switchScreen(screen) {
    welcomeScreen.classList.add('hidden');
    listScreen.classList.add('hidden');
    chatScreen.classList.add('hidden');
    screen.classList.remove('hidden');
}
function showNotice(text) {
    noticeText.textContent = text;
    noticeOverlay.classList.remove('hidden');
}
document.getElementById('notice-btn').addEventListener('click', () => {
    noticeOverlay.classList.add('hidden');
    if (currentChat === null && me === null) {
        switchScreen(welcomeScreen);
    }
});

function initChat(otherId) {
    if (!chats[otherId]) {
        chats[otherId] = { messages: [], unread: 0, isTyping: false };
    }
}

// Socket Events
socket.on('connect', () => {
    if (me) {
        me = null;
        users = [];
        chats = {};
        currentChat = null;
        showNotice("Your session ended. Please enter a name again.");
        switchScreen(welcomeScreen);
    }
});
socket.on('disconnect', () => {
    if (me) {
        showNotice("Connection lost.");
    }
});

socket.on('users', (serverUsers) => {
    users = serverUsers.filter(u => u.id !== socket.id);
    renderLists();
});

socket.on('user_left', (user) => {
    if (currentChat === user.id) {
        currentChat = null;
        showNotice(`${user.name} left. This chat has been cleared.`);
        switchScreen(listScreen);
    }
    delete chats[user.id];
    renderLists();
});

socket.on('private_message', (msg) => {
    const otherId = msg.from === socket.id ? msg.to : msg.from;
    initChat(otherId);
    
    chats[otherId].messages.push(msg);
    chats[otherId].isTyping = false; 
    
    if (currentChat === otherId) {
        renderMessages();
    } else {
        chats[otherId].unread++;
        renderLists();
    }
});

socket.on('typing', ({ from }) => {
    if (chats[from]) {
        chats[from].isTyping = true;
        renderLists();
        if (currentChat === from) {
            chatStatus.textContent = 'Typing...';
            chatStatus.style.color = '#fff';
        }
    }
});
socket.on('stop_typing', ({ from }) => {
    if (chats[from]) {
        chats[from].isTyping = false;
        renderLists();
        if (currentChat === from) {
            chatStatus.textContent = 'Online';
            chatStatus.style.color = '#aaa';
        }
    }
});

// Welcome Screen
startBtn.addEventListener('click', register);
nameInput.addEventListener('keypress', e => { if (e.key === 'Enter') register(); });

function register() {
    const name = nameInput.value;
    nameError.textContent = '';
    socket.emit('register', name, (res) => {
        if (res.ok) {
            me = res.me;
            myNameDisplay.textContent = me.name;
            switchScreen(listScreen);
        } else {
            nameError.textContent = res.error || 'Error joining';
        }
    });
}

// List Screen
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
    });
});

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle('hidden');
});
document.addEventListener('click', () => menuDropdown.classList.add('hidden'));

document.getElementById('leave-chat-item').addEventListener('click', () => {
    socket.disconnect(); 
    me = null;
    users = [];
    chats = {};
    currentChat = null;
    setTimeout(() => { socket.connect(); }, 500); 
    switchScreen(welcomeScreen);
    nameInput.value = '';
});

fabBtn.addEventListener('click', () => {
    tabs[2].click(); 
});

function createChatRow(user, chatData) {
    const row = document.createElement('div');
    row.className = 'chat-row';
    
    const charCode = user.name.charCodeAt(0);
    const bgClass = charCode % 2 === 0 ? 'light' : '';
    
    const lastMsg = chatData && chatData.messages.length > 0 ? chatData.messages[chatData.messages.length - 1] : null;
    let previewText = 'Tap to chat';
    let timeText = '';
    let isTyping = chatData ? chatData.isTyping : false;

    if (isTyping) {
        previewText = 'typing...';
    } else if (lastMsg) {
        previewText = lastMsg.text;
        timeText = formatTime(lastMsg.timestamp);
    }
    
    const unreadHTML = (chatData && chatData.unread > 0) ? `<div class="unread-badge">${chatData.unread}</div>` : '';

    row.innerHTML = `
        <div class="avatar ${bgClass}">${getInitials(user.name)}</div>
        <div class="chat-row-info">
            <div class="chat-row-top">
                <div class="chat-row-name">${user.name}</div>
                <div class="chat-row-time">${timeText}</div>
            </div>
            <div class="chat-row-bottom">
                <div class="chat-row-preview ${isTyping ? 'typing' : ''}">${previewText}</div>
                ${unreadHTML}
            </div>
        </div>
    `;
    
    row.addEventListener('click', () => openChat(user));
    return row;
}

function renderLists() {
    chatListAll.innerHTML = '';
    chatListContacts.innerHTML = '';
    
    let hasChats = false;
    let hasContacts = users.length > 0;

    users.forEach(u => {
        const chatData = chats[u.id];
        if (chatData && chatData.messages.length > 0) {
            hasChats = true;
            chatListAll.appendChild(createChatRow(u, chatData));
        }
        chatListContacts.appendChild(createChatRow(u, chatData));
    });
    
    emptyAll.classList.toggle('hidden', hasChats);
    emptyContacts.classList.toggle('hidden', hasContacts);
}

// Search filter
searchBtn.addEventListener('click', () => {
    const q = prompt("Search names:");
    if (q !== null) {
        const term = q.toLowerCase();
        Array.from(chatListAll.children).forEach(el => {
            const name = el.querySelector('.chat-row-name').textContent.toLowerCase();
            el.style.display = name.includes(term) ? 'flex' : 'none';
        });
        Array.from(chatListContacts.children).forEach(el => {
            const name = el.querySelector('.chat-row-name').textContent.toLowerCase();
            el.style.display = name.includes(term) ? 'flex' : 'none';
        });
    }
});

// Chat Screen
function openChat(user) {
    currentChat = user.id;
    initChat(currentChat);
    
    chats[currentChat].unread = 0;
    
    if (chats[currentChat].messages.length === 0) {
        socket.emit('get_messages', currentChat, (msgs) => {
            chats[currentChat].messages = msgs;
            renderMessages();
            renderLists();
        });
    }
    
    chatName.textContent = user.name;
    const charCode = user.name.charCodeAt(0);
    chatAvatar.className = `avatar ${charCode % 2 === 0 ? 'light' : ''}`;
    chatAvatar.textContent = getInitials(user.name);
    chatStatus.textContent = chats[currentChat].isTyping ? 'Typing...' : 'Online';
    chatStatus.style.color = chats[currentChat].isTyping ? '#fff' : '#aaa';
    
    switchScreen(chatScreen);
    renderMessages();
}

backBtn.addEventListener('click', () => {
    currentChat = null;
    switchScreen(listScreen);
    renderLists();
});

function renderMessages() {
    if (!currentChat || !chats[currentChat]) return;
    messagesArea.innerHTML = '';
    const msgs = chats[currentChat].messages;
    
    msgs.forEach(m => {
        const isSent = m.from === socket.id;
        const div = document.createElement('div');
        div.className = `msg ${isSent ? 'sent' : 'received'}`;
        div.textContent = m.text;
        
        const time = document.createElement('span');
        time.className = 'msg-time';
        time.textContent = formatTime(m.timestamp);
        div.appendChild(time);
        
        messagesArea.appendChild(div);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Sending messages
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;
    
    socket.emit('private_message', { to: currentChat, text });
    messageInput.value = '';
    
    clearTimeout(typingTimeout);
    socket.emit('stop_typing', { to: currentChat });
}
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
});

// Typing indicator
messageInput.addEventListener('input', () => {
    if (!currentChat) return;
    socket.emit('typing', { to: currentChat });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { to: currentChat });
    }, 1500);
});
