// Global variables
let currentChatId = null;
let messagesContainer = null;
let welcomeScreen = null;
let chatInput = null;
let sidebar = null;

// Initialize the app after DOM is loaded
function initializeApp() {
    // Initialize DOM elements
    sidebar = document.getElementById('sidebar');
    messagesContainer = document.getElementById('messages-container');
    welcomeScreen = document.getElementById('welcome-screen');
    chatInput = document.querySelector('.chat-textarea');
    
    const menuButton = document.querySelector('.icon-button');
    const closeButton = document.querySelector('.close-sidebar');
    const newChatButton = document.querySelector('.new-chat');
    const sendButton = document.querySelector('.send-button');
    const body = document.body;

    if (!messagesContainer || !welcomeScreen || !chatInput || !sidebar) {
        console.error('Required DOM elements not found');
        return;
    }

    // Initialize currentChatId
    currentChatId = Date.now().toString();

    // Initialize UI state
    messagesContainer.style.display = 'none';
    welcomeScreen.style.display = 'flex';

    // Add event listeners with debug logs
    menuButton?.addEventListener('click', () => {
        console.log('Menu button clicked');
        sidebar.classList.add('open');
        body.classList.add('sidebar-open');
    });

    closeButton?.addEventListener('click', (e) => {
        console.log('Close button clicked');
        e.stopPropagation(); // Prevent event bubbling
        sidebar.classList.remove('open');
        body.classList.remove('sidebar-open');
    });

    // Add click event to sidebar overlay
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    sidebarOverlay?.addEventListener('click', () => {
        console.log('Overlay clicked');
        sidebar.classList.remove('open');
        body.classList.remove('sidebar-open');
    });

    // Debug log to check if elements are found
    console.log('Elements found:', {
        menuButton: !!menuButton,
        closeButton: !!closeButton,
        sidebar: !!sidebar,
        sidebarOverlay: !!sidebarOverlay
    });

    newChatButton?.addEventListener('click', startNewChat);
    sendButton?.addEventListener('click', handleSendMessage);
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Load chats from localStorage
    try {
        const chats = JSON.parse(localStorage.getItem('chats') || '{}');
        Object.entries(chats)
            .sort(([,a], [,b]) => b.timestamp - a.timestamp)
            .forEach(([chatId, chat]) => {
                addChatToSidebar(chatId, chat.title);
            });
    } catch (error) {
        console.error('Error loading chats from localStorage:', error);
    }
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', initializeApp);

async function handleSendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    console.log('Starting handleSendMessage with:', message);

    // Ensure proper display state
    welcomeScreen.style.display = 'none';
    messagesContainer.style.display = 'flex';
    messagesContainer.style.visibility = 'visible';
    messagesContainer.style.opacity = '1';

    try {
        // Add user message immediately
        const userMessage = { role: 'user', content: message, timestamp: Date.now() };
        addMessage(message, 'user');
        
        // Clear input and reset height
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        // Add loading message
        console.log('Adding loading animation');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai-message';
        loadingDiv.innerHTML = `
            <div class="message-content">
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(loadingDiv);
        loadingDiv.scrollIntoView({ behavior: 'smooth' });

        // Send message to backend
        console.log('Sending message to backend:', message);
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                chatId: currentChatId,
            }),
        });

        console.log('Received response:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        // Remove loading message
        loadingDiv.remove();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send message');
        }

        if (data.response) {
            const aiMessage = { role: 'assistant', content: data.response, timestamp: Date.now() };
            addMessage(data.response, 'ai');
            
            // Save chat to localStorage
            const chats = JSON.parse(localStorage.getItem('chats') || '{}');
            const chatMessages = chats[currentChatId]?.messages || [];
            chatMessages.push(userMessage, aiMessage);
            
            saveChat(currentChatId, chatMessages);
            
            // Update sidebar
            addChatToSidebar(currentChatId, generateChatTitle(chatMessages), true);
        } else {
            throw new Error('No response received from the model');
        }

    } catch (error) {
        console.error('Error in handleSendMessage:', error);
        const loadingMessage = messagesContainer.querySelector('.loading-dots')?.closest('.message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
        addMessage(`Error: ${error.message}`, 'error');
        showNotification(error.message || 'Failed to send message', 'error');
    }
}

function typeMessage(element, text, speed = 10) {
    let index = 0;
    element.textContent = '';
    const messageDiv = element.closest('.message');
    
    // Check if text contains code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        // Add text before code block
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }
        
        // Add code block
        parts.push({
            type: 'code',
            language: match[1] || 'plaintext',
            content: match[2].trim()
        });
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }
    
    // If no code blocks found, treat as normal text
    if (parts.length === 0) {
        parts.push({ type: 'text', content: text });
    }

    element.textContent = '';
    let currentPartIndex = 0;
    let currentTextIndex = 0;
    
    function type() {
        if (currentPartIndex < parts.length) {
            const part = parts[currentPartIndex];
            
            if (part.type === 'text') {
                if (currentTextIndex < part.content.length) {
                    if (currentTextIndex === 0) {
                        // Create new text node for this part
                        const textNode = document.createTextNode('');
                        element.appendChild(textNode);
                    }
                    const textNode = element.lastChild;
                    textNode.textContent += part.content[currentTextIndex];
                    currentTextIndex++;
                    setTimeout(type, speed);
                } else {
                    currentPartIndex++;
                    currentTextIndex = 0;
                    setTimeout(type, speed);
                }
            } else if (part.type === 'code') {
                const pre = document.createElement('pre');
                pre.className = 'line-numbers';
                pre.setAttribute('data-language', part.language);
                
                // Add copy button
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-xs">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"/>
                    </svg>
                `;
                pre.appendChild(copyBtn);
                
                const code = document.createElement('code');
                code.className = `language-${part.language}`;
                code.textContent = part.content;
                pre.appendChild(code);
                element.appendChild(pre);
                
                // Highlight code
                Prism.highlightElement(code);
                
                // Add click handler for copy button
                copyBtn.addEventListener('click', async () => {
                    const codeText = code.textContent;
                    try {
                        await navigator.clipboard.writeText(codeText);
                        
                        // Show success state
                        copyBtn.style.color = '#4CAF50';
                        setTimeout(() => {
                            copyBtn.style.color = ''; // Reset color after 1.5s
                        }, 1500);
                        
                        // Show notification
                        showNotification('Code copied to clipboard!', 'success');
                    } catch (err) {
                        console.error('Failed to copy code:', err);
                        showNotification('Failed to copy code', 'error');
                    }
                });
                
                currentPartIndex++;
                currentTextIndex = 0;
                setTimeout(type, speed);
            }
        } else {
            messageDiv.classList.add('typing-done');
        }
    }
    
    type();
}

function addMessage(text, type) {
    console.log(`Adding message of type ${type}:`, text);
    
    welcomeScreen.style.display = 'none';
    messagesContainer.style.display = 'flex';
    messagesContainer.style.visibility = 'visible';
    messagesContainer.style.opacity = '1';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    let content = text;
    if (type === 'error') {
        content = `<span class="error-text">${text}</span>`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p class="message-text" style="margin: 0; padding: 0;"></p>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });

    const messageText = messageDiv.querySelector('.message-text');
    
    if (type === 'ai') {
        // Only apply typewriter effect to AI messages
        typeMessage(messageText, text);
    } else {
        // Instantly show user messages
        messageText.textContent = text;
        messageDiv.classList.add('typing-done'); // Add class for non-AI messages
    }
}

function startNewChat() {
    console.log('Starting new chat');
    currentChatId = Date.now().toString();
    
    // Reset UI state
    welcomeScreen.style.display = 'none';
    messagesContainer.style.display = 'flex';
    messagesContainer.style.visibility = 'visible';
    messagesContainer.innerHTML = '';
    
    // Update sidebar
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    addChatToSidebar(currentChatId, 'New Chat', true);
    
    // Focus input
    chatInput.focus();
}

function saveChat(chatId, messages) {
    try {
        const chats = JSON.parse(localStorage.getItem('chats') || '{}');
        chats[chatId] = {
            id: chatId,
            title: generateChatTitle(messages),
            messages: messages,
            timestamp: Date.now()
        };
        localStorage.setItem('chats', JSON.stringify(chats));
    } catch (error) {
        console.error('Error saving chat:', error);
    }
}

function generateChatTitle(messages) {
    if (messages.length === 0) return 'New Chat';
    // Use the first user message as the title
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Chat';
    
    const title = firstUserMessage.content.slice(0, 30);
    return title + (firstUserMessage.content.length > 30 ? '...' : '');
}

function addChatToSidebar(chatId, title, isActive = false) {
    const chatList = document.querySelector('.chat-list');
    const existingChat = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    
    if (existingChat) {
        existingChat.querySelector('.chat-title').textContent = title;
        return;
    }

    const chatItem = document.createElement('div');
    chatItem.className = `chat-item${isActive ? ' active' : ''}`;
    chatItem.dataset.chatId = chatId;
    
    chatItem.innerHTML = `
        <div class="chat-item-content">
            <div class="chat-title">${title}</div>
        </div>
        <button class="delete-chat" aria-label="Delete chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;
    
    // Insert after the "New Chat" button
    const newChatButton = chatList.querySelector('.new-chat');
    newChatButton.insertAdjacentElement('afterend', chatItem);

    // Add event listeners
    chatItem.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-chat')) {
            loadChat(chatId);
        }
    });

    chatItem.querySelector('.delete-chat').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChat(chatId);
    });
}

function loadChat(chatId) {
    try {
        const chats = JSON.parse(localStorage.getItem('chats') || '{}');
        const chat = chats[chatId];
        
        if (!chat) {
            console.error('Chat not found:', chatId);
            return;
        }

        // Update UI
        currentChatId = chatId;
        welcomeScreen.style.display = 'none';
        messagesContainer.style.display = 'flex';
        messagesContainer.innerHTML = '';
        
        // Add messages
        chat.messages.forEach(msg => {
            addMessage(msg.content, msg.role === 'user' ? 'user' : 'ai');
        });
        
        // Update active state in sidebar
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chatId === chatId);
        });
        
        // Close sidebar on mobile
        document.body.classList.remove('sidebar-open');
        sidebar.classList.remove('open');
    } catch (error) {
        console.error('Error loading chat:', error);
        showNotification('Failed to load chat', 'error');
    }
}

function deleteChat(chatId) {
    try {
        const chats = JSON.parse(localStorage.getItem('chats') || '{}');
        delete chats[chatId];
        localStorage.setItem('chats', JSON.stringify(chats));
        
        // Remove from sidebar
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (chatItem) {
            chatItem.remove();
        }
        
        // If current chat was deleted, start a new one
        if (currentChatId === chatId) {
            startNewChat();
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
        showNotification('Failed to delete chat', 'error');
    }
}

function showNotification(message, type = 'info', options = {}) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    if (options.isConfirmation) {
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">
                    <span>${message}</span>
                </div>
                <div class="notification-actions">
                    <button class="confirm-btn">${options.confirmText || 'Confirm'}</button>
                    <button class="cancel-btn">${options.cancelText || 'Cancel'}</button>
                </div>
            </div>
        `;
    } else {
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">
                    <span>${message}</span>
                </div>
            </div>
        `;
    }
    
    container.appendChild(notification);
    
    if (!options.isConfirmation) {
        setTimeout(() => {
            notification.style.animation = 'slide-out 0.3s ease-out';
            setTimeout(() => {
                container.removeChild(notification);
            }, 300);
        }, options.duration || 3000);
    }
} 