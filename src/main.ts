// Button setup
const button = document.createElement("button");
button.textContent = "Click me!";
button.addEventListener("click", () => {
  alert("You clicked the button!");
});
document.body.appendChild(button);

// Types for coordinates, caches, and coins
type Coordinates = { lat: number; lon: number };
type Cell = { i: number; j: number };
type Coin = { cell: Cell; serial: number };
type CacheLocation = { id: string; location: Coordinates; coins: Coin[] };

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

// Convert lat/lon to grid cell (Flyweight pattern)
function latLonToCell({ lat, lon }: Coordinates): Cell {
  const i = Math.floor(lat / GRID_SIZE);
  const j = Math.floor(lon / GRID_SIZE);
  return { i, j };
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
        const coins: Coin[] = [];
        const numCoins = Math.floor(deterministicRandom(i + j + 1) * 10);
        for (let coinSerial = 0; coinSerial < numCoins; coinSerial++) {
          coins.push({ cell: latLonToCell(cacheLocation), serial: coinSerial });
        }
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
  if (cache && cache.coins.length > 0) {
    const coin = cache.coins.pop();
    if (coin) {
      playerCoins += 1;
      alert(`Collected coin! Total coins: ${playerCoins}`);
    }
  }
}

// Deposit coins into a cache
function depositCoins(cacheId: string) {
  const cache = cacheLocations.find((c) => c.id === cacheId);
  if (cache && playerCoins > 0) {
    // Each coin deposited into the cache
    cache.coins.push({
      cell: latLonToCell(cache.location),
      serial: cache.coins.length,
    });
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
  }) - Coins: ${cache.coins.length}`;

  cacheButton.addEventListener("click", () => {
    collectCoins(cache.id);
    depositCoins(cache.id);
  });

  document.body.appendChild(cacheButton);
});
