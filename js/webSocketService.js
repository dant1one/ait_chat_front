import { getToken, logout } from './authService.js';

let websocket = null;
const WS_URL_BASE = 'ws://127.0.0.1:8000/ws'; // Base URL only now
let actionHandlers = {}; // { action: handlerFunction(payload) }

// --- Reconnection Logic Variables ---
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5; // Example: Limit to 5 retries
const RECONNECT_DELAY_MS = 5000; // Example: 5 seconds

let onOpenCallback = null;
let onCloseCallback = null;
let onErrorCallback = null;


function getWebSocketUrl() {
    const token = getToken();
    if (!token) return null;
    // Send token as query parameter
    return `${WS_URL_BASE}?token=${encodeURIComponent(token)}`;
}

export function registerActionHandler(action, handler) {
    actionHandlers[action] = handler;
}

export function setOnOpen(callback) {
    onOpenCallback = callback;
}
export function setOnClose(callback) {
    onCloseCallback = (event) => {
        // Handle common close codes
        if (event.code === 1000) {
            // Normal closure
            console.log("WebSocket closed normally");
        } else if (event.code === 1001) {
            // Going away - client is leaving
            console.log("WebSocket closed: client navigating away");
        } else if (event.code === 1006) {
            // Abnormal closure - server might be down
            console.log("WebSocket closed abnormally");
            // Show message and logout
            alert("Your session has expired. Please login again.");
            logout(); // Redirect to login
            return; // Prevent callback execution
        } else if (event.code === 1008) {
            // Policy violation - usually invalid token
            console.log("WebSocket closed: authentication failure");
            alert("Authentication failed. Please login again.");
            logout(); // Redirect to login
            return; // Prevent callback execution
        } else if (event.code === 1011) {
            // Server error
            console.log("WebSocket closed: server error");
            alert("Server error occurred. Please try again later.");
        }

        // Call the custom callback if provided
        if (callback) callback(event);
    };
}
export function setOnError(callback) {
    onErrorCallback = callback;
}

export function connect() {
    if (websocket && websocket.readyState !== WebSocket.CLOSED) {
        console.log("WebSocket already connected or connecting");
        return;
    }

    const token = getToken();
    if (!token) {
        console.error("Token not found, cannot establish WebSocket connection");
        return;
    }

    const wsUrl = getWebSocketUrl();
    websocket = new WebSocket(wsUrl);

    websocket.onopen = (event) => {
        console.log("WebSocket connection established");
        if (onOpenCallback) onOpenCallback(event);
    };

    websocket.onmessage = async (event) => {
        console.log('[WS Received]', event.data);
        try {
            const message = JSON.parse(event.data);
            const action = message.action;
            const payload = message.payload;

            if (actionHandlers[action]) {
                actionHandlers[action](payload); // Call registered handler
            } else if (action === 'ping') {
                 // Auto-respond to pings if backend expects it
                 // send('pong', { timestamp: payload.timestamp });
            } else {
                console.warn('Unknown WebSocket action received:', action);
            }

        } catch (error) {
            console.error('Failed to parse WebSocket message or handle action:', error);
             if (onErrorCallback) onErrorCallback("Message parse/handle error");
        }
    };

    websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (onErrorCallback) onErrorCallback("Connection error");
    };

    websocket.onclose = (event) => {
        console.log(`WebSocket closed with code: ${event.code}`);
        websocket = null; // Clear the reference immediately

        // Call custom onclose callback first, if any
        if (onCloseCallback) onCloseCallback(event);

        // Handle specific close codes
        if (event.code === 1008) { // Policy Violation (Invalid Token)
            alert("Authentication failed. Please login again.");
            logout(); // Use imported logout function
        } else if (event.code === 1000 || event.code === 1001) {
            // Normal closure or going away - Do nothing special, don't reconnect
            console.log("WebSocket closed normally or navigating away. Won't reconnect.");
            connectionAttempts = 0; // Reset attempts on clean close
        } else {
            // For other codes (like 1006 - Abnormal Closure), try to reconnect
            if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
                connectionAttempts++;
                console.log(
                    `WebSocket closed unexpectedly. Attempting reconnect ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY_MS / 1000}s...`
                );
                setTimeout(connect, RECONNECT_DELAY_MS);
            } else {
                console.error("Max reconnection attempts reached. Giving up.");
                alert(
                    "Connection lost and unable to reconnect. Please refresh the page or log in again."
                );
                // Optionally force logout here too if connection is critical
                // logout();
            }
        }
    };
}

export function send(action, payload) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log(`Sending WS Action: ${action}`, payload);
        websocket.send(JSON.stringify({ action: action, payload: payload }));
        return true;
    } else {
        console.error("WebSocket not connected. Cannot send message.");
        return false;
    }
}

export function disconnect(code = 1000, reason = "User logout") {
    clearTimeout(connectTimer); // Stop any reconnection attempts
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log(`Closing WebSocket connection: Code=${code}, Reason=${reason}`);
        websocket.close(code, reason);
    }
    websocket = null; // Ensure it's cleared
}