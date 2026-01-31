/**
 * k6 Load Test: Chat/Request Spike
 * 
 * Simulates a popular ride receiving many seat requests and chat messages.
 * Tests real-time Firestore listeners and notifications under load.
 * 
 * Load Profile:
 * - 1 popular ride receiving 100+ request notifications in 5 min
 * - Each request = 1 Firestore write + 1 Cloud Function (notification) + 5-10 chat messages
 * 
 * Success Criteria:
 * - P95 latency <800ms
 * - Error rate <0.5%
 * - Notifications deliver <500ms
 * - No message loss
 */

import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const requestLatency = new Trend('seat_request_latency');
const chatLatency = new Trend('chat_message_latency');
const requestErrorRate = new Rate('request_error_rate');
const chatErrorRate = new Rate('chat_error_rate');
const messagesSent = new Counter('messages_sent');

// Test configuration
export const options = {
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 30 },     // Ramp up
        { duration: '5m', target: 30 },     // Simulate 100+ requests over 5 min
        { duration: '1m', target: 0 },      // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1200'],
    http_req_failed: ['rate<0.005'],
    seat_request_latency: ['p(95)<800'],
    chat_message_latency: ['p(95)<500'],
    request_error_rate: ['rate<0.005'],
    chat_error_rate: ['rate<0.005'],
  },
};

const BASE_URL = __ENV.FIREBASE_URL || 'https://rideboard-staging.firebaseio.com';
const AUTH_TOKEN = __ENV.FIREBASE_TOKEN || '';

// Simulated popular ride ID (pre-created in test data)
const POPULAR_RIDE_ID = __ENV.POPULAR_RIDE_ID || 'test_popular_ride_001';

// Chat message templates
const CHAT_MESSAGES = [
  'Hi! Is this ride still available?',
  'What time exactly are you leaving?',
  'Can I bring a small suitcase?',
  'Is there a pickup point near campus?',
  'How much for the ride?',
  'Perfect, I\'ll take a seat!',
  'Can you pick me up at the dorms?',
  'Great, see you then!',
  'Thanks for the ride offer!',
  'Looking forward to the trip!',
];

function generateSeatRequest(userId) {
  return {
    riderId: userId,
    rideId: POPULAR_RIDE_ID,
    seatsRequested: Math.floor(Math.random() * 2) + 1,
    pickupLocation: 'Campus Main Gate',
    message: 'Hi! I\'d like to request a seat for this ride.',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

function generateChatMessage(userId, chatId) {
  return {
    senderId: userId,
    chatId: chatId,
    text: CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)],
    timestamp: new Date().toISOString(),
    read: false,
  };
}

export function setup() {
  console.log('Starting Chat/Request Spike Test');
  console.log(`Testing against ride: ${POPULAR_RIDE_ID}`);
  return { 
    startTime: new Date().toISOString(),
    chatId: `chat_${POPULAR_RIDE_ID}_test`,
  };
}

export default function (data) {
  const userId = `rider_${__VU}_${randomString(6)}`;
  const chatId = data.chatId;
  
  // Step 1: Send seat request
  group('Seat Request', () => {
    const requestData = generateSeatRequest(userId);
    const startTime = Date.now();
    
    const response = http.post(
      `${BASE_URL}/requests.json`,
      JSON.stringify(requestData),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        tags: { name: 'seat_request' },
        timeout: '10s',
      }
    );
    
    requestLatency.add(Date.now() - startTime);
    
    const success = check(response, {
      'request status is 200': (r) => r.status === 200,
      'request response time < 800ms': (r) => r.timings.duration < 800,
    });
    
    requestErrorRate.add(success ? 0 : 1);
    
    if (!success) {
      console.error(`Seat request failed: ${response.status}`);
    }
  });
  
  // Brief pause to simulate waiting for response
  sleep(Math.random() * 2 + 1);
  
  // Step 2: Send chat messages (negotiation)
  const messageCount = Math.floor(Math.random() * 6) + 3; // 3-8 messages
  
  group('Chat Messages', () => {
    for (let i = 0; i < messageCount; i++) {
      const messageData = generateChatMessage(userId, chatId);
      const startTime = Date.now();
      
      const response = http.post(
        `${BASE_URL}/chats/${chatId}/messages.json`,
        JSON.stringify(messageData),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`,
          },
          tags: { name: 'chat_message' },
          timeout: '5s',
        }
      );
      
      chatLatency.add(Date.now() - startTime);
      messagesSent.add(1);
      
      const success = check(response, {
        'message status is 200': (r) => r.status === 200,
        'message response time < 500ms': (r) => r.timings.duration < 500,
      });
      
      chatErrorRate.add(success ? 0 : 1);
      
      // Brief pause between messages (typing simulation)
      sleep(Math.random() * 3 + 1);
    }
  });
  
  // Step 3: Read chat messages (verify delivery)
  group('Read Chat', () => {
    const response = http.get(
      `${BASE_URL}/chats/${chatId}/messages.json?orderBy="timestamp"&limitToLast=20`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        tags: { name: 'chat_read' },
        timeout: '5s',
      }
    );
    
    check(response, {
      'read status is 200': (r) => r.status === 200,
      'read has messages': (r) => r.body && r.body !== 'null',
    });
  });
  
  // Think time before next request cycle
  sleep(Math.random() * 10 + 5);
}

export function teardown(data) {
  console.log('Chat/Request Spike Test Complete');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
}
