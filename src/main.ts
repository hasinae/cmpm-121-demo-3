// Button setup
const button = document.createElement("button");
button.textContent = "Click me!";
button.addEventListener("click", () => {
  alert("You clicked the button!");
});
document.body.appendChild(button);

// Types for coordinates and caches
type Coordinates = { lat: number; lon: number };
type CacheLocation = {
  id: string;
  location: Coordinates;
  coins: number;
};

// Constants for procedural generation
const INITIAL_LAT = 36.9895;
const INITIAL_LON = -122.0627;
const GRID_SIZE = 0.0001;
const CACHE_PROBABILITY = 0.1;
const RANGE = 8;

// Player state
const playerPosition: Coordinates = { lat: INITIAL_LAT, lon: INITIAL_LON };
let playerCoins = 0;
const cacheLocations: CacheLocation[] = generateCaches();

// Deterministic "random" function
function deterministicRandom(seed: number): number {
  return Math.abs(Math.sin(seed) * 10000) % 1;
}

// Generate caches within a specific range
function generateCaches(): CacheLocation[] {
  const cacheList: CacheLocation[] = [];
  for (let i = -RANGE; i <= RANGE; i++) {
    for (let j = -RANGE; j <= RANGE; j++) {
      if (deterministicRandom(i * RANGE + j) < CACHE_PROBABILITY) {
        const cacheLocation: Coordinates = {
          lat: INITIAL_LAT + i * GRID_SIZE,
          lon: INITIAL_LON + j * GRID_SIZE,
        };
        const coins = Math.floor(deterministicRandom(i + j + 1) * 10);
        cacheList.push({
          id: `cache_${i}_${j}`,
          location: cacheLocation,
          coins,
        });
      }
    }
  }
  return cacheList;
}

// Find nearby caches within a given range
function findNearbyCaches(
  playerPos: Coordinates,
  range: number,
): CacheLocation[] {
  return cacheLocations.filter((cache) => {
    const distanceLat = Math.abs(playerPos.lat - cache.location.lat) /
      GRID_SIZE;
    const distanceLon = Math.abs(playerPos.lon - cache.location.lon) /
      GRID_SIZE;
    return distanceLat <= range && distanceLon <= range;
  });
}

// Collect coins from a cache
function collectCoins(cacheId: string) {
  const cache = cacheLocations.find((c) => c.id === cacheId);
  if (cache && cache.coins > 0) {
    playerCoins += cache.coins;
    cache.coins = 0;
    alert(`Collected coins! Total coins: ${playerCoins}`);
  }
}

// Deposit coins into a cache
function depositCoins(cacheId: string) {
  const cache = cacheLocations.find((c) => c.id === cacheId);
  if (cache && playerCoins > 0) {
    cache.coins += playerCoins;
    playerCoins = 0;
    alert(`Deposited coins into cache ${cacheId}`);
  }
}

// Display nearby caches as buttons for interaction
const nearbyCaches = findNearbyCaches(playerPosition, RANGE);
nearbyCaches.forEach((cache) => {
  const cacheButton = document.createElement("button");
  cacheButton.textContent = `Cache at (${cache.location.lat.toFixed(5)}, ${
    cache.location.lon.toFixed(5)
  }) - Coins: ${cache.coins}`;

  cacheButton.addEventListener("click", () => {
    collectCoins(cache.id);
    depositCoins(cache.id);
  });

  document.body.appendChild(cacheButton);
});
