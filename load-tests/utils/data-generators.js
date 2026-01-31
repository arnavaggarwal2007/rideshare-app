/**
 * Test Data Generators for RideBoard Load Tests
 * Creates realistic, varied test data
 */

// ============================================================================
// LOCATION DATA
// ============================================================================

const CAMPUSES = [
  { id: 'UCLA', name: 'UCLA', lat: 34.0689, lng: -118.4452 },
  { id: 'USC', name: 'USC', lat: 34.0224, lng: -118.2851 },
  { id: 'Caltech', name: 'Caltech', lat: 34.1377, lng: -118.1253 },
  { id: 'CSUN', name: 'CSUN', lat: 34.2400, lng: -118.5291 },
  { id: 'UCSB', name: 'UC Santa Barbara', lat: 34.4140, lng: -119.8489 },
  { id: 'UCI', name: 'UC Irvine', lat: 33.6405, lng: -117.8443 },
  { id: 'UCSD', name: 'UC San Diego', lat: 32.8801, lng: -117.2340 },
  { id: 'UCR', name: 'UC Riverside', lat: 33.9737, lng: -117.3281 },
];

const DESTINATIONS = [
  { id: 'LAX', name: 'LAX Airport', lat: 33.9425, lng: -118.4081 },
  { id: 'SFO', name: 'SFO Airport', lat: 37.6213, lng: -122.3790 },
  { id: 'SAN', name: 'San Diego Airport', lat: 32.7338, lng: -117.1933 },
  { id: 'downtown_la', name: 'Downtown LA', lat: 34.0522, lng: -118.2437 },
  { id: 'santa_monica', name: 'Santa Monica', lat: 34.0195, lng: -118.4912 },
  { id: 'pasadena', name: 'Pasadena', lat: 34.1478, lng: -118.1445 },
  { id: 'orange_county', name: 'Orange County', lat: 33.7175, lng: -117.8311 },
  { id: 'san_francisco', name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { id: 'las_vegas', name: 'Las Vegas', lat: 36.1699, lng: -115.1398 },
  { id: 'san_diego', name: 'San Diego', lat: 32.7157, lng: -117.1611 },
];

const INTERMEDIATE_STOPS = [
  'Burbank', 'Glendale', 'Long Beach', 'Anaheim', 'Irvine', 
  'Costa Mesa', 'Newport Beach', 'Huntington Beach', 'Torrance', 'El Segundo'
];

// ============================================================================
// USER DATA
// ============================================================================

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery',
  'Cameron', 'Dakota', 'Jamie', 'Skyler', 'Reese', 'Drew', 'Parker', 'Hayden',
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson'
];

const CAR_MAKES = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Tesla', 'Hyundai'];
const CAR_MODELS = {
  'Toyota': ['Camry', 'Corolla', 'RAV4', 'Prius', 'Highlander'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot'],
  'Ford': ['F-150', 'Escape', 'Explorer', 'Mustang'],
  'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Tahoe'],
  'Nissan': ['Altima', 'Sentra', 'Rogue', 'Maxima'],
  'BMW': ['3 Series', '5 Series', 'X3', 'X5'],
  'Tesla': ['Model 3', 'Model S', 'Model Y', 'Model X'],
  'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe'],
};

const CAR_COLORS = ['White', 'Black', 'Silver', 'Blue', 'Red', 'Gray', 'Green'];

// ============================================================================
// RANDOM GENERATORS
// ============================================================================

/**
 * Get random item from array
 */
export function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random integer in range [min, max]
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random float with precision
 */
export function randomFloat(min, max, precision = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(precision));
}

/**
 * Get random boolean with probability
 */
export function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

/**
 * Generate random UUID
 */
export function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// LOCATION GENERATORS
// ============================================================================

/**
 * Get random campus
 */
export function randomCampus() {
  return randomFrom(CAMPUSES);
}

/**
 * Get random destination
 */
export function randomDestination() {
  return randomFrom(DESTINATIONS);
}

/**
 * Get random origin-destination pair (ensuring they're different)
 */
export function randomRoute() {
  const origin = randomCampus();
  let destination;
  do {
    destination = randomFrom([...CAMPUSES, ...DESTINATIONS]);
  } while (destination.id === origin.id);
  
  return { origin, destination };
}

/**
 * Get random intermediate stops
 */
export function randomStops(maxStops = 3) {
  const numStops = randomInt(0, maxStops);
  const stops = [];
  const available = [...INTERMEDIATE_STOPS];
  
  for (let i = 0; i < numStops && available.length > 0; i++) {
    const index = randomInt(0, available.length - 1);
    stops.push(available.splice(index, 1)[0]);
  }
  
  return stops;
}

// ============================================================================
// DATE/TIME GENERATORS
// ============================================================================

/**
 * Get random date within next N days
 */
export function randomDate(daysAhead = 14) {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, daysAhead));
  return date.toISOString().split('T')[0];
}

/**
 * Get random time (HH:MM format)
 */
export function randomTime() {
  const hour = randomInt(6, 22).toString().padStart(2, '0');
  const minute = randomFrom(['00', '15', '30', '45']);
  return `${hour}:${minute}`;
}

/**
 * Get random datetime
 */
export function randomDateTime(daysAhead = 14) {
  const date = randomDate(daysAhead);
  const time = randomTime();
  return `${date}T${time}:00`;
}

/**
 * Get date range
 */
export function randomDateRange(daysAhead = 14) {
  const startDays = randomInt(1, daysAhead - 1);
  const endDays = randomInt(startDays + 1, daysAhead);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + startDays);
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + endDays);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// ============================================================================
// USER GENERATORS
// ============================================================================

/**
 * Generate random user profile
 */
export function randomUser() {
  const firstName = randomFrom(FIRST_NAMES);
  const lastName = randomFrom(LAST_NAMES);
  
  return {
    id: randomUUID(),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@example.com`,
    displayName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    campus: randomCampus().id,
    bio: `${randomFrom(['Student', 'Graduate student', 'Faculty', 'Staff'])} at ${randomCampus().name}`,
    rating: randomFloat(3.5, 5.0, 1),
    rideCount: randomInt(0, 50),
    verified: randomBool(0.8),
    createdAt: new Date(Date.now() - randomInt(1, 365) * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Generate random driver profile
 */
export function randomDriver() {
  const user = randomUser();
  const make = randomFrom(CAR_MAKES);
  
  return {
    ...user,
    isDriver: true,
    car: {
      make,
      model: randomFrom(CAR_MODELS[make]),
      year: randomInt(2015, 2024),
      color: randomFrom(CAR_COLORS),
      licensePlate: `${randomInt(1, 9)}${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(100, 999)}`,
    },
    driverRating: randomFloat(4.0, 5.0, 1),
    tripsAsDriver: randomInt(5, 100),
  };
}

// ============================================================================
// RIDE GENERATORS
// ============================================================================

/**
 * Generate random ride post
 */
export function randomRide(driverId = null) {
  const route = randomRoute();
  const seatsTotal = randomInt(2, 4);
  const seatsAvailable = randomInt(1, seatsTotal);
  
  return {
    id: randomUUID(),
    driverId: driverId || randomUUID(),
    origin: {
      id: route.origin.id,
      name: route.origin.name,
      coordinates: {
        lat: route.origin.lat,
        lng: route.origin.lng,
      },
    },
    destination: {
      id: route.destination.id,
      name: route.destination.name,
      coordinates: {
        lat: route.destination.lat,
        lng: route.destination.lng,
      },
    },
    intermediateStops: randomStops(2),
    departureDateTime: randomDateTime(),
    seatsTotal,
    seatsAvailable,
    pricePerSeat: randomInt(10, 50),
    allowDetour: randomBool(0.3),
    detourRadius: randomBool(0.3) ? randomInt(5, 15) : null,
    notes: randomBool(0.5) ? `${randomFrom(['Flexible departure time', 'No smoking', 'Pet-friendly', 'Music welcome', 'Luggage space available'])}` : '',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generate ride request (for seat booking)
 */
export function randomRideRequest(rideId, userId = null) {
  return {
    id: randomUUID(),
    rideId,
    userId: userId || randomUUID(),
    seatsRequested: randomInt(1, 2),
    message: randomFrom([
      'Hi! I would like to join your ride.',
      'Is this ride still available?',
      'Can you pick me up at the campus entrance?',
      'Flexible on pickup location!',
      '',
    ]),
    pickupLocation: randomBool(0.3) ? randomFrom(INTERMEDIATE_STOPS) : null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// CHAT GENERATORS
// ============================================================================

const CHAT_MESSAGES = [
  'Hi there!',
  'Is this ride still available?',
  'What time do you plan to leave?',
  'Can we meet at the campus entrance?',
  'Sure, that works for me!',
  'How much luggage space do you have?',
  'I have one small bag.',
  'Great, see you then!',
  'Can I bring a friend?',
  'What kind of car do you drive?',
  'Sounds good!',
  'Thanks for the ride!',
  'Let me know if there are any changes.',
  'On my way!',
  'Running 5 minutes late, sorry!',
];

/**
 * Generate random chat message
 */
export function randomChatMessage(chatId, senderId = null) {
  return {
    id: randomUUID(),
    chatId,
    senderId: senderId || randomUUID(),
    text: randomFrom(CHAT_MESSAGES),
    timestamp: new Date().toISOString(),
    read: false,
  };
}

/**
 * Generate chat thread
 */
export function randomChatThread(participant1, participant2, rideId = null) {
  return {
    id: randomUUID(),
    participants: [participant1, participant2],
    rideId: rideId || randomUUID(),
    lastMessage: randomFrom(CHAT_MESSAGES),
    lastMessageAt: new Date().toISOString(),
    unreadCount: randomInt(0, 5),
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// SEARCH QUERY GENERATORS
// ============================================================================

/**
 * Generate search query for rides
 */
export function randomSearchQuery() {
  const route = randomRoute();
  const dateRange = randomDateRange();
  
  const query = {
    origin: route.origin.id,
    destination: route.destination.id,
  };
  
  // Add optional filters randomly
  if (randomBool(0.5)) {
    query.startDate = dateRange.startDate;
  }
  if (randomBool(0.3)) {
    query.endDate = dateRange.endDate;
  }
  if (randomBool(0.3)) {
    query.minSeats = randomInt(1, 2);
  }
  if (randomBool(0.2)) {
    query.maxPrice = randomInt(20, 50);
  }
  if (randomBool(0.2)) {
    query.allowDetour = true;
  }
  
  return query;
}

// ============================================================================
// BULK GENERATORS
// ============================================================================

/**
 * Generate array of items using generator function
 */
export function generateMany(generator, count, ...args) {
  return Array.from({ length: count }, () => generator(...args));
}

/**
 * Pre-generate test data pools
 */
export function createTestDataPool(options = {}) {
  const {
    users = 100,
    drivers = 50,
    rides = 500,
    chatThreads = 100,
  } = options;
  
  const userPool = generateMany(randomUser, users);
  const driverPool = generateMany(randomDriver, drivers);
  const ridePool = driverPool.flatMap(driver => 
    generateMany(randomRide, Math.ceil(rides / drivers), driver.id)
  ).slice(0, rides);
  const chatPool = generateMany(
    () => randomChatThread(randomFrom(userPool).id, randomFrom(driverPool).id),
    chatThreads
  );
  
  return {
    users: userPool,
    drivers: driverPool,
    rides: ridePool,
    chats: chatPool,
    
    getRandomUser: () => randomFrom(userPool),
    getRandomDriver: () => randomFrom(driverPool),
    getRandomRide: () => randomFrom(ridePool),
    getRandomChat: () => randomFrom(chatPool),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Random helpers
  randomFrom,
  randomInt,
  randomFloat,
  randomBool,
  randomUUID,
  
  // Location
  randomCampus,
  randomDestination,
  randomRoute,
  randomStops,
  CAMPUSES,
  DESTINATIONS,
  
  // Date/Time
  randomDate,
  randomTime,
  randomDateTime,
  randomDateRange,
  
  // User
  randomUser,
  randomDriver,
  
  // Ride
  randomRide,
  randomRideRequest,
  
  // Chat
  randomChatMessage,
  randomChatThread,
  
  // Search
  randomSearchQuery,
  
  // Bulk
  generateMany,
  createTestDataPool,
};
