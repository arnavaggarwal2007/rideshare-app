/**
 * Chat & Request Scenario - Modular k6 Script
 * Simulates seat requests and chat messaging
 * 
 * Reference: load_testing_procedure.md Section 4.2 (LT-SCN-004)
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import {
    randomBool,
    randomFrom,
    randomInt
} from '../utils/data-generators.js';

// Custom metrics
const requestLatency = new Trend('seat_request_latency', true);
const chatLatency = new Trend('chat_message_latency', true);
const requestErrors = new Counter('request_errors');
const chatErrors = new Counter('chat_errors');
const requestsCreated = new Counter('seat_requests_created');
const messagesCreated = new Counter('chat_messages_created');

// Chat message templates
const NEGOTIATION_MESSAGES = [
  'Hi! Is this ride still available?',
  'I would like to book a seat.',
  'Can you pick me up at the campus entrance?',
  'What time exactly are you leaving?',
  'How much luggage space do you have?',
  'Sure, that works for me!',
  'Can I bring a small bag?',
  'Great, see you then!',
  'Thanks for accepting my request!',
  'On my way to the pickup point.',
];

/**
 * Seat Request Scenario
 * 
 * @param {Object} options Configuration options
 * @param {string} options.rideId - Specific ride to request (default: uses env or random)
 * @param {number} options.seats - Seats to request (default: random 1-2)
 * @param {boolean} options.followWithChat - Start chat after request (default: true)
 */
export function seatRequestScenario(options = {}) {
  const {
    rideId = null,
    seats = null,
    followWithChat = true,
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    const userId = __ENV.USER_ID || `test-user-${__VU}`;

    group('Seat Request', () => {
      const targetRideId = rideId || __ENV.RIDE_ID || `test-ride-${randomInt(1, 100)}`;
      const seatsToRequest = seats || randomInt(1, 2);

      // Create seat request
      const request = {
        rideId: targetRideId,
        userId,
        seatsRequested: seatsToRequest,
        message: randomFrom(NEGOTIATION_MESSAGES.slice(0, 4)), // Initial messages
        pickupLocation: randomBool(0.3) ? 'Campus Entrance' : null,
      };

      const response = createSeatRequest(baseUrl, request, authToken);

      // Follow with chat if request accepted
      if (followWithChat && response.status === 201) {
        sleep(randomInt(2, 5));
        
        try {
          const created = response.json();
          const chatId = created.chatId || created.threadId;
          if (chatId) {
            simulateChatExchange(baseUrl, chatId, userId, authToken, 3);
          }
        } catch {
          // Parse error
        }
      }
    });

    sleep(randomInt(20, 60));
  };
}

/**
 * Create seat request
 */
function createSeatRequest(baseUrl, request, authToken) {
  const url = `${baseUrl}/requests`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
    tags: {
      scenario: 'chat_request',
      operation: 'request',
    },
  };

  const startTime = Date.now();
  const response = http.post(url, JSON.stringify(request), params);
  const latency = Date.now() - startTime;

  // Record metrics
  requestLatency.add(latency);

  const checks = check(response, {
    'request created (201)': (r) => r.status === 201,
    'has request id': (r) => {
      try {
        const body = r.json();
        return body.id || body.requestId;
      } catch {
        return false;
      }
    },
    'request latency < 800ms': () => latency < 800,
  });

  if (response.status === 201) {
    requestsCreated.add(1);
  } else {
    requestErrors.add(1);
    if (__ENV.DEBUG === 'true') {
      console.error(`Request error: ${response.status} (${latency}ms)`);
    }
  }

  return response;
}

/**
 * Chat Message Scenario
 * 
 * @param {Object} options Configuration options
 * @param {string} options.chatId - Chat thread ID
 * @param {number} options.messageCount - Messages to send (default: 5)
 * @param {number} options.typingDelay - Delay between messages (default: 3-8s)
 */
export function chatMessageScenario(options = {}) {
  const {
    chatId = null,
    messageCount = 5,
    typingDelayMin = 3,
    typingDelayMax = 8,
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    const userId = __ENV.USER_ID || `test-user-${__VU}`;

    group('Chat Session', () => {
      const threadId = chatId || __ENV.CHAT_ID || `test-chat-${randomInt(1, 50)}`;
      
      simulateChatExchange(baseUrl, threadId, userId, authToken, messageCount, {
        typingDelayMin,
        typingDelayMax,
      });
    });

    sleep(randomInt(30, 90));
  };
}

/**
 * Simulate a chat exchange
 */
function simulateChatExchange(baseUrl, chatId, userId, authToken, messageCount, options = {}) {
  const {
    typingDelayMin = 3,
    typingDelayMax = 8,
  } = options;

  for (let i = 0; i < messageCount; i++) {
    // Send message
    const message = {
      chatId,
      senderId: userId,
      text: randomFrom(NEGOTIATION_MESSAGES),
    };

    sendChatMessage(baseUrl, message, authToken);

    // Typing delay (simulates reading and typing)
    if (i < messageCount - 1) {
      sleep(randomInt(typingDelayMin, typingDelayMax));
    }
  }
}

/**
 * Send a chat message
 */
function sendChatMessage(baseUrl, message, authToken) {
  const url = `${baseUrl}/chats/${message.chatId}/messages`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
    tags: {
      scenario: 'chat_request',
      operation: 'message',
    },
  };

  const startTime = Date.now();
  const response = http.post(url, JSON.stringify(message), params);
  const latency = Date.now() - startTime;

  // Record metrics
  chatLatency.add(latency);

  const checks = check(response, {
    'message sent (201)': (r) => r.status === 201,
    'chat latency < 500ms': () => latency < 500,
    'chat latency < 800ms': () => latency < 800,
  });

  if (response.status === 201) {
    messagesCreated.add(1);
  } else {
    chatErrors.add(1);
  }

  return response;
}

/**
 * Load chat history
 */
export function loadChatHistory(baseUrl, chatId, authToken, limit = 50) {
  const url = `${baseUrl}/chats/${chatId}/messages?limit=${limit}`;
  
  const startTime = Date.now();
  const response = http.get(url, {
    headers: {
      'Authorization': authToken ? `Bearer ${authToken}` : '',
    },
    tags: { scenario: 'chat_request', operation: 'history' },
  });
  const latency = Date.now() - startTime;

  chatLatency.add(latency);

  check(response, {
    'history loaded': (r) => r.status === 200,
    'history latency < 500ms': () => latency < 500,
  });

  return response;
}

/**
 * Full negotiation flow scenario
 */
export function negotiationFlowScenario() {
  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    const userId = __ENV.USER_ID || `test-user-${__VU}`;

    group('Negotiation Flow', () => {
      // 1. View ride (already interested)
      const rideId = __ENV.RIDE_ID || `test-ride-${randomInt(1, 100)}`;
      const rideResponse = http.get(`${baseUrl}/rides/${rideId}`, {
        headers: { 'Authorization': authToken ? `Bearer ${authToken}` : '' },
        tags: { scenario: 'chat_request', operation: 'view_ride' },
      });

      if (rideResponse.status !== 200) {
        return;
      }

      sleep(randomInt(3, 8)); // Considering the ride

      // 2. Send seat request with initial message
      const request = {
        rideId,
        userId,
        seatsRequested: randomInt(1, 2),
        message: 'Hi! I am interested in your ride. Is it still available?',
      };

      const requestResponse = createSeatRequest(baseUrl, request, authToken);

      if (requestResponse.status !== 201) {
        return;
      }

      let chatId;
      try {
        const data = requestResponse.json();
        chatId = data.chatId || data.threadId;
      } catch {
        return;
      }

      sleep(randomInt(30, 120)); // Waiting for driver response (simulated)

      // 3. Continue negotiation
      const negotiationMessages = [
        'Can you pick me up at the main entrance?',
        'What time do you plan to arrive?',
        'I have one small backpack, is that okay?',
        'Perfect! See you then.',
      ];

      for (const text of negotiationMessages) {
        sendChatMessage(baseUrl, { chatId, senderId: userId, text }, authToken);
        sleep(randomInt(5, 15));
      }

      // 4. Load full chat history
      loadChatHistory(baseUrl, chatId, authToken);
    });
  };
}

/**
 * Chat spike scenario (many users messaging simultaneously)
 */
export function chatSpikeScenario(options = {}) {
  const {
    chatId = null,
    burstMessages = 10,
    burstDelay = 100, // ms between burst messages
  } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';
    const userId = __ENV.USER_ID || `test-user-${__VU}`;
    const threadId = chatId || __ENV.CHAT_ID || `spike-chat-${randomInt(1, 10)}`;

    group('Chat Spike', () => {
      // Rapid-fire messages
      for (let i = 0; i < burstMessages; i++) {
        const message = {
          chatId: threadId,
          senderId: userId,
          text: `Burst message ${i + 1}: ${randomFrom(NEGOTIATION_MESSAGES)}`,
        };

        sendChatMessage(baseUrl, message, authToken);
        sleep(burstDelay / 1000);
      }
    });
  };
}

/**
 * Request status check scenario
 */
export function checkRequestStatus(options = {}) {
  const { requestId = null } = options;

  return function () {
    const baseUrl = __ENV.API_BASE_URL || 'https://rideboard-staging.firebaseio.com';
    const authToken = __ENV.AUTH_TOKEN || '';

    group('Check Request Status', () => {
      const id = requestId || __ENV.REQUEST_ID;
      if (!id) return;

      const response = http.get(`${baseUrl}/requests/${id}`, {
        headers: { 'Authorization': authToken ? `Bearer ${authToken}` : '' },
        tags: { scenario: 'chat_request', operation: 'status' },
      });

      check(response, {
        'status retrieved': (r) => r.status === 200,
        'has status field': (r) => {
          try {
            return r.json().status !== undefined;
          } catch {
            return false;
          }
        },
      });
    });
  };
}

// Default export
export default seatRequestScenario();

// Named exports
export {
    chatErrors, chatLatency, messagesCreated,
    NEGOTIATION_MESSAGES, requestErrors, requestLatency, requestsCreated
};

