// Initial Setup
const INITIAL_LAT = 36.9895;
const INITIAL_LON = -122.0627;
const GRID_SIZE = 0.0001;
const CACHE_PROBABILITY = 0.1;
const RANGE = 8;

type Coordinates = { lat: number; lon: number };
type Cell = { i: number; j: number };
type Coin = { cell: Cell; serial: number };
type CacheLocation = { id: string; location: Coordinates; coins: Coin[] };

const playerPosition: Coordinates = { lat: INITIAL_LAT, lon: INITIAL_LON };
let playerCoins = 0;
let cacheLocations: CacheLocation[] = [];
const cacheState: Map<string, CacheLocation> = new Map();

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

// Generate a single cache
function generateCache(cell: Cell): CacheLocation | null {
  if (deterministicRandom(cell.i * RANGE + cell.j) < CACHE_PROBABILITY) {
    const location: Coordinates = {
      lat: INITIAL_LAT + cell.i * GRID_SIZE,
      lon: INITIAL_LON + cell.j * GRID_SIZE,
    };
    const coins: Coin[] = [];
    const numCoins = Math.floor(deterministicRandom(cell.i + cell.j + 1) * 10);
    for (let coinSerial = 0; coinSerial < numCoins; coinSerial++) {
      coins.push({ cell, serial: coinSerial });
    }
    const cache: CacheLocation = {
      id: `cache_${cell.i}_${cell.j}`,
      location,
      coins,
    };
    cacheState.set(cache.id, cache); // Save cache state (Memento pattern)
    return cache;
  }
  return null;
}

// Regenerate visible caches
function updateVisibleCaches() {
  cacheLocations = [];
  const playerCell = latLonToCell(playerPosition);

  for (let i = -RANGE; i <= RANGE; i++) {
    for (let j = -RANGE; j <= RANGE; j++) {
      const cell: Cell = { i: playerCell.i + i, j: playerCell.j + j };
      const cacheId = `cache_${cell.i}_${cell.j}`;
      if (cacheState.has(cacheId)) {
        cacheLocations.push(cacheState.get(cacheId)!); // Retrieve saved state
      } else {
        const newCache = generateCache(cell);
        if (newCache) cacheLocations.push(newCache);
      }
    }
  }
}

// Render visible caches
function renderVisibleCaches() {
  document.body.innerHTML = ""; // Clear previous buttons
  createMovementButtons();

  cacheLocations.forEach((cache) => {
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
}

// Create movement buttons
function createMovementButtons() {
  const directions = [
    { label: "⬆️", dx: 0, dy: GRID_SIZE },
    { label: "⬇️", dx: 0, dy: -GRID_SIZE },
    { label: "⬅️", dx: -GRID_SIZE, dy: 0 },
    { label: "➡️", dx: GRID_SIZE, dy: 0 },
  ];

  directions.forEach(({ label, dx, dy }) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.addEventListener("click", () => {
      playerPosition.lat += dy;
      playerPosition.lon += dx;
      updateVisibleCaches();
      renderVisibleCaches();
    });
    document.body.appendChild(button);
  });
}

// Coin collection and deposit functions
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

function depositCoins(cacheId: string) {
  const cache = cacheLocations.find((c) => c.id === cacheId);
  if (cache && playerCoins > 0) {
    cache.coins.push({
      cell: latLonToCell(cache.location),
      serial: cache.coins.length,
    });
    playerCoins = 0;
    alert(`Deposited coins into cache ${cacheId}`);
  }
}

// Initialize game
updateVisibleCaches();
renderVisibleCaches();
