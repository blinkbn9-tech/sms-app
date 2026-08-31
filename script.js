// 1. Default Data (Now includes chatHistory, phone, and pinned status)
const defaultMessages = [
    { id: 1, name: "MPESA", phone: "+254 722 000 000", color: "bg-green", initial: "M", time: "9:30 AM", unread: 3, pinned: false, allowReply: false, history: [{ text: "You have received Ksh 1,500 from JOHN DOE. New balance is 3,450.", type: "received", time: "9:30 AM" }] },
    { id: 2, name: "Safaricom", phone: "+254 720 000 000", color: "bg-blue", initial: "S", time: "8:45 AM", preview: "Your data balance is 2.5GB.", unread: 8, pinned: false, allowReply: false, history: [{ text: "Your data balance is 2.5GB. Expires on 28/08/2026.", type: "received", time: "8:45 AM" }] },
    { id: 3, name: "Voice Mail", phone: "+254 711 000 000", color: "bg-purple", initial: "V", time: "Yesterday", preview: "You have 8 new voice messages.", unread: 8, pinned: false, allowReply: false, history: [{ text: "You have 8 new voice messages. Call 111 to listen.", type: "received", time: "Yesterday" }] },
    { id: 4, name: "Airtel", phone: "+254 730 000 000", color: "bg-orange", initial: "A", time: "Yesterday", preview: "Your Airtel data balance is 1.2GB.", unread: 21, pinned: false, allowReply: false, history: [{ text: "Your Airtel data balance is 1.2GB.", type: "received", time: "Yesterday" }] },
    { id: 5, name: "AirtelAlert", phone: "+254 730 111 111", color: "bg-red", initial: "A", time: "2 days ago", preview: "Dear customer, your account balance is Ksh 45.", unread: 12, pinned: false, allowReply: false, history: [{ text: "Dear customer, your account balance is Ksh 45.", type: "received", time: "2 days ago" }] },
    { id: 6, name: "SAFARICOM", phone: "+254 700 000 000", color: "bg-grey", initial: "S", time: "3 days ago", preview: "Tuma Pesa: You have received Ksh 2,000.", unread: 0, pinned: false, allowReply: false, history: [{ text: "Tuma Pesa: You have received Ksh 2,000.", type: "received", time: "3 days ago" }] }
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

// --- LOCAL STORAGE ---
function saveMessages() { 
    localStorage.setItem('sms_app_pro', JSON.stringify(messagesData)); 
}

function loadMessages() {
    const saved = localStorage.getItem('sms_app_pro');
    if (saved) {
        let parsed = JSON.parse(saved);
        // Backward compatibility: ensure pinned, phone, and allowReply exist
        return parsed.map(msg => ({
            ...msg,
            pinned: msg.pinned || false,
            phone: msg.phone || "+254 " + Math.floor(100000000 + Math.random() * 900000000),
            allowReply: msg.allowReply !== undefined ? msg.allowReply : true, // Default to true
            history: msg.history || [{ text: msg.preview, type: "received", time: msg.time }]
        }));
    }
    return [...defaultMessages];
}
let messagesData = loadMessages();

// --- WEB AUDIO API FOR NOTIFICATION SOUND ---
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

// 2. Render messages dynamically
        function renderMessages(filterText = "") {
            // Sort: Pinned first, then Unread, then Read
            messagesData.sort((a, b) => {
                if (a.pinned !== b.pinned) return b.pinned - a.pinned;
                if ((a.unread > 0) !== (b.unread > 0)) return (b.unread > 0) - (a.unread > 0);
                return 0;
            });

            const filteredData = messagesData.filter(msg => 
                msg.name.toLowerCase().includes(filterText.toLowerCase()) || 
                msg.preview.toLowerCase().includes(filterText.toLowerCase())
            );

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
                // Add "Unread Messages" divider before the first unread message
                if (msg.unread > 0 && !unreadDividerAdded && !msg.pinned) {
                    html += `<div class="list-divider">Unread Messages</div>`;
                    unreadDividerAdded = true;
                }

                html += `
                    <div class="message-wrapper ${msg.pinned ? 'pinned' : ''}" data-id="${msg.id}">
                        <div class="delete-background">Delete</div>
                        <div class="mark-read-background"><i class="fas fa-check"></i></div>
                        <div class="message-item">
                            <div class="avatar ${msg.color}">${msg.initial}</div>
                            <div class="message-content" onclick="openChat(${msg.id})">
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

// 3. Render Contacts View
function renderContacts(filterText = "") {
    const filteredData = messagesData.filter(msg => 
        msg.name.toLowerCase().includes(filterText.toLowerCase()) || 
        (msg.phone && msg.phone.includes(filterText.toLowerCase()))
    );

    if(filteredData.length === 0) {
        contactsList.innerHTML = `<div class="empty-state"><i class="fas fa-user-slash"></i><h3>No Contacts</h3><p>No contacts found.</p></div>`;
        return;
    }

    // Sort contacts alphabetically
    filteredData.sort((a, b) => a.name.localeCompare(b.name));

    contactsList.innerHTML = filteredData.map(msg => `
        <div class="contact-item" onclick="openChat(${msg.id})">
            <div class="avatar ${msg.color}">${msg.initial}</div>
            <div class="contact-info">
                <div class="contact-name">${msg.name}</div>
                <div class="contact-phone">${msg.phone || 'Unknown Number'}</div>
            </div>
        </div>
    `).join('');
}

// 4. Update Unread Counts
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

// 5. Message Interactions (Swipe, Long-Press, Right-Click)
const contextMenuOverlay = document.getElementById('contextMenuOverlay');
const ctxMarkRead = document.getElementById('ctxMarkRead');
const ctxPin = document.getElementById('ctxPin');
const ctxDelete = document.getElementById('ctxDelete');
const ctxCancel = document.getElementById('ctxCancel');

                function setupMessageInteractions() {
            document.querySelectorAll('.message-wrapper').forEach(wrapper => {
                const item = wrapper.querySelector('.message-item');
                let startX = 0, currentX = 0, isDragging = false;
                let pressTimer = null;

                // --- Long Press Logic (Instant Delete) ---
                const startPress = () => {
                    pressTimer = setTimeout(() => {
                        const id = parseInt(wrapper.dataset.id);
                        
                        // Vibrate to confirm delete
                        if (navigator.vibrate) navigator.vibrate(30);
                        
                        // Fade out animation
                        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        item.style.opacity = '0';
                        item.style.transform = 'translateX(-100%)';
                        
                        // Remove from data
                        setTimeout(() => {
                            messagesData = messagesData.filter(msg => msg.id !== id);
                            saveMessages();
                            renderMessages();
                        }, 300);
                    }, 600); // 600ms hold
                };

                const cancelPress = () => { clearTimeout(pressTimer); };

                // --- Swipe Logic ---
                const startDrag = (x) => {
                    cancelPress(); // Cancel long press if they start dragging
                    startX = x; 
                    isDragging = true; 
                    item.style.transition = 'none';
                };

                const drag = (x) => {
                    if (!isDragging) return;
                    currentX = x - startX;
                    if (currentX < 0) {
                        item.style.transform = `translateX(${Math.max(currentX, -100)}px)`;
                    } else if (currentX > 0) {
                        item.style.transform = `translateX(${Math.min(currentX, 80)}px)`;
                    }
                };

                const endDrag = () => {
                    if (!isDragging) return;
                    isDragging = false;
                    item.style.transition = 'transform 0.3s ease';
                    
                    if (currentX < -50) {
                        item.style.transform = 'translateX(-100%)';
                        setTimeout(() => {
                            const id = parseInt(wrapper.dataset.id);
                            messagesData = messagesData.filter(msg => msg.id !== id);
                            saveMessages();
                            renderMessages();
                        }, 300);
                    } else if (currentX > 40) {
                        item.style.transform = 'translateX(0)';
                        const id = parseInt(wrapper.dataset.id);
                        const msg = messagesData.find(m => m.id === id);
                        msg.unread = msg.unread > 0 ? 0 : 1; 
                        saveMessages();
                        renderMessages();
                        if (navigator.vibrate) navigator.vibrate(10);
                    } else {
                        item.style.transform = 'translateX(0)';
                    }
                    currentX = 0;
                };

                // Mouse Events
                wrapper.addEventListener('mousedown', (e) => { startPress(); startDrag(e.clientX); });
                wrapper.addEventListener('mousemove', (e) => drag(e.clientX));
                wrapper.addEventListener('mouseup', endDrag);
                wrapper.addEventListener('mouseleave', () => { cancelPress(); endDrag(); });
                
                // Touch Events
                wrapper.addEventListener('touchstart', (e) => { startPress(); startDrag(e.touches[0].clientX); }, {passive: true});
                wrapper.addEventListener('touchmove', (e) => drag(e.touches[0].clientX), {passive: true});
                wrapper.addEventListener('touchend', endDrag);
            });
        }

// Context Menu Actions
ctxCancel.addEventListener('click', () => contextMenuOverlay.classList.remove('active'));
contextMenuOverlay.addEventListener('click', (e) => {
    if(e.target === contextMenuOverlay) contextMenuOverlay.classList.remove('active');
});

ctxMarkRead.addEventListener('click', () => {
    const msg = messagesData.find(m => m.id === contextMenuTargetId);
    msg.unread = msg.unread > 0 ? 0 : 1; // Toggle read/unread
    saveMessages();
    renderMessages();
    contextMenuOverlay.classList.remove('active');
});

ctxPin.addEventListener('click', () => {
    const msg = messagesData.find(m => m.id === contextMenuTargetId);
    msg.pinned = !msg.pinned; // Toggle pin
    saveMessages();
    renderMessages();
    contextMenuOverlay.classList.remove('active');
});

ctxDelete.addEventListener('click', () => {
    messagesData = messagesData.filter(msg => msg.id !== contextMenuTargetId);
    saveMessages();
    renderMessages();
    contextMenuOverlay.classList.remove('active');
});

// 6. Compose New Message Modal Logic
document.getElementById('newMessageBtn').addEventListener('click', () => {
    composeModal.classList.add('active');
    composeSender.focus();
});

composeCancel.addEventListener('click', () => {
    composeModal.classList.remove('active');
    composeSender.value = "";
    composeText.value = "";
});

composeSend.addEventListener('click', () => {
    const sender = composeSender.value.trim() || "Unknown Sender";
    const text = composeText.value.trim();
    if (!text) return;

    // Get the phone's actual current time (e.g., "2:45 PM")
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let existingChat = messagesData.find(m => m.name.toLowerCase() === sender.toLowerCase());
    
    if (existingChat) {
        existingChat.unread = (existingChat.unread || 0) + 1;
        existingChat.preview = text;
        existingChat.time = currentTime; // Updated time
        existingChat.history.push({ text, type: "received", time: currentTime }); // Updated time
        messagesData = messagesData.filter(m => m.id !== existingChat.id);
        messagesData.unshift(existingChat);
    } else {
        const colors = ['bg-green', 'bg-blue', 'bg-purple', 'bg-orange', 'bg-red', 'bg-teal'];
        const newId = Date.now();
        const newMsg = {
            id: newId,
            name: sender,
            phone: "+254 " + Math.floor(100000000 + Math.random() * 900000000),
            color: colors[Math.floor(Math.random() * colors.length)],
            initial: sender.charAt(0).toUpperCase(),
            time: currentTime, // Updated time
            preview: text,
            unread: 1,
            pinned: false,
            allowReply: true,
            history: [{ text, type: "received", time: currentTime }] // Updated time
        };
        messagesData.unshift(newMsg);
    }

    saveMessages();
    renderMessages();
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
    composeSender.value = "";
    composeText.value = "";
});

// 7. Search Functionality
const searchToggle = document.getElementById('searchToggle');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');

searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('active');
    if(searchBar.classList.contains('active')) {
        searchInput.focus();
        searchInput.placeholder = document.body.classList.contains('contacts-active') ? "Search contacts..." : "Search messages...";
    } else {
        searchInput.value = ""; 
        renderMessages();
        renderContacts();
    }
});

searchInput.addEventListener('input', (e) => {
    if(document.body.classList.contains('contacts-active')) {
        renderContacts(e.target.value);
    } else {
        renderMessages(e.target.value);
    }
});

// 8. Dark Mode Functionality
const darkModeToggle = document.getElementById('darkModeToggle');
if(localStorage.getItem('sms_app_pro_dark') === 'true') {
    document.body.classList.add('dark-mode');
    darkModeToggle.classList.replace('fa-moon', 'fa-sun');
}

darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('sms_app_pro_dark', isDark);
    darkModeToggle.classList.toggle('fa-moon', !isDark);
    darkModeToggle.classList.toggle('fa-sun', isDark);
});

// 9. Open Chat & Render History
function openChat(id) {
    const message = messagesData.find(m => m.id === id);
    activeChatId = id;
    
    chatTitle.textContent = message.name;
    chatAvatar.textContent = message.initial;
    chatAvatar.className = `chat-avatar ${message.color}`;
    
    // --- NEW: Hide input bar if replies are not allowed ---
    const chatInputArea = document.querySelector('.chat-input-area');
    
    // We check allowReply, AND we check the name directly to override old Local Storage data
    if (message.allowReply === false || message.name === "MPESA" || message.name === "AirtelAlert") {
        chatInputArea.style.display = 'none';
    } else {
        chatInputArea.style.display = 'flex';
    }
    
    if(message.unread > 0) {
        message.unread = 0;
        saveMessages();
    }

    renderChatHistory(message);
    chatView.classList.add('active');
}

function renderChatHistory(message) {
    chatBody.innerHTML = `<div class="chat-date-divider">Today</div>`;
    
    message.history.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.type}`;
        bubble.innerHTML = `
            ${msg.text}
            <div class="chat-meta">
                <span>${msg.time}</span>
                ${msg.type === 'sent' ? '<i class="fas fa-check-double read-receipt"></i>' : ''}
            </div>
        `;
        chatBody.appendChild(bubble);
    });
    chatBody.scrollTop = chatBody.scrollHeight;
}

// 10. Send Message (Now saves to history & shows read receipt)
const sendBtn = document.getElementById('sendBtn');

function sendMessage() {
    const text = messageInput.value.trim();
    if(text === "" || activeChatId === null) return;

    const message = messagesData.find(m => m.id === activeChatId);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    message.history.push({ text, type: "sent", time });
    message.preview = text;
    message.time = "Just now";
    saveMessages();

    const sentBubble = document.createElement('div');
    sentBubble.className = 'chat-bubble sent';
    sentBubble.innerHTML = `${text}<div class="chat-meta"><span>${time}</span><i class="fas fa-check"></i></div>`;
    chatBody.appendChild(sentBubble);
    
    messageInput.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    // Simulate "Delivered" -> "Read"
    setTimeout(() => {
        sentBubble.querySelector('.chat-meta').innerHTML = `<span>${time}</span><i class="fas fa-check-double read-receipt"></i>`;
    }, 500);

    // Typing Indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble received typing-indicator';
    typingBubble.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(typingBubble);
    chatBody.scrollTop = chatBody.scrollHeight;

    // Bot Reply
    setTimeout(() => {
        typingBubble.remove();
        const replyText = "Got it! Thanks for your message.";
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
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

// 11. Handle closing the chat view
document.getElementById('backBtn').addEventListener('click', () => {
    chatView.classList.remove('active');
    activeChatId = null;
    renderMessages(); 
    renderContacts();
});

// 12. Bottom Navigation Interactivity (Switching Views)
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');

        const view = this.dataset.view;
        if(view === 'contacts') {
            document.body.classList.add('contacts-active');
            viewTitle.textContent = "Contacts";
            renderContacts();
        } else {
            document.body.classList.remove('contacts-active');
            viewTitle.textContent = "Messages";
            renderMessages();
        }

        // Close search if switching tabs
        searchBar.classList.remove('active');
        searchInput.value = "";
    });
});

// Initial Render
renderMessages();
renderContacts();

// --- PWA Install Logic ---
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome from showing the mini-infobar
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show our custom Install button!
    installBtn.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        // Show the official Chrome install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond
        const { outcome } = await deferredPrompt.userChoice;
        
        // Hide our button after they click
        installBtn.style.display = 'none';
        deferredPrompt = null;
    }
});

window.addEventListener('appinstalled', () => {
    // Hide the button completely once installed
    installBtn.style.display = 'none';
});