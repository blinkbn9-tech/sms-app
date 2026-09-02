// Smart Date Formatter
function getFormattedDate(date = new Date()) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today - target) / 86400000);

    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return "Yesterday";
    if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

// Helper to generate dates for the default messages
const minsAgo = (m) => new Date(Date.now() - m * 60000);
const daysAgo = (d) => new Date(Date.now() - d * 86400000);

const defaultMessages = [
    { id: 1, name: "MPESA", phone: "+254 722 000 000", color: "bg-green", initial: "M", time: getFormattedDate(minsAgo(15)), preview: "You have received Ksh 1,500 from JOHN DOE.", unread: 3, pinned: false, allowReply: false, history: [{ text: "You have received Ksh 1,500 from JOHN DOE. New balance is 3,450.", type: "received", time: getFormattedDate(minsAgo(15)) }] },
    { id: 2, name: "Safaricom", phone: "+254 720 000 000", color: "bg-blue", initial: "S", time: getFormattedDate(minsAgo(120)), preview: "Your data balance is 2.5GB.", unread: 8, pinned: false, allowReply: true, history: [{ text: "Your data balance is 2.5GB. Expires on 28/08/2026.", type: "received", time: getFormattedDate(minsAgo(120)) }] },
    { id: 3, name: "Voice Mail", phone: "+254 711 000 000", color: "bg-purple", initial: "V", time: getFormattedDate(daysAgo(1)), preview: "You have 8 new voice messages.", unread: 8, pinned: false, allowReply: true, history: [{ text: "You have 8 new voice messages. Call 111 to listen.", type: "received", time: getFormattedDate(daysAgo(1)) }] },
    { id: 4, name: "Airtel", phone: "+254 730 000 000", color: "bg-orange", initial: "A", time: getFormattedDate(daysAgo(3)), preview: "Your Airtel data balance is 1.2GB.", unread: 21, pinned: false, allowReply: true, history: [{ text: "Your Airtel data balance is 1.2GB.", type: "received", time: getFormattedDate(daysAgo(3)) }] },
    { id: 5, name: "AirtelAlert", phone: "+254 730 111 111", color: "bg-red", initial: "A", time: getFormattedDate(daysAgo(10)), preview: "Dear customer, your account balance is Ksh 45.", unread: 12, pinned: false, allowReply: false, history: [{ text: "Dear customer, your account balance is Ksh 45.", type: "received", time: getFormattedDate(daysAgo(10)) }] },
    { id: 6, name: "SAFARIOM", phone: "+254 700 000 000", color: "bg-grey", initial: "S", time: getFormattedDate(daysAgo(45)), preview: "Tuma Pesa: You have received Ksh 2,000.", unread: 0, pinned: false, allowReply: true, history: [{ text: "Tuma Pesa: You have received Ksh 2,000.", type: "received", time: getFormattedDate(daysAgo(45)) }] }
];

// DOM Elements
const messagesList = document.getElementById('messagesList');
const chatView = document.getElementById('chatView');
const totalUnreadEl = document.getElementById('totalUnread');
const navBadgeEl = document.getElementById('navBadge');
const menuDropdown = document.getElementById('menuDropdown');

// State
let activeChatId = null;
let contextMenuTargetId = null;
let showingUnreadOnly = false;
let selectionMode = false;
let showingStarredOnly = false;
let selectedIds = [];

// Local Storage
function saveMessages() { localStorage.setItem('sms_app_pro', JSON.stringify(messagesData)); }
function saveDeletedMessages() { localStorage.setItem('sms_app_deleted', JSON.stringify(deletedMessagesData)); }
function loadMessages() {
    const saved = localStorage.getItem('sms_app_pro');
    if (saved) {
        let parsed = JSON.parse(saved);
        return parsed.map(msg => ({ ...msg, pinned: msg.pinned || false, phone: msg.phone || "+254 " + Math.floor(100000000 + Math.random() * 900000000), allowReply: msg.allowReply !== undefined ? msg.allowReply : true, history: msg.history || [{ text: msg.preview, type: "received", time: msg.time }] }));
    }
    return [...defaultMessages];
}
function loadDeletedMessages() {
    const saved = localStorage.getItem('sms_app_deleted');
    return saved ? JSON.parse(saved) : [];
}
let messagesData = loadMessages();
let deletedMessagesData = loadDeletedMessages();

// Audio
let audioCtx = null;
function playNotificationSound() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination); o.type = 'sine';
        o.frequency.setValueAtTime(880, audioCtx.currentTime);
        g.gain.setValueAtTime(0.2, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        o.start(); o.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

// --- MENU LOGIC ---
document.getElementById('menuToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle('show');
});
document.addEventListener('click', (e) => {
    if (!menuDropdown.contains(e.target) && e.target.id !== 'menuToggle') menuDropdown.classList.remove('show');
});

document.getElementById('menuMarkAllRead').addEventListener('click', () => {
    messagesData.forEach(msg => msg.unread = 0);
    saveMessages(); renderMessages(); menuDropdown.classList.remove('show');
});

document.getElementById('menuStarred').addEventListener('click', () => {
    showingStarredOnly = !showingStarredOnly;
    document.getElementById('viewTitle').textContent = showingStarredOnly ? "Starred Messages" : "Messages";
    renderMessages(); menuDropdown.classList.remove('show');
});

document.getElementById('menuSettings').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('sms_app_pro_dark', isDark);
    menuDropdown.classList.remove('show');
});
if(localStorage.getItem('sms_app_pro_dark') === 'true') document.body.classList.add('dark-mode');

// --- SELECTION MODE LOGIC ---
document.getElementById('menuSelect').addEventListener('click', () => {
    selectionMode = true; selectedIds = [];
    document.body.classList.add('selection-mode');
    document.getElementById('selectionBar').style.display = 'flex';
    menuDropdown.classList.remove('show');
    renderMessages();
});

document.getElementById('cancelSelectedBtn').addEventListener('click', () => {
    selectionMode = false; document.body.classList.remove('selection-mode');
    document.getElementById('selectionBar').style.display = 'none'; renderMessages();
});

document.getElementById('selectAllBtn').addEventListener('click', () => {
    selectedIds = messagesData.map(m => m.id);
    renderMessages(); updateSelectedCount();
});

document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
    messagesData.forEach(msg => {
        if (selectedIds.includes(msg.id)) deletedMessagesData.unshift(msg);
    });
    messagesData = messagesData.filter(msg => !selectedIds.includes(msg.id));
    saveMessages(); saveDeletedMessages();
    selectionMode = false; document.body.classList.remove('selection-mode');
    document.getElementById('selectionBar').style.display = 'none'; renderMessages();
});

function updateSelectedCount() { document.getElementById('selectedCount').textContent = selectedIds.length + " selected"; }

function toggleSelectMessage(id) {
    const index = selectedIds.indexOf(id);
    if (index > -1) selectedIds.splice(index, 1);
    else selectedIds.push(id);
    updateSelectedCount();
    renderMessages();
}

// --- RECYCLE BIN LOGIC ---
const recycleBinModal = document.getElementById('recycleBinModal');
document.getElementById('menuRecycleBin').addEventListener('click', () => {
    menuDropdown.classList.remove('show');
    renderRecycleBin();
    recycleBinModal.classList.add('active');
});
document.getElementById('closeRecycleBin').addEventListener('click', () => recycleBinModal.classList.remove('active'));
document.getElementById('emptyRecycleBinBtn').addEventListener('click', () => {
    deletedMessagesData = []; saveDeletedMessages(); renderRecycleBin();
});

function renderRecycleBin() {
    const list = document.getElementById('recycleBinList');
    if (deletedMessagesData.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-secondary); padding:40px;">Recycle bin is empty.</p>`;
        return;
    }
    list.innerHTML = deletedMessagesData.map(msg => `
        <div class="recycle-item">
            <div class="avatar ${msg.color}">${msg.initial}</div>
            <div class="recycle-info">
                <div class="contact-name">${msg.name}</div>
                <div class="contact-phone" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${msg.preview}</div>
            </div>
            <button class="restore-btn" onclick="restoreMessage(${msg.id})">Restore</button>
        </div>
    `).join('');
}

function restoreMessage(id) {
    const msg = deletedMessagesData.find(m => m.id === id);
    messagesData.unshift(msg);
    deletedMessagesData = deletedMessagesData.filter(m => m.id !== id);
    saveMessages(); saveDeletedMessages(); renderRecycleBin(); renderMessages();
}

// --- RENDER MESSAGES ---
const viewUnreadBtn = document.getElementById('viewUnreadBtn');
viewUnreadBtn.addEventListener('click', () => {
    showingUnreadOnly = !showingUnreadOnly;
    viewUnreadBtn.textContent = showingUnreadOnly ? "Show All" : "View";
    renderMessages();
});

function renderMessages(filterText = "") {
    messagesData.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned - a.pinned;
        if ((a.unread > 0) !== (b.unread > 0)) return (b.unread > 0) - (a.unread > 0);
        return 0;
    });

    let baseData = messagesData;
    if (showingUnreadOnly) baseData = baseData.filter(msg => msg.unread > 0);
    if (showingStarredOnly) baseData = baseData.filter(msg => msg.pinned);
    
    const filteredData = baseData.filter(msg => 
        msg.name.toLowerCase().includes(filterText.toLowerCase()) || 
        msg.preview.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filteredData.length === 0) {
        messagesList.innerHTML = `<div class="empty-state"><i class="fas fa-comments"></i><h3>No Messages</h3></div>`;
        updateUnreadCounts(); return;
    }

    let html = '';
    filteredData.forEach(msg => {
        const isChecked = selectedIds.includes(msg.id);
        html += `
            <div class="message-wrapper ${msg.pinned ? 'pinned' : ''}" data-id="${msg.id}">
                <div class="delete-background">Delete</div>
                <div class="mark-read-background"><i class="fas fa-check"></i></div>
                <div class="message-item">
                    <div class="avatar ${msg.color}">${msg.initial}</div>
                    <div class="message-content">
                        <div class="message-header">
                            <div class="sender-name">
                                ${msg.pinned ? '<i class="fas fa-thumbtack pin-icon"></i>' : ''}
                                ${msg.name}
                            </div>
                            <div class="timestamp">${msg.time}</div>
                        </div>
                        <div class="message-preview">${msg.preview}</div>
                    </div>
                    ${msg.unread > 0 ? `<div class="unread-badge">${msg.unread}</div>` : ''}
                    <div class="message-checkbox ${isChecked ? 'checked' : ''}" onclick="toggleSelectMessage(${msg.id})"><i class="fas fa-check"></i></div>
                </div>
            </div>
        `;
    });
    messagesList.innerHTML = html;
    setupMessageInteractions();
    updateUnreadCounts();
}

function updateUnreadCounts() {
    const totalUnread = messagesData.reduce((sum, msg) => sum + msg.unread, 0);
    totalUnreadEl.textContent = totalUnread;
    navBadgeEl.style.display = totalUnread > 0 ? 'block' : 'none';
    if(totalUnread > 0) navBadgeEl.textContent = totalUnread;
}

// --- MESSAGE INTERACTIONS ---
function setupMessageInteractions() {
    document.querySelectorAll('.message-wrapper').forEach(wrapper => {
        const item = wrapper.querySelector('.message-item');
        let startX = 0, startY = 0, currentX = 0, isDragging = false;
        let pressTimer = null, hasLongPressed = false, hasMoved = false;

        const startInteraction = (x, y) => {
            hasLongPressed = false; hasMoved = false; startX = x; startY = y; isDragging = true; item.style.transition = 'none';
            pressTimer = setTimeout(() => {
                if (selectionMode) return;
                hasLongPressed = true; isDragging = false;
                const id = parseInt(wrapper.dataset.id);
                if (navigator.vibrate) navigator.vibrate(30);
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.style.opacity = '0'; item.style.transform = 'translateX(-100%)';
                setTimeout(() => {
                    deletedMessagesData.unshift(messagesData.find(m => m.id === id));
                    messagesData = messagesData.filter(msg => msg.id !== id);
                    saveMessages(); saveDeletedMessages(); renderMessages();
                }, 300);
            }, 500);
        };

        const handleMove = (x, y) => {
            if (!isDragging) return;
            currentX = x - startX; const diffY = Math.abs(y - startY);
            if (Math.abs(currentX) > 15 || diffY > 15) { if (!hasLongPressed) { clearTimeout(pressTimer); hasMoved = true; } }
            if (currentX < 0) item.style.transform = `translateX(${Math.max(currentX, -100)}px)`;
            else if (currentX > 0) item.style.transform = `translateX(${Math.min(currentX, 80)}px)`;
        };

        const endInteraction = () => {
            if (!isDragging) return; isDragging = false; clearTimeout(pressTimer);
            item.style.transition = 'transform 0.3s ease';
            if (currentX < -50) {
                item.style.transform = 'translateX(-100%)';
                setTimeout(() => {
                    const id = parseInt(wrapper.dataset.id);
                    deletedMessagesData.unshift(messagesData.find(m => m.id === id));
                    messagesData = messagesData.filter(msg => msg.id !== id);
                    saveMessages(); saveDeletedMessages(); renderMessages();
                }, 300);
            } else if (currentX > 40) {
                item.style.transform = 'translateX(0)';
                const id = parseInt(wrapper.dataset.id);
                const msg = messagesData.find(m => m.id === id);
                msg.unread = msg.unread > 0 ? 0 : 1; saveMessages(); renderMessages();
                if (navigator.vibrate) navigator.vibrate(10);
            } else { item.style.transform = 'translateX(0)'; }
            currentX = 0;
        };

        item.addEventListener('click', (e) => {
            if (hasLongPressed || hasMoved) { e.preventDefault(); e.stopPropagation(); return; }
            if (selectionMode) { toggleSelectMessage(parseInt(wrapper.dataset.id)); return; }
            openChat(parseInt(wrapper.dataset.id));
        });
        item.addEventListener('contextmenu', (e) => e.preventDefault());
        item.addEventListener('mousedown', (e) => startInteraction(e.clientX, e.clientY));
        item.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
        item.addEventListener('mouseup', endInteraction);
        item.addEventListener('mouseleave', () => { if(isDragging) endInteraction(); });
        item.addEventListener('touchstart', (e) => startInteraction(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
        item.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
        item.addEventListener('touchend', endInteraction);
    });
}

// Context Menu (Right-click)
const contextMenuOverlay = document.getElementById('contextMenuOverlay');
document.getElementById('ctxCancel').addEventListener('click', () => contextMenuOverlay.classList.remove('active'));
contextMenuOverlay.addEventListener('click', (e) => { if(e.target === contextMenuOverlay) contextMenuOverlay.classList.remove('active'); });
document.getElementById('ctxMarkRead').addEventListener('click', () => { const msg = messagesData.find(m => m.id === contextMenuTargetId); msg.unread = msg.unread > 0 ? 0 : 1; saveMessages(); renderMessages(); contextMenuOverlay.classList.remove('active'); });
document.getElementById('ctxPin').addEventListener('click', () => { const msg = messagesData.find(m => m.id === contextMenuTargetId); msg.pinned = !msg.pinned; saveMessages(); renderMessages(); contextMenuOverlay.classList.remove('active'); });
document.getElementById('ctxDelete').addEventListener('click', () => { deletedMessagesData.unshift(messagesData.find(m => m.id === contextMenuTargetId)); messagesData = messagesData.filter(msg => msg.id !== contextMenuTargetId); saveMessages(); saveDeletedMessages(); renderMessages(); contextMenuOverlay.classList.remove('active'); });

// --- COMPOSE ---
document.getElementById('newMessageBtn').addEventListener('click', () => { document.getElementById('composeModal').classList.add('active'); document.getElementById('composeSender').focus(); });
document.getElementById('composeCancel').addEventListener('click', () => { document.getElementById('composeModal').classList.remove('active'); document.getElementById('composeSender').value = ""; document.getElementById('composeText').value = ""; });
document.getElementById('composeSend').addEventListener('click', () => {
    const sender = document.getElementById('composeSender').value.trim() || "Unknown Sender";
    const text = document.getElementById('composeText').value.trim();
    if (!text) return;
    const currentTime = getFormattedDate(new Date());
    let existingChat = messagesData.find(m => m.name.toLowerCase() === sender.toLowerCase());
    if (existingChat) {
        existingChat.unread = (existingChat.unread || 0) + 1; existingChat.preview = text; existingChat.time = currentTime;
        existingChat.history.push({ text, type: "received", time: currentTime });
        messagesData = messagesData.filter(m => m.id !== existingChat.id); messagesData.unshift(existingChat);
    } else {
        const colors = ['bg-green', 'bg-blue', 'bg-purple', 'bg-orange', 'bg-red', 'bg-teal'];
        const newId = Date.now();
        messagesData.unshift({ id: newId, name: sender, phone: "+254 " + Math.floor(100000000 + Math.random() * 900000000), color: colors[Math.floor(Math.random() * colors.length)], initial: sender.charAt(0).toUpperCase(), time: currentTime, preview: text, unread: 1, pinned: false, allowReply: true, history: [{ text, type: "received", time: currentTime }] });
    }
    saveMessages(); renderMessages(); playNotificationSound();
    if (navigator.vibrate) navigator.vibrate(15);
    const banner = document.getElementById('notificationBanner');
    banner.querySelector('.notif-avatar').textContent = sender.charAt(0).toUpperCase();
    banner.querySelector('.notif-avatar').className = `notif-avatar bg-teal`;
    banner.querySelector('.notif-title').textContent = sender;
    banner.querySelector('.notif-text').textContent = text;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 3000);
    document.getElementById('composeModal').classList.remove('active');
    document.getElementById('composeSender').value = ""; document.getElementById('composeText').value = "";
});

// --- SEARCH ---
const searchToggle = document.getElementById('searchToggle');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');
searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('active');
    if(searchBar.classList.contains('active')) { searchInput.focus(); searchInput.placeholder = document.body.classList.contains('contacts-active') ? "Search contacts..." : "Search messages..."; }
    else { searchInput.value = ""; renderMessages(); renderContacts(); }
});
searchInput.addEventListener('input', (e) => { if(document.body.classList.contains('contacts-active')) renderContacts(e.target.value); else renderMessages(e.target.value); });

// --- CONTACTS ---
function renderContacts(filterText = "") {
    const contactsList = document.getElementById('contactsList');
    const filteredData = messagesData.filter(msg => msg.name.toLowerCase().includes(filterText.toLowerCase()) || (msg.phone && msg.phone.includes(filterText.toLowerCase())));
    let html = '';
    if ('contacts' in navigator && navigator.contacts.select) {
        html += `<div style="padding: 15px 20px; border-bottom: 1px solid var(--border-color); text-align: center;"><button id="pickContactsBtn" class="view-button" style="padding: 8px 20px; font-size: 14px;"><i class="fas fa-address-book"></i> Import from Phone</button></div>`;
    }
    if(filteredData.length === 0) {
        html += `<div class="empty-state"><i class="fas fa-user-slash"></i><h3>No Contacts</h3><p>Import contacts from your phone to start chatting.</p></div>`;
    } else {
        filteredData.sort((a, b) => a.name.localeCompare(b.name));
        filteredData.forEach(msg => {
            html += `<div class="contact-item" onclick="openChat(${msg.id})"><div class="avatar ${msg.color}">${msg.initial}</div><div class="contact-info"><div class="contact-name">${msg.name}</div><div class="contact-phone">${msg.phone || 'Unknown Number'}</div></div></div>`;
        });
    }
    contactsList.innerHTML = html;
    const pickBtn = document.getElementById('pickContactsBtn');
    if (pickBtn) pickBtn.addEventListener('click', pickContacts);
}
async function pickContacts() {
    try {
        const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
        if (contacts.length === 0) return;
        contacts.forEach(c => {
            const name = c.name ? c.name[0] : "Unknown"; const tel = c.tel ? c.tel[0] : "No Number";
            let existingChat = messagesData.find(m => m.name === name && m.phone === tel);
            if (!existingChat) messagesData.unshift({ id: Date.now() + Math.floor(Math.random() * 1000), name: name, phone: tel, color: "bg-grey", initial: name.charAt(0).toUpperCase(), time: "Just now", preview: "Tap to start chatting...", unread: 0, pinned: false, allowReply: true, history: [] });
        });
        saveMessages(); renderContacts();
    } catch (err) {}
}

// --- CHAT VIEW ---
function openChat(id) {
    const message = messagesData.find(m => m.id === id);
    activeChatId = id;
    document.getElementById('chatTitle').textContent = message.name;
    document.getElementById('chatAvatar').textContent = message.initial;
    document.getElementById('chatAvatar').className = `chat-avatar ${message.color}`;
    const chatInputArea = document.querySelector('.chat-input-area');
    if (message.allowReply === false || message.name === "MPESA" || message.name === "AirtelAlert") chatInputArea.style.display = 'none';
    else chatInputArea.style.display = 'flex';
    if(message.unread > 0) { message.unread = 0; saveMessages(); }
    renderChatHistory(message); chatView.classList.add('active');
}
function renderChatHistory(message) {
    const chatBody = document.getElementById('chatBody');
    chatBody.innerHTML = `<div class="chat-date-divider">Today</div>`;
    if (message.history.length === 0) {
        chatBody.innerHTML += `<div class="chat-bubble received" style="background: transparent; color: var(--text-secondary); align-self: center; box-shadow: none; border: none;">This is the beginning of your conversation with ${message.name}.</div>`;
        chatBody.scrollTop = chatBody.scrollHeight; return;
    }
    message.history.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.type}`;
        bubble.innerHTML = `${msg.text}<div class="chat-meta"><span>${msg.time}</span>${msg.type === 'sent' ? '<i class="fas fa-check-double read-receipt"></i>' : ''}</div>`;
        chatBody.appendChild(bubble);
    });
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Delete Conversation from inside the chat
function deleteCurrentChat() {
    if (activeChatId === null) return;
    contextMenuOverlay.classList.add('active');
    document.getElementById('contextMenu').innerHTML = `<div class="context-item danger" onclick="confirmDeleteChat()">Delete Conversation</div><div class="context-item cancel" onclick="cancelDeleteChat()">Cancel</div>`;
}
function cancelDeleteChat() { contextMenuOverlay.classList.remove('active'); document.getElementById('contextMenu').innerHTML = `<div class="context-item" id="ctxMarkRead">Mark as Read</div><div class="context-item" id="ctxPin">Pin to Top</div><div class="context-item danger" id="ctxDelete">Delete</div><div class="context-item cancel" id="ctxCancel">Cancel</div>`; document.getElementById('ctxCancel').addEventListener('click', () => contextMenuOverlay.classList.remove('active')); }
function confirmDeleteChat() {
    contextMenuOverlay.classList.remove('active');
    deletedMessagesData.unshift(messagesData.find(m => m.id === activeChatId));
    messagesData = messagesData.filter(msg => msg.id !== activeChatId);
    saveMessages(); saveDeletedMessages(); chatView.classList.remove('active'); activeChatId = null; renderMessages(); renderContacts();
    if (navigator.vibrate) navigator.vibrate(20);
}

// --- SEND MESSAGE ---
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('messageInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    if(text === "" || activeChatId === null) return;
    const message = messagesData.find(m => m.id === activeChatId);
    const time = getFormattedDate(new Date());
    message.history.push({ text, type: "sent", time });
    message.preview = text; message.time = "Just now"; saveMessages();
    const sentBubble = document.createElement('div');
    sentBubble.className = 'chat-bubble sent';
    sentBubble.innerHTML = `${text}<div class="chat-meta"><span>${time}</span><i class="fas fa-check"></i></div>`;
    document.getElementById('chatBody').appendChild(sentBubble);
    messageInput.value = "";
    document.getElementById('chatBody').scrollTop = document.getElementById('chatBody').scrollHeight;
    setTimeout(() => { sentBubble.querySelector('.chat-meta').innerHTML = `<span>${time}</span><i class="fas fa-check-double read-receipt"></i>`; }, 500);
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble received typing-indicator';
    typingBubble.innerHTML = '<span></span><span></span><span></span>';
    document.getElementById('chatBody').appendChild(typingBubble);
    document.getElementById('chatBody').scrollTop = document.getElementById('chatBody').scrollHeight;
    setTimeout(() => {
        typingBubble.remove();
        const replyText = "Got it! Thanks for your message."; const replyTime = getFormattedDate(new Date());
        message.history.push({ text: replyText, type: "received", time: replyTime }); saveMessages();
        const replyBubble = document.createElement('div');
        replyBubble.className = 'chat-bubble received';
        replyBubble.innerHTML = `${replyText}<div class="chat-meta"><span>${replyTime}</span></div>`;
        document.getElementById('chatBody').appendChild(replyBubble);
        document.getElementById('chatBody').scrollTop = document.getElementById('chatBody').scrollHeight;
    }, 1500);
}

document.getElementById('backBtn').addEventListener('click', () => {
    chatView.classList.remove('active'); activeChatId = null; renderMessages(); renderContacts();
});

// --- NAV ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        if(this.dataset.view === 'contacts') { document.body.classList.add('contacts-active'); document.getElementById('viewTitle').textContent = "Contacts"; renderContacts(); }
        else { document.body.classList.remove('contacts-active'); document.getElementById('viewTitle').textContent = "Messages"; renderMessages(); }
        searchBar.classList.remove('active'); searchInput.value = "";
    });
});

// Init
renderMessages();
renderContacts();