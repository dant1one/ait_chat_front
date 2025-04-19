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
  // --- Group Elements ---
  const groupListElement = document.getElementById('group-list');
  const createGroupButton = document.getElementById('create-group-button');
  const createGroupPopup = document.getElementById('create-group-popup');
  const closeCreateGroupPopup = document.getElementById('close-create-group-popup');
  const createGroupNameInput = document.getElementById('create-group-name');
  const createGroupDescInput = document.getElementById('create-group-description');
  const createGroupSubmitButton = document.getElementById('create-group-submit-button');
  const createGroupStatus = document.getElementById('create-group-status');
  const manageGroupMembersButton = document.getElementById('manage-group-members-button');
  const manageMembersModal = document.getElementById('manage-members-modal');
  const closeManageMembersModal = document.getElementById('close-manage-members-modal');
  const groupMemberList = document.getElementById('group-member-list');
  const addMemberUsernameInput = document.getElementById('add-member-username');
  const addMemberButton = document.getElementById('add-member-button');
  const addMemberStatus = document.getElementById('add-member-status');
  // --- End Group Elements ---

  let websocket = null;
  let currentUser = null; // Store current user info
  let currentChatTarget = null; // Store ID of the user OR group being chatted with
  let currentChatIsGroup = false; // Flag to indicate if target is a group
  let allUsers = {}; // Store fetched user data keyed by ID, including status
  let allGroups = {}; // Groups cache
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
        selectChat(user.id, false);
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
        await fetchGroups();   // Then fetch groups
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

        listItem.addEventListener('click', () => selectChat(user.id, false));
        userListElement.appendChild(listItem);
    });
  }

  // --- Update Unread Count Badge --- (New Helper)
  function updateUnreadBadge(targetId, isGroup, increment = true) {
    const listElement = isGroup ? groupListElement : userListElement;
    const dataAttr = isGroup ? 'data-group-id' : 'data-user-id';
    const listItem = listElement.querySelector(`[${dataAttr}="${targetId}"]`);
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
    const cache = isGroup ? allGroups : allUsers;
    if(cache[targetId]) {
        cache[targetId].unread_count = currentCount;
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
        updateChatHeaderStatus(isOnline, lastSeenIso, false);
    }
  }

  // --- Fetch Conversation History ---
  async function fetchConversationHistory(targetId, isGroup) {
    if (!accessToken || !currentUser) return;
    console.log(`Fetching history for ${isGroup ? 'group' : 'user'} ${targetId}`);
    chatMessages.innerHTML = ''; // Clear previous messages
    appendSystemMessage('Loading history...');

    const endpoint = isGroup
        ? `http://127.0.0.1:8000/groups/${targetId}` // Gets details including messages
        : `http://127.0.0.1:8000/conversations/${targetId}`;

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.ok) {
            const result = await response.json();
            const history = isGroup ? result.messages : result; // Extract messages if group details
            console.log('Received history:', history);
            chatMessages.innerHTML = ''; // Clear 'Loading...'
            if (!history || history.length === 0) {
                appendSystemMessage('No messages yet.');
            }
            history.forEach(msg => {
                const senderIsCurrentUser = msg.sender_id === currentUser.id;
                // For group messages, sender name needs lookup if not current user
                let senderUsername = 'Unknown User';
                if (senderIsCurrentUser) {
                    senderUsername = currentUser.username;
                } else if (isGroup) {
                    // Need group member list or sender info attached to message by backend
                    // Assuming backend adds sender info {id, username} to group message payload
                    senderUsername = msg.sender ? msg.sender.username : (allUsers[msg.sender_id]?.username || `User ${msg.sender_id}`);
                } else {
                    senderUsername = allUsers[msg.sender_id]?.username || `User ${msg.sender_id}`;
                }

                appendMessage(senderUsername, msg.content, senderIsCurrentUser, msg.timestamp, msg.read_at, msg.id, msg.recipient_id, isGroup, msg.group_id);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            console.error('Failed to fetch history:', response.status);
            chatMessages.innerHTML = '';
            appendSystemMessage('Failed to load message history.');
        }
    } catch (error) {
        console.error('Error fetching history:', error);
        chatMessages.innerHTML = '';
        appendSystemMessage('Error loading message history.');
    }
  }

  // --- Select Chat (User or Group) - Updated Header Info ---
  async function selectChat(targetId, isGroup) { // Made async
    const cache = isGroup ? allGroups : allUsers;
    const target = cache[targetId];
    if (!target || (targetId === currentChatTarget && isGroup === currentChatIsGroup)) return;

    console.log(`Selecting ${isGroup ? 'group' : 'user'} ${targetId}`);
    currentChatTarget = targetId;
    currentChatIsGroup = isGroup;

    // Update Header
    if (isGroup) {
        chatHeaderName.textContent = target.group_name;
        // Fetch details to get member count (async)
        const details = await fetchGroupDetails(targetId);
        const memberCount = details?.members?.length ?? 0;
        chatHeaderStatus.textContent = target.description || `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
        updateChatHeaderStatus(false, null, true); // Special state for group header
        manageGroupMembersButton.style.display = 'inline-block'; // Show manage button
    } else {
        chatHeaderName.textContent = target.username;
        updateChatHeaderStatus(target.is_online, target.last_seen, false);
        manageGroupMembersButton.style.display = 'none'; // Hide manage button
    }

    hideTypingIndicator();

    // Update active item in sidebar
    document.querySelectorAll('.contact-item, .group-item').forEach(item => item.classList.remove('active'));
    const listElement = isGroup ? groupListElement : userListElement;
    const dataAttr = isGroup ? 'data-group-id' : 'data-user-id';
    listElement.querySelector(`[${dataAttr}="${targetId}"]`)?.classList.add('active');

    // Enable chat area
    if (chatArea) chatArea.classList.remove('chat-disabled');

    // Clear unread count
    updateUnreadBadge(targetId, isGroup, false);

    // Send mark_read ONLY for direct messages
    if (!isGroup) {
        console.log(`Sending mark_read for sender ${targetId}`);
        sendWebSocketMessage('mark_read', { sender_id: targetId });
    }

    // Fetch history (awaiting fetchConversationHistory to be async if needed)
    await fetchConversationHistory(targetId, isGroup);
    if (!isGroup) {
        // Update read icons only for direct messages after history loads
         updateReadStatusIcons(targetId);
    }
  }

  // --- Update Chat Header Status (Modified for Groups) ---
  function updateChatHeaderStatus(isOnline, lastSeenIso, isGroupView = false) {
      const headerStatusIndicator = document.getElementById('chat-header-status-indicator');
      const headerStatusText = document.getElementById('chat-header-status');

      if (isGroupView) {
          headerStatusIndicator.className = 'status-indicator group'; // Add a specific class for group styling?
          // Text is set in selectChat
      } else if (isOnline) {
          headerStatusIndicator.className = 'status-indicator online';
          headerStatusText.textContent = 'Online';
      } else {
          headerStatusIndicator.className = 'status-indicator offline';
          headerStatusText.textContent = formatLastSeen(lastSeenIso);
      }
  }

  // --- Show/Hide Typing Indicator (Updated for Groups) ---
  let groupTypingUsers = {}; // { groupId: { userId: username, timeoutId }, ... }

  function updateGroupTypingIndicator() {
      if (!currentChatIsGroup || !typingIndicator) return;

      const typingUsersInCurrentGroup = groupTypingUsers[currentChatTarget] || {};
      const userNames = Object.values(typingUsersInCurrentGroup).map(u => u.username);

      if (userNames.length === 0) {
          hideTypingIndicator();
      } else {
          let text = '';
          if (userNames.length === 1) {
              text = `${userNames[0]} is typing...`;
          } else if (userNames.length === 2) {
              text = `${userNames[0]} and ${userNames[1]} are typing...`;
          } else {
              text = `${userNames[0]}, ${userNames[1]} and others are typing...`;
          }
          typingIndicator.querySelector('span').textContent = text; // Target the span correctly if needed
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
      console.log('[WS Received]', event.data);
      try {
        const message = JSON.parse(event.data);
        const action = message.action;
        const payload = message.payload;

        if (action === 'message') {
          // --- Direct Message Handling --- (Existing)
          const msg = payload;
          const senderIsCurrentUser = currentUser && msg.sender_id === currentUser.id;

          if (currentUser && msg.recipient_id === currentUser.id) { // Direct message to me
             if(msg.sender_id === currentChatTarget && !currentChatIsGroup) { // Current DM chat is active
                 appendMessage(msg.sender, msg.content, senderIsCurrentUser, msg.timestamp, msg.read_at, msg.id, msg.recipient_id, false);
                 sendWebSocketMessage('mark_read', { sender_id: msg.sender_id });
                 chatMessages.scrollTop = chatMessages.scrollHeight;
             } else { // DM for another chat
                  console.log('Received DM for inactive chat:', msg);
                  // Safeguard for new contacts (existing)
                  if (!allUsers[msg.sender_id]) {
                     console.log(`Message received from unknown sender ${msg.sender_id}. Refreshing contacts...`);
                     await fetchContacts();
                     if (allUsers[msg.sender_id]) {
                         updateUnreadBadge(msg.sender_id, false, true); // Update user badge
                     } else { console.error(`Sender ${msg.sender_id} still not found!`); }
                  } else {
                     updateUnreadBadge(msg.sender_id, false, true); // Update user badge
                  }
             }
          } else if (senderIsCurrentUser && msg.recipient_id === currentChatTarget && !currentChatIsGroup) { // My own DM to current target
             appendMessage(msg.sender, msg.content, senderIsCurrentUser, msg.timestamp, msg.read_at, msg.id, msg.recipient_id, false);
             chatMessages.scrollTop = chatMessages.scrollHeight;
          } else if (msg.recipient_id === null) { // Broadcast message
             // Handle broadcast if needed
          }

        } else if (action === 'group_message') {
           // --- Group Message Handling --- (NEW)
           const msg = payload;
           const senderIsCurrentUser = currentUser && msg.sender_id === currentUser.id;
           console.log('Received group message:', msg);

           if (msg.group_id === currentChatTarget && currentChatIsGroup) { // Group chat is active
                // Assume payload has sender info {id, username}
                const senderName = senderIsCurrentUser ? 'Me' : (msg.sender?.username || `User ${msg.sender_id}`);
                appendMessage(senderName, msg.content, senderIsCurrentUser, msg.timestamp, null, msg.id, null, true, msg.group_id);
                // TODO: Add group read receipts? For now, just scroll
                chatMessages.scrollTop = chatMessages.scrollHeight;
           } else { // Group message for inactive chat
                console.log('Received message for inactive group:', msg.group_id);
                updateUnreadBadge(msg.group_id, true, true); // Update group badge
                // TODO: Update group preview in sidebar?
           }

           // Hide typing indicator for the sender if they were typing in this group
           if (payload.sender_id && groupTypingUsers[payload.group_id]?.[payload.sender_id]) {
               clearTimeout(groupTypingUsers[payload.group_id][payload.sender_id].timeoutId);
               delete groupTypingUsers[payload.group_id][payload.sender_id];
               if (payload.group_id === currentChatTarget) updateGroupTypingIndicator();
           }

        } else if (action === 'status_update') {
            // ... existing status update ...
        } else if (action === 'typing_update') {
            // --- Direct Message Typing --- (Existing)
            if (!currentChatIsGroup && payload.user_id === currentChatTarget) {
              if (payload.is_typing) {
                  showTypingIndicator(payload.username); // Simple DM typing
              } else {
                  hideTypingIndicator();
              }
            }
        } else if (action === 'group_typing_update'){
            // --- Group Typing Update --- (NEW)
            const { group_id, user_id, username, is_typing } = payload;
            if (!groupTypingUsers[group_id]) groupTypingUsers[group_id] = {};

            const existingUserTyping = groupTypingUsers[group_id][user_id];
            if (existingUserTyping) {
                clearTimeout(existingUserTyping.timeoutId); // Clear previous timeout
            }

            if (is_typing) {
                // Add/update user typing status with a timeout
                groupTypingUsers[group_id][user_id] = {
                    username: username,
                    timeoutId: setTimeout(() => {
                        delete groupTypingUsers[group_id][user_id];
                        if (group_id === currentChatTarget) updateGroupTypingIndicator();
                    }, 3000) // Clear after 3 seconds of inactivity
                };
            } else {
                // Remove user if they stopped typing
                delete groupTypingUsers[group_id][user_id];
            }
            // Update indicator only if the affected group is the current chat
            if (group_id === currentChatTarget) updateGroupTypingIndicator();

        } else if (action === 'messages_read') {
            // ... existing read receipt (only works for DM) ...
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
      const actionStop = currentChatIsGroup ? 'group_stopped_typing' : 'stopped_typing';
      const payload = currentChatIsGroup ? { group_id: currentChatTarget } : {};
      if (typingTimeout) { // Only send stop if we were typing
          console.log(`Sending action: ${actionStop}`);
          websocket.send(JSON.stringify({ action: actionStop, payload: payload }));
      }
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

  // Typing Indicator Logic (Updated)
  messageInput.addEventListener('input', () => {
      if (!websocket || websocket.readyState !== WebSocket.OPEN || !currentChatTarget) return;

      // Determine action based on chat type
      const actionStart = currentChatIsGroup ? 'group_typing' : 'typing';
      const actionStop = currentChatIsGroup ? 'group_stopped_typing' : 'stopped_typing';
      const payload = currentChatIsGroup ? { group_id: currentChatTarget } : {};

      if (!typingTimeout) {
          console.log(`Sending action: ${actionStart}`);
          websocket.send(JSON.stringify({ action: actionStart, payload: payload }));
      }
      clearTimeout(typingTimeout);

      typingTimeout = setTimeout(() => {
          console.log(`Sending action: ${actionStop}`);
          websocket.send(JSON.stringify({ action: actionStop, payload: payload }));
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
    if (messageText === '' || !websocket || websocket.readyState !== WebSocket.OPEN) return;

    let action;
    let payload;

    if (currentChatIsGroup) {
        action = 'group_message';
        payload = {
            group_id: currentChatTarget,
            content: messageText
        };
    } else if (currentChatTarget) { // Direct message
        action = 'message';
        payload = {
        content: messageText,
            recipient_id: currentChatTarget
        };
    } else {
        // Handle case where no chat is selected (e.g., broadcast or disable send)
        console.warn('Send attempt with no active chat target.');
        return; // Or send broadcast: action = 'message', payload = { content: messageText, recipient_id: null };
    }

    console.log(`Sending WS Action: ${action}`, payload);
    websocket.send(JSON.stringify({ action: action, payload: payload }));
    messageInput.value = '';

    // Clear and stop typing indicator after sending
    clearTimeout(typingTimeout);
    // sendTypingStatus(false); // Needs group support
    typingTimeout = null;
    hideTypingIndicator();
  }

  // Modified appendMessage to handle groups
  function appendMessage(sender, text, isMe, isoTimestamp = null, readAt = null, messageId = null, recipientId = null, isGroup = false, groupId = null) {
    const messageGroup = document.createElement('div');
    messageGroup.classList.add('message-group');
    messageGroup.classList.add(isMe ? 'sender' : 'receiver');
    if (messageId) {
        messageGroup.dataset.messageId = messageId; // Still useful potentially
    }

    // Avatar
    const avatarImg = document.createElement('img');
    // Use different avatar logic for groups?
    avatarImg.src = isGroup && !isMe ? "assets/svg/group-avatar.svg" : "assets/images/default-avatar.png";
    avatarImg.alt = "Avatar";
    avatarImg.classList.add('avatar');

    // Message Content Container
    const messageContentDiv = document.createElement('div');
    messageContentDiv.classList.add('message-content');

    // Sender Name (Always show for group messages from others)
    const senderNameSpan = document.createElement('span');
    senderNameSpan.classList.add('sender-name');
    senderNameSpan.textContent = (isGroup && !isMe) ? sender : (isMe ? 'Me' : sender);
    // Only show sender name if it's a group message OR if needed for direct message styling
    if (!isGroup && !isMe) { // Hide sender name for receiver in DMs if design prefers
        // senderNameSpan.style.display = 'none';
    }

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

    // Read Status Icon Container (Only for Sent DMs)
    const readStatusContainer = document.createElement('span');
    readStatusContainer.classList.add('read-status-icon-container');
    if (isMe && !isGroup) {
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
    // Only add sender name span if it should be visible
    if (isGroup || isMe) { // Show sender name for groups or if it's me
        messageContentDiv.appendChild(senderNameSpan);
    }
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

  // --- Update Read Status Icons (No change needed, only for DMs) ---
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

  // --- Group Modal Listeners ---
  createGroupButton?.addEventListener('click', () => toggleCreateGroupPopup(true));
  closeCreateGroupPopup?.addEventListener('click', () => toggleCreateGroupPopup(false));
  createGroupSubmitButton?.addEventListener('click', createGroup);

  manageGroupMembersButton?.addEventListener('click', () => toggleManageMembersPopup(true));
  closeManageMembersModal?.addEventListener('click', () => toggleManageMembersPopup(false));
  addMemberButton?.addEventListener('click', () => {
      const username = addMemberUsernameInput.value.trim();
      if(username && currentChatIsGroup && currentChatTarget) {
          addUserToGroup(currentChatTarget, username);
      } else if (!username) {
          addMemberStatus.textContent = 'Enter a username.';
          addMemberStatus.className = 'add-member-status error';
      } // Else handled within addUserToGroup
  });

  // --- Functions ---
  async function fetchGroups() {
    if (!accessToken) return;
    allGroups = {};
    if (groupListElement) groupListElement.innerHTML = ''; // Clear visually
    console.log('Fetching groups...');

    try {
        // Use the new endpoint for fetching user's groups
        const response = await fetch('http://127.0.0.1:8000/users/me/groups', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (response.ok) {
            const groups = await response.json();
            console.log('Fetched groups:', groups);
            allGroups = groups.reduce((acc, group) => {
                group.unread_count = 0; // Initialize unread count for groups
                acc[group.id] = group;
                return acc;
            }, {});
            populateGroupList(); // Populate sidebar
        } else {
            console.error('Failed to fetch groups:', response.status);
            if(groupListElement) groupListElement.innerHTML = '<li style="padding: 10px; color: red;">Failed to load groups</li>';
        }
    } catch (error) {
        console.error('Error fetching groups:', error);
        if(groupListElement) groupListElement.innerHTML = '<li style="padding: 10px; color: red;">Error loading groups</li>';
    }
  }

  async function createGroup() {
    const name = createGroupNameInput.value.trim();
    const description = createGroupDescInput.value.trim();

    if (!name) {
        createGroupStatus.textContent = 'Group name is required.';
        createGroupStatus.className = 'create-group-status error';
        return;
    }

    createGroupStatus.textContent = 'Creating...';
    createGroupStatus.className = 'create-group-status';
    createGroupSubmitButton.disabled = true;

    try {
        const response = await fetch('http://127.0.0.1:8000/group/append', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ group_name: name, description: description })
        });
        const result = await response.json();

        if (response.ok) {
            createGroupStatus.textContent = `Group '${result.group_name}' created!`;
            createGroupStatus.className = 'create-group-status success';
            await fetchGroups(); // Refresh group list
            setTimeout(() => toggleCreateGroupPopup(false), 1500);
        } else {
            createGroupStatus.textContent = `Error: ${result.detail || 'Failed to create group'}`;
            createGroupStatus.className = 'create-group-status error';
        }
    } catch (error) {
        console.error('Error creating group:', error);
        createGroupStatus.textContent = 'Network error. Please try again.';
        createGroupStatus.className = 'create-group-status error';
    } finally {
        createGroupSubmitButton.disabled = false;
    }
  }

  // Updated Add User to Group (Uses Search API)
  async function addUserToGroup(groupId, username) {
      addMemberStatus.textContent = 'Searching user...';
      addMemberStatus.className = 'add-member-status';
      addMemberButton.disabled = true;
      addMemberUsernameInput.disabled = true; // Disable input during process

      let userId = null;
      try {
          // 1. Search for the user by username
          const searchResponse = await fetch(`http://127.0.0.1:8000/users/search?username=${encodeURIComponent(username)}`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (!searchResponse.ok) {
              throw new Error(`Search failed: ${searchResponse.status}`);
          }
          const searchResults = await searchResponse.json();

          if (searchResults.length === 0) {
              addMemberStatus.textContent = `Error: User '${username}' not found.`;
              addMemberStatus.className = 'add-member-status error';
              return; // Exit function
          } else if (searchResults.length > 1) {
              // TODO: Handle multiple matches - maybe show a list to select from?
              addMemberStatus.textContent = `Error: Multiple users found for '${username}'. Be more specific.`;
              addMemberStatus.className = 'add-member-status error';
              return; // Exit function
          } else {
              userId = searchResults[0].id; // Found unique user
              addMemberStatus.textContent = `Adding user '${searchResults[0].username}'...`;
          }

      } catch (error) {
          console.error('Error searching user:', error);
          addMemberStatus.textContent = 'Error finding user.';
          addMemberStatus.className = 'add-member-status error';
          return; // Exit function
      } finally {
           // Re-enable only if search failed before finding ID
           if (userId === null) {
                addMemberButton.disabled = false;
                addMemberUsernameInput.disabled = false;
           }
      }

      // 2. Add the user by ID if found
      if (userId === null) return; // Should not happen if logic above is correct

      try {
          const addResponse = await fetch(`http://127.0.0.1:8000/group/add_user/${groupId}`, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ user_id: userId })
          });
          const addResult = await addResponse.json();
          if (addResponse.ok) {
              addMemberStatus.textContent = `User '${username}' added successfully.`;
              addMemberStatus.className = 'add-member-status success';
              addMemberUsernameInput.value = ''; // Clear input
              populateManageMembersModal(groupId); // Refresh member list in modal
          } else {
              addMemberStatus.textContent = `Error: ${addResult.detail || 'Failed to add user'}`;
              addMemberStatus.className = 'add-member-status error';
          }
      } catch (error) {
          console.error('Error adding user to group:', error);
          addMemberStatus.textContent = 'Network error while adding.';
          addMemberStatus.className = 'add-member-status error';
      } finally {
          addMemberButton.disabled = false;
          addMemberUsernameInput.disabled = false;
      }
  }

  async function removeUserFromGroup(groupId, userId, buttonElement) {
      // Disable button temporarily
      if (buttonElement) buttonElement.disabled = true;

      if (!confirm(`Are you sure you want to remove this user from the group?`)) {
          if (buttonElement) buttonElement.disabled = false;
          return;
      }

      console.log(`Attempting to remove user ${userId} from group ${groupId}`);
      try {
          const response = await fetch(`http://127.0.0.1:8000/group/delete_user/${groupId}/${userId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (response.ok) {
              console.log(`User ${userId} removed successfully.`);
              populateManageMembersModal(groupId); // Refresh member list
          } else {
              const result = await response.json();
              console.error('Failed to remove user:', result.detail);
              alert(`Error removing user: ${result.detail || 'Unknown error'}`);
              if (buttonElement) buttonElement.disabled = false;
          }
      } catch (error) {
          console.error('Error removing user from group:', error);
          alert('Network error while removing user.');
          if (buttonElement) buttonElement.disabled = false;
      }
  }

  async function fetchGroupDetails(groupId) {
      console.log(`Fetching details for group ${groupId}`);
      try {
          const response = await fetch(`http://127.0.0.1:8000/groups/${groupId}`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (response.ok) {
              const details = await response.json();
              console.log('Group details:', details);
              return details; // Return members and messages
          } else {
              console.error('Failed to fetch group details:', response.status);
              return null;
          }
      } catch (error) {
          console.error('Error fetching group details:', error);
          return null;
      }
  }

  // --- Populate Manage Members Modal (Add remove button listener arg) ---
  async function populateManageMembersModal(groupId) {
    if (!manageMembersModal || !groupMemberList) return;
    groupMemberList.innerHTML = '<li>Loading members...</li>';

    const details = await fetchGroupDetails(groupId);
    groupMemberList.innerHTML = ''; // Clear loading/previous

    if (details && details.members) {
        if(details.members.length === 0) {
             groupMemberList.innerHTML = '<li>No members found.</li>';
        }
        details.members.forEach(member => {
            const li = document.createElement('li');
            li.dataset.userId = member.id;
            const nameSpan = document.createElement('span');
            nameSpan.textContent = member.username + (member.id === currentUser.id ? ' (You)' : '');
            li.appendChild(nameSpan);

            // Add remove button (don't allow removing self?)
            if (member.id !== currentUser.id) {
                const removeButton = document.createElement('button');
                removeButton.textContent = '×'; // Or use an icon
                removeButton.classList.add('remove-member-button');
                removeButton.title = `Remove ${member.username}`;
                removeButton.onclick = () => removeUserFromGroup(groupId, member.id, removeButton); // Pass button
                li.appendChild(removeButton);
            }
            groupMemberList.appendChild(li);
        });
    } else {
        groupMemberList.innerHTML = '<li>Error loading members.</li>';
    }
  }

  // --- Sidebar Population (Split into Users and Groups) ---
  function populateSidebarLists() {
      populateUserList();
      populateGroupList();
  }

  function populateGroupList() {
    if (!groupListElement) return;
    groupListElement.innerHTML = ''; // Clear existing list

    Object.values(allGroups).forEach(group => {
        const listItem = document.createElement('li');
        listItem.classList.add('group-item'); // Use group-item class
        listItem.dataset.groupId = group.id;

        const unreadCount = group.unread_count || 0; // Use group unread count

        // Simplified display for groups
        listItem.innerHTML = `
            <div class="avatar-container">
                <img src="assets/svg/group-avatar.svg" alt="Group Avatar" class="avatar"> <!-- Default Group Avatar -->
            </div>
            <div class="contact-info">
                <span class="contact-name">${group.group_name}</span>
                <span class="contact-preview"></span> <!-- TODO: Group Preview -->
            </div>
            <div class="contact-meta">
                <span class="timestamp"></span> <!-- TODO: Timestamp -->
                <span class="unread-count" style="display: ${unreadCount > 0 ? 'inline-block' : 'none'};">${unreadCount}</span>
            </div>
        `;

        listItem.addEventListener('click', () => selectChat(group.id, true)); // Pass isGroup=true
        groupListElement.appendChild(listItem);
    });
  }

  // --- Initial connection ---
  connectWebSocket();

}); 
