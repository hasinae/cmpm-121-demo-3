// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts"; // Fix missing marker images

const INITIAL_LAT = 36.9895;
const INITIAL_LON = -122.0627;
const GRID_SIZE = 0.0001;
const CACHE_PROBABILITY = 0.1;
const RANGE = 8;

type Coordinates = { lat: number; lon: number };
type Cell = { i: number; j: number };
type Coin = { cell: Cell; serial: number };
type CacheLocation = { id: string; location: Coordinates; coins: Coin[] };

// Map setup
const OAKES_CLASSROOM = leaflet.latLng(INITIAL_LAT, INITIAL_LON);
const map = leaflet.map("map", {
  center: OAKES_CLASSROOM,
  zoom: 19,
  minZoom: 19,
  maxZoom: 19,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Add OpenStreetMap tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Player position and marker
const playerPosition: Coordinates = { lat: INITIAL_LAT, lon: INITIAL_LON };
let playerCoins = 0;
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!").addTo(map);

const cacheState: Map<string, CacheLocation> = new Map();

// Generate random number using a deterministic RNG
function deterministicRandom(seed: number): number {
  return Math.abs(Math.sin(seed) * 10000) % 1;
}

// Convert lat/lon to grid cell
function latLonToCell({ lat, lon }: Coordinates): Cell {
  const i = Math.floor((lat - INITIAL_LAT) / GRID_SIZE);
  const j = Math.floor((lon - INITIAL_LON) / GRID_SIZE);
  return { i, j };
}

// Generate cache based on cell location
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
    cacheState.set(cache.id, cache);
    return cache;
  }
  return null;
}

// Update visible caches around the player
function updateVisibleCaches() {
  const playerCell = latLonToCell(playerPosition);
  const cacheLocations: CacheLocation[] = [];

  for (let i = -RANGE; i <= RANGE; i++) {
    for (let j = -RANGE; j <= RANGE; j++) {
      const cell: Cell = { i: playerCell.i + i, j: playerCell.j + j };
      const cacheId = `cache_${cell.i}_${cell.j}`;
      if (cacheState.has(cacheId)) {
        cacheLocations.push(cacheState.get(cacheId)!);
      } else {
        const newCache = generateCache(cell);
        if (newCache) cacheLocations.push(newCache);
      }
    }
  }
  renderVisibleCaches(cacheLocations);
}

// Render caches on the map
function renderVisibleCaches(cacheLocations: CacheLocation[]) {
  cacheLocations.forEach((cache) => {
    // Create marker for each cache
    const cacheMarker = leaflet.marker(cache.location);
    cacheMarker
      .bindPopup(() => {
        const cacheInfo = `
          <div>Cache at (${cache.location.lat.toFixed(5)}, ${
          cache.location.lon.toFixed(5)
        }) - Coins: ${cache.coins.length}</div>
          <button id="collectCoins">Collect Coins</button>
        `;
        return cacheInfo;
      })
      .addTo(map);

    const collectButton = document.querySelector("#collectCoins");
    collectButton?.addEventListener("click", () => {
      collectCoins(cache.id);
      depositCoins(cache.id);
    });
  });
}

// Collect coins from a cache
function collectCoins(cacheId: string) {
  const cache = cacheState.get(cacheId);
  if (cache && cache.coins.length > 0) {
    const coin = cache.coins.pop();
    if (coin) {
      playerCoins += 1;
      alert(`Collected coin! Total coins: ${playerCoins}`);
    }
  }
}

// Deposit collected coins into a cache
function depositCoins(cacheId: string) {
  const cache = cacheState.get(cacheId);
  if (cache && playerCoins > 0) {
    cache.coins.push({
      cell: latLonToCell(cache.location),
      serial: cache.coins.length,
    });
    playerCoins = 0;
    alert(`Deposited coins into cache ${cacheId}`);
  }
}

// Handle player movement (using buttons)
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
      playerMarker.setLatLng([playerPosition.lat, playerPosition.lon]);
      updateVisibleCaches();
    });
    document.body.appendChild(button);
  });
}

// Set up geolocation functionality
const geolocationButton = document.createElement("button");
geolocationButton.textContent = "🌐";
geolocationButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition(
    (position) => {
      playerPosition.lat = position.coords.latitude;
      playerPosition.lon = position.coords.longitude;
      playerMarker.setLatLng([playerPosition.lat, playerPosition.lon]);
      updateVisibleCaches();
    },
    (error) => alert("Error accessing geolocation: " + error.message),
    { enableHighAccuracy: true }
  );
});
document.body.appendChild(geolocationButton);

// Load initial state
updateVisibleCaches();
createMovementButtons();
