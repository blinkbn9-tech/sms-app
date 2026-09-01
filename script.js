// Helper function to get real time
function getRealTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const defaultMessages = [
    { id: 1, name: "MPESA", phone: "+254 722 000 000", color: "bg-green", initial: "M", time: getRealTime(), preview: "UHV6R47KRR Confirmed. Ksh33.40 sent to SAFARICOM DATA BUNDLES for accountSAFARICOM DATA BUNDLES on31/8/2026 at 5:22 PM. New M-PESA balance is Ksh 2,335.13. Transaction cost,Ksh0.00.", unread: 3, pinned: false, allowReply: false, history: [{ text: "UHV6R47KRR Confirmed. Ksh33.40 sent to SAFARICOM DATA BUNDLES for accountSAFARICOM DATA BUNDLES on31/8/2026 at 5:22 PM. New M-PESA balance is Ksh 2,335.13. Transaction cost,Ksh0.00.", type: "received", time: getRealTime() }] },
    { id: 2, name: "Safaricom", phone: "+254 720 000 000", color: "bg-blue", initial: "S", time: getRealTime(), preview: "Your data balance is 2.5GB.", unread: 8, pinned: false, allowReply: true, history: [{ text: "Your data balance is 2.5GB. Expires on 28/08/2026.", type: "received", time: getRealTime() }] },
    { id: 3, name: "Voice Mail", phone: "+254 711 000 000", color: "bg-purple", initial: "V", time: "Yesterday", preview: "You have 8 new voice messages.", unread: 8, pinned: false, allowReply: true, history: [{ text: "You have 8 new voice messages. Call 111 to listen.", type: "received", time: "Yesterday" }] },
    { id: 4, name: "Airtel", phone: "+254 730 000 000", color: "bg-orange", initial: "A", time: "Yesterday", preview: "Your Airtel data balance is 1.2GB.", unread: 21, pinned: false, allowReply: true, history: [{ text: "Your Airtel data balance is 1.2GB.", type: "received", time: "Yesterday" }] },
    { id: 5, name: "AirtelAlert", phone: "+254 730 111 111", color: "bg-red", initial: "A", time: "2 days ago", preview: "Dear customer, your account balance is Ksh 45.", unread: 12, pinned: false, allowReply: false, history: [{ text: "Dear customer, your account balance is Ksh 45.", type: "received", time: "2 days ago" }] },
    { id: 6, name: "SAFARIOM", phone: "+254 700 000 000", color: "bg-grey", initial: "S", time: "3 days ago", preview: "Tuma Pesa: You have received Ksh 2,000.", unread: 0, pinned: false, allowReply: true, history: [{ text: "Tuma Pesa: You have received Ksh 2,000.", type: "received", time: "3 days ago" }] }
];

// DOM Elements
const messagesList = document.getElementById('messagesList');
const contactsList = document.getElementById('contactsList');
const chatView = document.getElementById('chatView');
const chatTitle = document.getElementById('chatTitle');
const chatAvatar = document.getElementById('chatAvatar');
const chatBody = document.getElementById('chatBody');
const messageInput = document.getElementById('messageInput');
const totalUnreadEl = document.getElementById('totalUnread');
const navBadgeEl = document.getElementById('navBadge');
const notificationBanner = document.getElementById('notificationBanner');
const composeModal = document.getElementById('composeModal');
const composeSender = document.getElementById('composeSender');
const composeText = document.getElementById('composeText');
const composeCancel = document.getElementById('composeCancel');
const composeSend = document.getElementById('composeSend');
const viewTitle = document.getElementById('viewTitle');

// State
let activeChatId = null;
let contextMenuTargetId = null;
let showingUnreadOnly = false;

// --- LOCAL STORAGE ---
function saveMessages() { localStorage.setItem('sms_app_pro', JSON.stringify(messagesData)); }
function loadMessages() {
    const saved = localStorage.getItem('sms_app_pro');
    if (saved) {
        let parsed = JSON.parse(saved);
        return parsed.map(msg => ({
            ...msg,
            pinned: msg.pinned || false,
            phone: msg.phone || "+254 " + Math.floor(100000000 + Math.random() * 900000000),
            allowReply: msg.allowReply !== undefined ? msg.allowReply : true,
            history: msg.history || [{ text: msg.preview, type: "received", time: msg.time }]
        }));
    }
    return [...defaultMessages];
}
let messagesData = loadMessages();

// --- WEB AUDIO API ---
let audioCtx = null;
function playNotificationSound() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch(e) { console.log("Audio not supported"); }
}

// --- VIEW UNREAD LOGIC ---
const viewUnreadBtn = document.getElementById('viewUnreadBtn');
viewUnreadBtn.addEventListener('click', () => {
    showingUnreadOnly = !showingUnreadOnly;
    viewUnreadBtn.textContent = showingUnreadOnly ? "Show All" : "View";
    renderMessages();
});

// 1. Render messages dynamically
function renderMessages(filterText = "") {
    messagesData.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned - a.pinned;
        if ((a.unread > 0) !== (b.unread > 0)) return (b.unread > 0) - (a.unread > 0);
        return 0;
    });

    let baseData = showingUnreadOnly ? messagesData.filter(msg => msg.unread > 0) : messagesData;
    const filteredData = baseData.filter(msg => 
        msg.name.toLowerCase().includes(filterText.toLowerCase()) || 
        msg.preview.toLowerCase().includes(filterText.toLowerCase())
    );

    if (showingUnreadOnly && baseData.length === 0) {
        messagesList.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><h3>All Caught Up!</h3><p>You have no unread messages.</p></div>`;
        updateUnreadCounts();
        return;
    }

    if(messagesData.length === 0 && !filterText) {
        messagesList.innerHTML = `<div class="empty-state"><i class="fas fa-comments"></i><h3>No Messages</h3><p>Tap the pencil icon below to simulate receiving a new message.</p></div>`;
        updateUnreadCounts();
        return;
    }

    if(filteredData.length === 0) {
        messagesList.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>No Results</h3><p>No messages match your search.</p></div>`;
        return;
    }

    let html = '';
    let unreadDividerAdded = false;
    filteredData.forEach(msg => {
        if (msg.unread > 0 && !unreadDividerAdded && !msg.pinned && !showingUnreadOnly) {
            html += `<div class="list-divider">Unread Messages</div>`;
            unreadDividerAdded = true;
        }
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
                </div>
            </div>
        `;
    });
    messagesList.innerHTML = html;
    setupMessageInteractions();
    updateUnreadCounts();
}

// 2. Render Contacts View (Real Phone Contacts)
function renderContacts(filterText = "") {
    // Check if Contact Picker API is supported
    if (!('contacts' in navigator) || !navigator.contacts.select) {
        contactsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-address-book"></i>
                <h3>Access Not Supported</h3>
                <p>Your browser does not support reading phone contacts directly. Try opening this app on an Android phone using Chrome.</p>
            </div>`;
        return;
    }

    contactsList.innerHTML = `
        <div style="padding: 30px 20px; text-align: center;">
            <button id="pickContactsBtn" class="view-button" style="padding: 12px 25px; font-size: 16px; margin-bottom: 20px;">
                <i class="fas fa-address-book"></i> Select Phone Contacts
            </button>
            <div id="pickedContactsList"></div>
        </div>`;
    
    document.getElementById('pickContactsBtn').addEventListener('click', pickContacts);
}

async function pickContacts() {
    const properties = ['name', 'tel'];
    const opts = { multiple: true };
    try {
        const contacts = await navigator.contacts.select(properties, opts);
        let html = '';
        contacts.forEach(c => {
            const name = c.name ? c.name[0] : "Unknown";
            const tel = c.tel ? c.tel[0] : "No Number";
            const safeName = name.replace(/'/g, "");
            const safeTel = tel.replace(/'/g, "");
            html += `
                <div class="contact-item" onclick="startChatFromContact('${safeName}', '${safeTel}')">
                    <div class="avatar bg-grey">${name.charAt(0)}</div>
                    <div class="contact-info">
                        <div class="contact-name">${name}</div>
                        <div class="contact-phone">${tel}</div>
                    </div>
                </div>`;
        });
        document.getElementById('pickedContactsList').innerHTML = html || `<p style="color: var(--text-secondary); font-size: 14px;">No contacts selected.</p>`;
    } catch (err) {
        console.error("Contact picker error:", err);
    }
}

function startChatFromContact(name, tel) {
    let existingChat = messagesData.find(m => m.name === name);
    if (!existingChat) {
        existingChat = {
            id: Date.now(), name: name, phone: tel, color: "bg-grey", initial: name.charAt(0).toUpperCase(),
            time: "Just now", preview: "Tap to start chatting...", unread: 0, pinned: false, allowReply: true, history: []
        };
        messagesData.unshift(existingChat);
        saveMessages();
    }
    openChat(existingChat.id);
}

// 3. Update Unread Counts
function updateUnreadCounts() {
    const totalUnread = messagesData.reduce((sum, msg) => sum + msg.unread, 0);
    totalUnreadEl.textContent = totalUnread;
    if(totalUnread > 0) {
        navBadgeEl.textContent = totalUnread;
        navBadgeEl.style.display = 'block';
    } else {
        navBadgeEl.style.display = 'none';
    }
}

// 4. Message Interactions (Swipe, Long-Press, Click)
const contextMenuOverlay = document.getElementById('contextMenuOverlay');
const ctxMarkRead = document.getElementById('ctxMarkRead');
const ctxPin = document.getElementById('ctxPin');
const ctxDelete = document.getElementById('ctxDelete');
const ctxCancel = document.getElementById('ctxCancel');

        function setupMessageInteractions() {
            document.querySelectorAll('.message-wrapper').forEach(wrapper => {
                const item = wrapper.querySelector('.message-item');
                let startX = 0, startY = 0, currentX = 0, isDragging = false;
                let pressTimer = null, hasLongPressed = false, hasMoved = false;

                const startInteraction = (x, y) => {
                    hasLongPressed = false; 
                    hasMoved = false;
                    startX = x; startY = y;
                    isDragging = true; 
                    item.style.transition = 'none';
                    
                    // Start Long Press Timer (500ms)
                    pressTimer = setTimeout(() => {
                        hasLongPressed = true;
                        isDragging = false; // Stop dragging once long-pressed
                        const id = parseInt(wrapper.dataset.id);
                        if (navigator.vibrate) navigator.vibrate(30);
                        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        item.style.opacity = '0';
                        item.style.transform = 'translateX(-100%)';
                        setTimeout(() => {
                            messagesData = messagesData.filter(msg => msg.id !== id);
                            saveMessages(); renderMessages();
                        }, 300);
                    }, 500);
                };

                const handleMove = (x, y) => {
                    if (!isDragging) return;
                    currentX = x - startX;
                    const diffY = Math.abs(y - startY);
                    
                    // If finger moves more than 15px, cancel the long-press
                    if (Math.abs(currentX) > 15 || diffY > 15) { 
                        if (!hasLongPressed) {
                            clearTimeout(pressTimer);
                            hasMoved = true;
                        }
                    }
                    
                    // Handle Swipe Left/Right visual
                    if (currentX < 0) {
                        item.style.transform = `translateX(${Math.max(currentX, -100)}px)`;
                    } else if (currentX > 0) {
                        item.style.transform = `translateX(${Math.min(currentX, 80)}px)`;
                    }
                };

                const endInteraction = () => {
                    if (!isDragging) return;
                    isDragging = false;
                    clearTimeout(pressTimer);
                    item.style.transition = 'transform 0.3s ease';
                    
                    if (currentX < -50) { // Swipe Left Delete
                        item.style.transform = 'translateX(-100%)';
                        setTimeout(() => {
                            const id = parseInt(wrapper.dataset.id);
                            messagesData = messagesData.filter(msg => msg.id !== id);
                            saveMessages(); renderMessages();
                        }, 300);
                    } else if (currentX > 40) { // Swipe Right Mark Read
                        item.style.transform = 'translateX(0)';
                        const id = parseInt(wrapper.dataset.id);
                        const msg = messagesData.find(m => m.id === id);
                        msg.unread = msg.unread > 0 ? 0 : 1; 
                        saveMessages(); renderMessages();
                        if (navigator.vibrate) navigator.vibrate(10);
                    } else {
                        item.style.transform = 'translateX(0)';
                    }
                    currentX = 0;
                };

                // Click for opening chat
                item.addEventListener('click', (e) => {
                    if (hasLongPressed || hasMoved) { e.preventDefault(); e.stopPropagation(); return; }
                    const id = parseInt(wrapper.dataset.id);
                    openChat(id);
                });

                // Prevent Android native context menu
                item.addEventListener('contextmenu', (e) => e.preventDefault());

                // Mouse Events
                item.addEventListener('mousedown', (e) => startInteraction(e.clientX, e.clientY));
                item.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
                item.addEventListener('mouseup', endInteraction);
                item.addEventListener('mouseleave', () => { if(isDragging) endInteraction(); });

                // Touch Events
                item.addEventListener('touchstart', (e) => startInteraction(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
                item.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY), {passive: true});
                item.addEventListener('touchend', endInteraction);
            });
        }

ctxCancel.addEventListener('click', () => contextMenuOverlay.classList.remove('active'));
contextMenuOverlay.addEventListener('click', (e) => { if(e.target === contextMenuOverlay) contextMenuOverlay.classList.remove('active'); });
ctxMarkRead.addEventListener('click', () => { const msg = messagesData.find(m => m.id === contextMenuTargetId); msg.unread = msg.unread > 0 ? 0 : 1; saveMessages(); renderMessages(); contextMenuOverlay.classList.remove('active'); });
ctxPin.addEventListener('click', () => { const msg = messagesData.find(m => m.id === contextMenuTargetId); msg.pinned = !msg.pinned; saveMessages(); renderMessages(); contextMenuOverlay.classList.remove('active'); });
ctxDelete.addEventListener('click', () => { messagesData = messagesData.filter(msg => msg.id !== contextMenuTargetId); saveMessages(); renderMessages(); contextMenuOverlay.classList.remove('active'); });

// 5. Compose New Message
document.getElementById('newMessageBtn').addEventListener('click', () => { composeModal.classList.add('active'); composeSender.focus(); });
composeCancel.addEventListener('click', () => { composeModal.classList.remove('active'); composeSender.value = ""; composeText.value = ""; });
composeSend.addEventListener('click', () => {
    const sender = composeSender.value.trim() || "Unknown Sender";
    const text = composeText.value.trim();
    if (!text) return;
    const currentTime = getRealTime();

    let existingChat = messagesData.find(m => m.name.toLowerCase() === sender.toLowerCase());
    if (existingChat) {
        existingChat.unread = (existingChat.unread || 0) + 1;
        existingChat.preview = text; existingChat.time = currentTime;
        existingChat.history.push({ text, type: "received", time: currentTime });
        messagesData = messagesData.filter(m => m.id !== existingChat.id);
        messagesData.unshift(existingChat);
    } else {
        const colors = ['bg-green', 'bg-blue', 'bg-purple', 'bg-orange', 'bg-red', 'bg-teal'];
        const newId = Date.now();
        const newMsg = {
            id: newId, name: sender, phone: "+254 " + Math.floor(100000000 + Math.random() * 900000000),
            color: colors[Math.floor(Math.random() * colors.length)], initial: sender.charAt(0).toUpperCase(),
            time: currentTime, preview: text, unread: 1, pinned: false, allowReply: true,
            history: [{ text, type: "received", time: currentTime }]
        };
        messagesData.unshift(newMsg);
    }

    saveMessages(); renderMessages();
    if(document.body.classList.contains('contacts-active')) renderContacts();
    playNotificationSound();
    if (navigator.vibrate) navigator.vibrate(15);
    notificationBanner.querySelector('.notif-avatar').textContent = sender.charAt(0).toUpperCase();
    notificationBanner.querySelector('.notif-avatar').className = `notif-avatar bg-teal`;
    notificationBanner.querySelector('.notif-title').textContent = sender;
    notificationBanner.querySelector('.notif-text').textContent = text;
    notificationBanner.classList.add('show');
    setTimeout(() => notificationBanner.classList.remove('show'), 3000);
    composeModal.classList.remove('active');
    composeSender.value = ""; composeText.value = "";
});

// 6. Search
const searchToggle = document.getElementById('searchToggle');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');
searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('active');
    if(searchBar.classList.contains('active')) {
        searchInput.focus();
        searchInput.placeholder = document.body.classList.contains('contacts-active') ? "Search contacts..." : "Search messages...";
    } else { searchInput.value = ""; renderMessages(); renderContacts(); }
});
searchInput.addEventListener('input', (e) => {
    if(document.body.classList.contains('contacts-active')) renderContacts(e.target.value);
    else renderMessages(e.target.value);
});

// 7. Dark Mode
const darkModeToggle = document.getElementById('darkModeToggle');
if(localStorage.getItem('sms_app_pro_dark') === 'true') { document.body.classList.add('dark-mode'); darkModeToggle.classList.replace('fa-moon', 'fa-sun'); }
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('sms_app_pro_dark', isDark);
    darkModeToggle.classList.toggle('fa-moon', !isDark);
    darkModeToggle.classList.toggle('fa-sun', isDark);
});

// 8. Open Chat & Render History
function openChat(id) {
    const message = messagesData.find(m => m.id === id);
    activeChatId = id;
    chatTitle.textContent = message.name;
    chatAvatar.textContent = message.initial;
    chatAvatar.className = `chat-avatar ${message.color}`;
    
    const chatInputArea = document.querySelector('.chat-input-area');
    if (message.allowReply === false || message.name === "MPESA" || message.name === "AirtelAlert") chatInputArea.style.display = 'none';
    else chatInputArea.style.display = 'flex';
    
    if(message.unread > 0) { message.unread = 0; saveMessages(); }
    renderChatHistory(message);
    chatView.classList.add('active');
}

function renderChatHistory(message) {
    chatBody.innerHTML = `<div class="chat-date-divider">Today</div>`;
    if (message.history.length === 0) {
        chatBody.innerHTML += `<div class="chat-bubble received" style="background: transparent; color: var(--text-secondary); align-self: center; box-shadow: none; border: none;">This is the beginning of your conversation with ${message.name}.</div>`;
        chatBody.scrollTop = chatBody.scrollHeight;
        return;
    }
    message.history.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.type}`;
        bubble.innerHTML = `${msg.text}<div class="chat-meta"><span>${msg.time}</span>${msg.type === 'sent' ? '<i class="fas fa-check-double read-receipt"></i>' : ''}</div>`;
        chatBody.appendChild(bubble);
    });
    chatBody.scrollTop = chatBody.scrollHeight;
}

// 9. Send Message
const sendBtn = document.getElementById('sendBtn');
function sendMessage() {
    const text = messageInput.value.trim();
    if(text === "" || activeChatId === null) return;
    const message = messagesData.find(m => m.id === activeChatId);
    const time = getRealTime();
    message.history.push({ text, type: "sent", time });
    message.preview = text; message.time = "Just now";
    saveMessages();
    const sentBubble = document.createElement('div');
    sentBubble.className = 'chat-bubble sent';
    sentBubble.innerHTML = `${text}<div class="chat-meta"><span>${time}</span><i class="fas fa-check"></i></div>`;
    chatBody.appendChild(sentBubble);
    messageInput.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;
    setTimeout(() => { sentBubble.querySelector('.chat-meta').innerHTML = `<span>${time}</span><i class="fas fa-check-double read-receipt"></i>`; }, 500);
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble received typing-indicator';
    typingBubble.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(typingBubble);
    chatBody.scrollTop = chatBody.scrollHeight;
    setTimeout(() => {
        typingBubble.remove();
        const replyText = "Got it! Thanks for your message.";
        const replyTime = getRealTime();
        message.history.push({ text: replyText, type: "received", time: replyTime });
        saveMessages();
        const replyBubble = document.createElement('div');
        replyBubble.className = 'chat-bubble received';
        replyBubble.innerHTML = `${replyText}<div class="chat-meta"><span>${replyTime}</span></div>`;
        chatBody.appendChild(replyBubble);
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 1500);
}
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// 10. Handle closing the chat view
document.getElementById('backBtn').addEventListener('click', () => {
    chatView.classList.remove('active');
    activeChatId = null;
    renderMessages(); 
    renderContacts();
});

// 11. Bottom Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        const view = this.dataset.view;
        if(view === 'contacts') { document.body.classList.add('contacts-active'); viewTitle.textContent = "Contacts"; renderContacts(); }
        else { document.body.classList.remove('contacts-active'); viewTitle.textContent = "Messages"; renderMessages(); }
        searchBar.classList.remove('active'); searchInput.value = "";
    });
});

// Initial Render
renderMessages();
renderContacts();

// 10. Handle closing the chat view
document.getElementById('backBtn').addEventListener('click', () => {
    chatView.classList.remove('active');
    activeChatId = null;
    renderMessages(); 
    renderContacts();
});

// NEW: Delete Conversation from inside the chat
document.getElementById('deleteChatBtn').addEventListener('click', () => {
    if (activeChatId === null) return;
    
    // Android native confirmation dialog
    const confirmDelete = confirm("Delete this entire conversation?");
    if (confirmDelete) {
        messagesData = messagesData.filter(msg => msg.id !== activeChatId);
        saveMessages();
        chatView.classList.remove('active'); // Close the chat view
        activeChatId = null;
        renderMessages(); // Re-render the main list
        renderContacts(); // Re-render contacts
    }
});