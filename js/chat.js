document.addEventListener('DOMContentLoaded', () => {
  const sendButton = document.getElementById('send-button');
  const messageInput = document.getElementById('message-input');
  const chatMessages = document.getElementById('chat-messages');
  const logoutButton = document.querySelector('.logout-button');
  const userListElement = document.getElementById('user-list'); // Added for sidebar users
  const chatHeaderName = document.getElementById('chat-header-name'); // Added for chat header
  const chatHeaderAvatar = document.getElementById('chat-header-avatar'); // Added for chat header
  const chatHeaderStatus = document.getElementById('chat-header-status'); // Added for chat header
  const typingIndicator = document.getElementById('typing-indicator'); // Added typing indicator element
  const chatArea = document.querySelector('.chat-area'); // Get chat area element
  const usersButton = document.getElementById('users-button'); // Button to trigger popup
  const addContactPopup = document.getElementById('add-contact-popup');
  const closeAddContactPopup = document.getElementById('close-add-contact-popup');
  const addContactUsernameInput = document.getElementById('add-contact-username');
  const addContactButton = document.getElementById('add-contact-button');
  const addContactStatus = document.getElementById('add-contact-status');
  // --- New elements for New Chat Modal ---
  const newChatButton = document.getElementById('new-chat-button');
  const newChatModal = document.getElementById('new-chat-modal');
  const closeNewChatModalButton = document.getElementById('close-new-chat-modal');
  const newChatContactList = document.getElementById('new-chat-contact-list');
  // --- End New elements ---

  let websocket = null;
  let currentUser = null; // Store current user info
  let currentChatTarget = null; // Store ID of the user being chatted with (null for broadcast)
  let allUsers = {}; // Store fetched user data keyed by ID, including status
  let typingTimeout = null; // For debouncing typing events

  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    console.log('No access token found, redirecting to login.');
    window.location.href = 'index.html';
    return; // Stop execution if not logged in
  }

  // --- Utility Function to Format Last Seen Time ---\
  function formatLastSeen(isoTimestamp) {
    if (!isoTimestamp) return '';
    const now = new Date();
    const lastSeenDate = new Date(isoTimestamp);
    const diffSeconds = Math.round((now - lastSeenDate) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 60) return 'Last seen just now';
    if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    if (diffDays === 1) return 'Last seen yesterday';
    // Optional: More specific date format for older dates
    return `Last seen ${lastSeenDate.toLocaleDateString()}`;
  }

  // --- Toggle Add Contact Popup ---
  function toggleAddContactPopup(show) {
    if (addContactPopup) {
      addContactPopup.classList.toggle('visible', show);
      if (show) {
        addContactUsernameInput?.focus(); // Focus input when shown
      } else {
        // Clear status and input on hide
        addContactStatus.textContent = '';
        addContactStatus.className = 'add-contact-status';
        addContactUsernameInput.value = '';
      }
    }
  }

  // --- Toggle New Chat Modal ---
  function toggleNewChatModal(show) {
    if (newChatModal) {
      newChatModal.classList.toggle('visible', show);
      if (show) {
        populateNewChatModalList(); // Populate list when opening
      }
    }
  }

  // --- Populate New Chat Modal List ---
  function populateNewChatModalList() {
    if (!newChatContactList) return;
    newChatContactList.innerHTML = ''; // Clear existing list

    if (Object.keys(allUsers).length === 0) {
      newChatContactList.innerHTML = '<li>No contacts found.</li>'; 
      return;
    }

    Object.values(allUsers).forEach(user => {
      if (currentUser && user.id === currentUser.id) return; // Skip self

      const listItem = document.createElement('li');
      listItem.classList.add('contact-item'); // Use the same class for styling consistency (or specific modal item class)
      listItem.dataset.userId = user.id;

      const isOnline = user.is_online;
      const statusClass = isOnline ? 'online' : 'offline';
      // Simplified display for modal - just avatar and name
      listItem.innerHTML = `
        <div class="avatar-container">
          <img src="assets/images/default-avatar.png" alt="Avatar" class="avatar">
          <div class="status-indicator ${statusClass}"></div>
        </div>
        <div class="contact-info">
          <span class="contact-name">${user.username}</span>
        </div>
      `;

      // Add click listener to select user and close modal
      listItem.addEventListener('click', () => {
        console.log(`Starting chat with ${user.username} from modal.`);
        selectUser(user.id);
        toggleNewChatModal(false); // Close modal after selection
      });

      newChatContactList.appendChild(listItem);
    });
  }

  // --- Add Contact API Call ---
  async function addContact() {
    const username = addContactUsernameInput.value.trim();
    if (!username) {
      addContactStatus.textContent = 'Please enter a username.';
      addContactStatus.className = 'add-contact-status error';
      return;
    }

    addContactStatus.textContent = 'Adding...';
    addContactStatus.className = 'add-contact-status';
    addContactButton.disabled = true;

    try {
      const response = await fetch('http://127.0.0.1:8000/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username })
      });

      const result = await response.json();

      if (response.ok) {
        addContactStatus.textContent = `User '${result.username}' added successfully!`;
        addContactStatus.className = 'add-contact-status success';
        addContactUsernameInput.value = ''; // Clear input on success
        await fetchContacts(); // Refresh the contact list
        // Optionally close popup after a delay
        // setTimeout(() => toggleAddContactPopup(false), 1500); 
      } else {
        addContactStatus.textContent = `Error: ${result.detail || 'Failed to add contact'}`;
        addContactStatus.className = 'add-contact-status error';
      }

    } catch (error) {
      console.error('Error adding contact:', error);
      addContactStatus.textContent = 'Network error. Please try again.';
      addContactStatus.className = 'add-contact-status error';
    } finally {
      addContactButton.disabled = false;
    }
  }

  // --- Renamed: Fetch Contacts Data --- (Was fetchAllUsers)
  async function fetchContacts() { 
    if (!accessToken) return;
    // Reset contacts before fetching
    allUsers = {}; 
    // Ensure list is cleared visually before potential fetch error
    if(userListElement) userListElement.innerHTML = ''; 
    console.log('Fetching contacts...'); // Log start

    try {
      // Use the new /contacts endpoint
      const response = await fetch('http://127.0.0.1:8000/contacts', { 
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (response.ok) {
        const contacts = await response.json();
        console.log('Fetched contacts:', contacts);
         // Store contacts (replaces allUsers logic)
        allUsers = contacts.reduce((acc, user) => {
          acc[user.id] = user; // User object includes status and unread count
          return acc;
        }, {});
        populateUserList(); // Populate list from stored contacts
      } else {
        console.error('Failed to fetch contacts:', response.status);
        if(userListElement) userListElement.innerHTML = '<li style="padding: 10px; color: red;">Failed to load contacts</li>';
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
       if(userListElement) userListElement.innerHTML = '<li style="padding: 10px; color: red;">Error loading contacts</li>';
    }
  }

  // --- Fetch current user data (Update call to fetchContacts) ---
  async function fetchCurrentUser() {
    try {
      const response = await fetch('http://127.0.0.1:8000/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        currentUser = await response.json();
        console.log('Current user:', currentUser);
        await fetchContacts(); // Changed from fetchAllUsers
      } else {
         console.error('Failed to fetch user data:', response.status);
         // Handle error, maybe redirect to login
         localStorage.removeItem('accessToken');
         window.location.href = 'index.html';
      }
    } catch (error) {
        console.error('Error fetching user data:', error);
        localStorage.removeItem('accessToken');
        window.location.href = 'index.html';
    }
  }

  // --- Helper Function to Send WebSocket Messages ---
  function sendWebSocketMessage(action, payload) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log(`Sending WS Action: ${action}`, payload);
        websocket.send(JSON.stringify({ action: action, payload: payload }));
    } else {
        console.error("WebSocket not connected. Cannot send message.");
    }
  }

  // --- Populate/Update User List in Sidebar ---
  function populateUserList() {
    if (!userListElement) return;
    userListElement.innerHTML = ''; // Clear existing list

    Object.values(allUsers).forEach(user => {
        if (currentUser && user.id === currentUser.id) return; // Skip self

        const listItem = document.createElement('li');
        listItem.classList.add('contact-item');
        listItem.dataset.userId = user.id;

        const isOnline = user.is_online;
        const statusClass = isOnline ? 'online' : 'offline';
        const statusTitle = isOnline ? 'Online' : `Offline (${formatLastSeen(user.last_seen)})`;
        // Use the unread_count fetched from the /users endpoint
        const unreadCount = user.unread_count || 0; 

        listItem.innerHTML = `
            <div class="avatar-container">
                <img src="assets/images/default-avatar.png" alt="Avatar" class="avatar">
                <div class="status-indicator ${statusClass}" title="${statusTitle}"></div>
            </div>
            <div class="contact-info">
                <span class="contact-name">${user.username}</span>
                <span class="contact-preview"></span> <!-- TODO: Preview -->
            </div>
            <div class="contact-meta">
                <span class="timestamp"></span> <!-- TODO: Timestamp -->
                <!-- Display unread count badge if count > 0 -->
                <span class="unread-count" style="display: ${unreadCount > 0 ? 'inline-block' : 'none'};">${unreadCount}</span>
                <span class="last-seen" style="display: ${isOnline ? 'none' : 'block'};">${formatLastSeen(user.last_seen)}</span>
            </div>
        `;

        listItem.addEventListener('click', () => selectUser(user.id));
        userListElement.appendChild(listItem);
    });
  }

  // --- Update Unread Count Badge --- (New Helper)
  function updateUnreadBadge(userId, increment = true) {
    const listItem = userListElement.querySelector(`[data-user-id="${userId}"]`);
    if (!listItem) return;
    const badge = listItem.querySelector('.unread-count');
    if (!badge) return;

    let currentCount = parseInt(badge.textContent || '0', 10);
    
    if (increment) {
        currentCount++;
    } else { // Reset count
        currentCount = 0;
    }

    badge.textContent = currentCount;
    badge.style.display = currentCount > 0 ? 'inline-block' : 'none';
    
    // Also update the count in our local allUsers cache if needed
    if(allUsers[userId]) {
        allUsers[userId].unread_count = currentCount;
    }
  }

  // --- Update User Status in UI ---\
  function updateUserStatus(userId, isOnline, lastSeenIso) {
    // Update stored data
    if (allUsers[userId]) {
        allUsers[userId].is_online = isOnline;
        allUsers[userId].last_seen = lastSeenIso;
    }

    const listItem = userListElement.querySelector(`[data-user-id="${userId}"]`);
    if (listItem) {
      const statusIndicator = listItem.querySelector('.status-indicator');
      const lastSeenElement = listItem.querySelector('.last-seen');
      const statusClass = isOnline ? 'online' : 'offline';
      const statusTitle = isOnline ? 'Online' : `Offline (${formatLastSeen(lastSeenIso)})`;

      if (statusIndicator) {
        statusIndicator.className = `status-indicator ${statusClass}`;
        statusIndicator.title = statusTitle;
      }
      if (lastSeenElement) {
        lastSeenElement.textContent = formatLastSeen(lastSeenIso);
        lastSeenElement.style.display = isOnline ? 'none' : 'block';
      }
    }

    // Update header if this user is currently selected
    if (currentChatTarget === userId) {
        updateChatHeaderStatus(isOnline, lastSeenIso);
    }
  }

  // --- Fetch Conversation History ---
  async function fetchConversationHistory(targetUserId) {
    if (!accessToken || !currentUser) return;
    console.log(`Fetching history for user ${targetUserId}`);
    chatMessages.innerHTML = ''; // Clear previous messages
    appendSystemMessage('Loading history...'); // Show loading indicator

    try {
        const response = await fetch(`http://127.0.0.1:8000/conversations/${targetUserId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            const history = await response.json();
            console.log('Received history:', history);
            chatMessages.innerHTML = ''; // Clear 'Loading...'
            if (history.length === 0) {
                appendSystemMessage('No messages yet.');
            }
            history.forEach(msg => {
                const isMe = msg.sender_id === currentUser.id;
                const senderUsername = isMe ? currentUser.username : (allUsers[msg.sender_id]?.username || 'Unknown User');
                // Pass read_at status AND message ID to appendMessage
                appendMessage(senderUsername, msg.content, isMe, msg.timestamp, msg.read_at, msg.id, msg.recipient_id); 
            });
            // Scroll to the bottom after loading history
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            console.error('Failed to fetch conversation history:', response.status, response.statusText);
            chatMessages.innerHTML = ''; // Clear 'Loading...'
            appendSystemMessage('Failed to load message history.');
        }
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        chatMessages.innerHTML = ''; // Clear 'Loading...'
        appendSystemMessage('Error loading message history.');
    }
  }

  // --- Select User for Chat --- // Updated
  function selectUser(userId) {
    const user = allUsers[userId];
    if (!user || userId === currentChatTarget) return;

    console.log(`Selecting user ${userId}`); // Log selection

    console.log('Selected user:', user);
    currentChatTarget = user.id;

    chatHeaderName.textContent = user.username;
    updateChatHeaderStatus(user.is_online, user.last_seen);

    hideTypingIndicator();

    document.querySelectorAll('.contact-item').forEach(item => item.classList.remove('active'));
    userListElement.querySelector(`[data-user-id="${userId}"]`)?.classList.add('active');

    // Enable the chat area
    if (chatArea) {
        chatArea.classList.remove('chat-disabled');
    }

    // Clear the unread count badge for this user
    updateUnreadBadge(userId, false);

    // Send 'mark_read' event to backend
    console.log(`Sending mark_read for sender ${userId}`); // Log mark_read send
    sendWebSocketMessage('mark_read', { sender_id: userId });

    // Fetch history FIRST
    fetchConversationHistory(userId).then(() => {
        console.log(`History fetched for ${userId}, attempting icon update.`); // Log history fetch complete
        // THEN, after history is potentially loaded and displayed,
        // update any visible sent messages for this newly selected user to read.
        updateReadStatusIcons(userId); // Update icons for messages this user potentially read
    });
  }

  // --- Update Chat Header Status ---
  function updateChatHeaderStatus(isOnline, lastSeenIso) {
      const headerStatusIndicator = document.getElementById('chat-header-status-indicator');
      const headerStatusText = document.getElementById('chat-header-status');

      if (isOnline) {
          headerStatusIndicator.className = 'status-indicator online';
          headerStatusText.textContent = 'Online';
      } else {
          headerStatusIndicator.className = 'status-indicator offline';
          headerStatusText.textContent = formatLastSeen(lastSeenIso);
      }
  }

  // --- Show/Hide Typing Indicator ---
  function showTypingIndicator(username) {
      if (typingIndicator) {
          typingIndicator.querySelector('span').textContent = username;
          typingIndicator.style.display = 'block';
      }
  }

  function hideTypingIndicator() {
      if (typingIndicator) {
          typingIndicator.style.display = 'none';
      }
  }

  // --- WebSocket Setup ---
  function connectWebSocket() {
    const wsUrl = `ws://127.0.0.1:8000/ws/${accessToken}`; // Replace with your backend URL if different
    websocket = new WebSocket(wsUrl);

    websocket.onopen = (event) => {
      console.log('WebSocket connection opened', event);
      fetchCurrentUser();
      appendSystemMessage('Connected to chat.');
    };

    websocket.onmessage = async (event) => {
      console.log('[WS Received]', event.data); // Log all incoming WS messages
      try {
        const message = JSON.parse(event.data);
        const action = message.action;
        const payload = message.payload;

        if (action === 'message') {
          if (!payload) {
            console.error('Error: Received message action without payload:', message);
            return;
          }

          const msg = payload;
          const senderIsCurrentUser = currentUser && msg.sender_id === currentUser.id;
          // Always hide typing indicator for this user when a message arrives
          if (!senderIsCurrentUser && msg.sender_id === currentChatTarget) {
              hideTypingIndicator();
          }
          // Logic to display message (check if relevant to current view)
          if (msg.recipient_id === null || // Broadcast
             (currentUser && msg.recipient_id === currentUser.id && msg.sender_id === currentChatTarget) || // Direct msg from selected user
             (senderIsCurrentUser && msg.recipient_id === currentChatTarget) // My direct msg to selected user
          ) {
            appendMessage(msg.sender, msg.content, senderIsCurrentUser, msg.timestamp, msg.read_at, msg.id, msg.recipient_id);
            
            // If message is from the currently selected chat partner, mark it read immediately
            if (!senderIsCurrentUser && msg.sender_id === currentChatTarget) {
                 sendWebSocketMessage('mark_read', { sender_id: msg.sender_id });
            }
            // Scroll only for new messages in the current view
            chatMessages.scrollTop = chatMessages.scrollHeight; 
          } else {
            console.log('Received message for another chat/context:', msg);
            // Increment unread count in the sidebar if it's a direct message to me
            if (currentUser && msg.recipient_id === currentUser.id) {
                 // ---- Start: Safeguard for new contacts ----
                 if (!allUsers[msg.sender_id]) {
                    console.log(`Message received from unknown sender ${msg.sender_id}. Refreshing contacts...`);
                    // Fetch contacts to ensure the sender appears in the list
                    await fetchContacts(); 
                    // Now allUsers should contain the sender, proceed with UI update
                    if (!allUsers[msg.sender_id]) {
                        // If still not found after refresh, log an error, but maybe still update badge?
                        console.error(`Sender ${msg.sender_id} still not found after contact refresh!`);
                        // Decide how to handle this - maybe append a temporary item?
                        // For now, we'll skip the badge update if the user is truly unknown.
                    } else {
                        // Sender exists now, update the badge
                        updateUnreadBadge(msg.sender_id, true);
                    }
                 } else {
                    // Sender is known, just update the badge
                    updateUnreadBadge(msg.sender_id, true); 
                 }
                 // ---- End: Safeguard for new contacts ----
                 // TODO: Update message preview in sidebar
            }
          }
        } else if (action === 'status_update') {
          if (!payload) {
            console.error('Error: Received status_update action without payload:', message);
            return;
          }
          updateUserStatus(payload.user_id, payload.status_value, payload.last_seen);
        } else if (action === 'typing_update') {
          if (!payload) {
            console.error('Error: Received typing_update action without payload:', message);
            return;
          }
          // Only show typing if it's from the currently selected user
          if (payload.user_id === currentChatTarget) {
              if (payload.is_typing) {
                  showTypingIndicator(payload.username);
              } else {
                  hideTypingIndicator();
              }
          }
        } else if (action === 'messages_read') { 
            if (!payload) { console.error('[WS Error]', 'messages_read missing payload', message); return; }
            
            console.log('[WS Action] messages_read:', payload);
            
            // Check if the reader is the currently active chat target
            // payload.sender_id is the *original sender* of the messages that were read
            // payload.reader_id is the user *who just read* the messages
            if (currentUser && payload.reader_id === currentChatTarget) { 
                console.log(`Active user ${currentChatTarget} read messages from ${payload.sender_id}. Updating icons.`);
                updateReadStatusIcons(payload.reader_id); // Update icons based on who read them
            } else {
                console.log(`Read receipt received, but reader (${payload.reader_id}) is not current target (${currentChatTarget}). Ignoring icon update.`);
            }
        } else if (action === 'connect' || action === 'disconnect') {
            // These might be redundant if status_update handles online/offline
            console.log(`Received legacy connect/disconnect for: ${payload.user || payload.user_id}`);
            // Consider fetching all users again if needed, or relying on status_update
            // fetchAllUsers(); 
        } else if (action === 'ping') {
           // ... (keep ping logic if used) ...
        } else {
             console.warn('Unknown WebSocket action received:', action);
        }

      } catch (error) {
        console.error('Failed to parse WebSocket message or handle action:', error);
      }
    };

    websocket.onerror = (event) => {
      console.error('WebSocket error:', event);
       appendSystemMessage('Connection error.');
    };

    websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
      websocket = null;
      appendSystemMessage('Disconnected from chat. Attempting to reconnect...');
      // Implement reconnection logic if desired
      // setTimeout(connectWebSocket, 5000); // Example: try reconnecting after 5 seconds
      // For now, just redirect to login
      localStorage.removeItem('accessToken');
      // Avoid redirect loop if already on index.html
      if (window.location.pathname !== '/index.html') {
           window.location.href = 'index.html';
      }
    };
  }

  // --- Event Listeners ---
  sendButton.addEventListener('click', sendMessage);

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
      // Also send stopped_typing immediately after sending message
      clearTimeout(typingTimeout);
      sendTypingStatus(false);
      typingTimeout = null;
    }
  });

  logoutButton.addEventListener('click', () => {
    console.log('Logging out...');
    localStorage.removeItem('accessToken');
    if (websocket) {
      websocket.close();
    }
    // Redirect is handled by websocket.onclose now
    // window.location.href = 'index.html';
  });

  // Typing Indicator Logic
  messageInput.addEventListener('input', () => {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) return;

      if (!typingTimeout) {
          sendTypingStatus(true); // Send typing start
      }
      clearTimeout(typingTimeout);

      typingTimeout = setTimeout(() => {
          sendTypingStatus(false); // Send typing stop
          typingTimeout = null;
      }, 1500); // 1.5 seconds debounce
  });

  function sendTypingStatus(isTyping) {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
      const action = isTyping ? 'typing' : 'stopped_typing';
      console.log(`Sending action: ${action}`);
      websocket.send(JSON.stringify({ action: action, payload: {} }));
  }

  // --- Functions ---
  function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText !== '' && websocket && websocket.readyState === WebSocket.OPEN) {
      const messagePayload = {
        content: messageText,
        recipient_id: currentChatTarget
      };
      console.log('Sending message payload:', messagePayload);
      // Send message wrapped in standard action/payload structure
      websocket.send(JSON.stringify({ action: 'message', payload: messagePayload }));
      messageInput.value = '';

      // Clear and stop typing indicator after sending
      clearTimeout(typingTimeout);
      sendTypingStatus(false);
      typingTimeout = null;
      hideTypingIndicator(); // Immediately hide own typing indicator

    } else if (!websocket || websocket.readyState !== WebSocket.OPEN) {
       console.warn('WebSocket is not connected. Cannot send message.');
       appendSystemMessage('Not connected. Please wait or try logging in again.');
    }
  }

  // Modified appendMessage to use createElement and include recipientId dataset
  function appendMessage(sender, text, isMe, isoTimestamp = null, readAt = null, messageId = null, recipientId = null) {
    const messageGroup = document.createElement('div');
    messageGroup.classList.add('message-group');
    messageGroup.classList.add(isMe ? 'sender' : 'receiver');
    if (messageId) {
        messageGroup.dataset.messageId = messageId;
    }
    if (isMe && recipientId) {
        messageGroup.dataset.recipientId = recipientId;
    }

    // Avatar
    const avatarImg = document.createElement('img');
    avatarImg.src = "assets/images/default-avatar.png"; 
    avatarImg.alt = "Avatar";
    avatarImg.classList.add('avatar');

    // Message Content Container
    const messageContentDiv = document.createElement('div');
    messageContentDiv.classList.add('message-content');

    // Sender Name
    const senderNameSpan = document.createElement('span');
    senderNameSpan.classList.add('sender-name');
    senderNameSpan.textContent = isMe ? 'Me' : sender;

    // Message Bubble
    const messageBubbleDiv = document.createElement('div');
    messageBubbleDiv.classList.add('message-bubble');
    messageBubbleDiv.textContent = text;

    // Message Meta Container (Timestamp + Read Status)
    const messageMetaDiv = document.createElement('div');
    messageMetaDiv.classList.add('message-meta');

    // Timestamp
    const timestamp = isoTimestamp ? new Date(isoTimestamp) : new Date();
    const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('timestamp');
    timestampSpan.textContent = formattedTime;

    // Read Status Icon Container
    const readStatusContainer = document.createElement('span');
    readStatusContainer.classList.add('read-status-icon-container');

    if (isMe) {
        const readStatusIcon = document.createElement('img');
        const iconSrc = readAt ? 'assets/svg/read.svg' : 'assets/svg/unread.svg';
        readStatusIcon.src = iconSrc;
        readStatusIcon.alt = readAt ? 'Read' : 'Sent';
        readStatusIcon.classList.add('read-status-icon');
        readStatusContainer.appendChild(readStatusIcon); 
    }

    // Assemble Meta
    messageMetaDiv.appendChild(timestampSpan);
    messageMetaDiv.appendChild(readStatusContainer);

    // Assemble Content
    messageContentDiv.appendChild(senderNameSpan);
    messageContentDiv.appendChild(messageBubbleDiv);
    messageContentDiv.appendChild(messageMetaDiv);

    // Assemble Group
    messageGroup.appendChild(avatarImg);
    messageGroup.appendChild(messageContentDiv);

    chatMessages.appendChild(messageGroup);
  }

  function appendSystemMessage(text) {
    const messageElem = document.createElement('div');
    messageElem.classList.add('chat-message', 'system'); // Add a 'system' class for styling
    messageElem.textContent = text;
    chatMessages.appendChild(messageElem);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // --- Update Read Status Icons --- // Updated logging
  function updateReadStatusIcons(userIdWhoRead) {
    console.log(`Running updateReadStatusIcons for reader: ${userIdWhoRead}`);
    const sentMessages = chatMessages.querySelectorAll(`.message-group.sender`); 
    console.log(`Found ${sentMessages.length} sent message elements.`);
    
    sentMessages.forEach((msgElement, index) => {
        const recipientId = parseInt(msgElement.dataset.recipientId, 10);
        const messageId = msgElement.dataset.messageId;
        console.log(`Msg ${index}: recipientId=${recipientId}, messageId=${messageId}`);

        if (recipientId === userIdWhoRead) { 
            const iconContainer = msgElement.querySelector('.read-status-icon-container');
            if (iconContainer) {
                const existingIcon = iconContainer.querySelector('img.read-status-icon');
                if (existingIcon) {
                    if (existingIcon.src.includes('unread.svg')) { 
                        console.log(`Updating icon for message ${messageId} to ${recipientId}`);
                        existingIcon.src = 'assets/svg/read.svg';
                        existingIcon.alt = 'Read';
                        iconContainer.classList.add('icon-updating');
                        setTimeout(() => {
                            iconContainer.classList.remove('icon-updating');
                        }, 500); 
                    } else {
                        console.log(`Icon for message ${messageId} to ${recipientId} ALREADY marked as read.`);
                    }
                } else {
                   console.log(`Icon image NOT FOUND inside container for message ${messageId} to ${recipientId}.`);
                }
            } else {
                console.log(`Icon container not found for message ${messageId} to ${recipientId}`);
            }
        } else {
             console.log(`Skipping msg ${index} (id: ${messageId}), recipient (${recipientId}) doesn't match reader (${userIdWhoRead})`);
        }
    });
  }

  // Add Contact Popup Listeners
  usersButton?.addEventListener('click', () => toggleAddContactPopup(true));
  closeAddContactPopup?.addEventListener('click', () => toggleAddContactPopup(false));
  addContactButton?.addEventListener('click', addContact);
  // Optional: Close popup if clicked outside? (More complex)

  // --- New Chat Modal Listeners ---
  newChatButton?.addEventListener('click', () => toggleNewChatModal(true));
  closeNewChatModalButton?.addEventListener('click', () => toggleNewChatModal(false));

  // --- Initial connection ---
  connectWebSocket();

}); 