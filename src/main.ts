// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts"; // Fix missing marker images

const INITIAL_LAT = 36.9895;
const INITIAL_LNG = -122.0627;
const GRID_SIZE = 0.0001;
const CACHE_PROBABILITY = 0.1;
const RANGE = 8;

type Coordinates = { lat: number; lng: number };
type Cell = { i: number; j: number };
type Coin = { cell: Cell; serial: number };
type CacheLocation = { id: string; location: Coordinates; coins: Coin[] };

const playerPosition: Coordinates = { lat: INITIAL_LAT, lng: INITIAL_LNG };
let playerCoins = 0;
let cacheLocations: CacheLocation[] = [];
const cacheState: Map<string, CacheLocation> = new Map();
const movementHistory: Coordinates[] = [];

function deterministicRandom(seed: number): number {
  return Math.abs(Math.sin(seed) * 10000) % 1;
}

function latLngToCell({ lat, lng }: Coordinates): Cell {
  const i = Math.floor(lat / GRID_SIZE);
  const j = Math.floor(lng / GRID_SIZE);
  return { i, j };
}

function generateCache(cell: Cell): CacheLocation | null {
  if (deterministicRandom(cell.i * RANGE + cell.j) < CACHE_PROBABILITY) {
    const location: Coordinates = {
      lat: INITIAL_LAT + cell.i * GRID_SIZE,
      lng: INITIAL_LNG + cell.j * GRID_SIZE,
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

function updateVisibleCaches() {
  cacheLocations = [];
  const playerCell = latLngToCell(playerPosition);

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
}

function renderVisibleCaches() {
  document.body.innerHTML = "";
  createMovementButtons();

  cacheLocations.forEach((cache) => {
    const cacheButton = document.createElement("button");
    cacheButton.textContent = `Cache at (${cache.location.lat.toFixed(5)}, ${
      cache.location.lng.toFixed(5)
    }) - Coins: ${cache.coins.length}`;
    cacheButton.addEventListener("click", () => {
      collectCoins(cache.id);
      depositCoins(cache.id);
      centerOnCache(cache.id);
    });
    document.body.appendChild(cacheButton);
  });

  renderMovementHistory();
}

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
      playerPosition.lng += dx;
      trackMovement();
      updateVisibleCaches();
      renderVisibleCaches();
    });
    document.body.appendChild(button);
  });
}

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
      cell: latLngToCell(cache.location),
      serial: cache.coins.length,
    });
    playerCoins = 0;
    alert(`Deposited coins into cache ${cacheId}`);
  }
}

function trackMovement() {
  movementHistory.push({ ...playerPosition });
}

function renderMovementHistory() {
  const polyline = document.querySelector("#polyline");
  if (polyline) polyline.remove();

  const path = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline",
  );
  path.setAttribute("id", "polyline");
  path.setAttribute(
    "points",
    movementHistory.map((p) => `${p.lng},${p.lat}`).join(" "),
  );
  path.setAttribute("style", "fill:none;stroke:black;stroke-width:2");
  document.body.appendChild(path);
}

function centerOnCache(cacheId: string) {
  const cache = cacheState.get(cacheId);
  if (cache) {
    playerPosition.lat = cache.location.lat;
    playerPosition.lng = cache.location.lng;
    updateVisibleCaches();
    renderVisibleCaches();
  }
}

function saveGameState() {
  const gameState = {
    playerPosition,
    playerCoins,
    cacheState: Array.from(cacheState.entries()),
  };
  localStorage.setItem("gameState", JSON.stringify(gameState));
}

function loadGameState() {
  const savedState = localStorage.getItem("gameState");
  if (savedState) {
    const {
      playerPosition: savedPosition,
      playerCoins: savedCoins,
      cacheState: savedCache,
    } = JSON.parse(savedState);
    Object.assign(playerPosition, savedPosition);
    playerCoins = savedCoins;
    cacheState.clear();
    savedCache.forEach(([key, value]: [string, CacheLocation]) =>
      cacheState.set(key, value)
    );
    updateVisibleCaches();
    renderVisibleCaches();
  }
}

function resetGameState() {
  if (confirm("Are you sure you want to reset the game?")) {
    localStorage.clear();
    movementHistory.length = 0;
    playerCoins = 0;
    cacheState.clear();
    updateVisibleCaches();
    renderVisibleCaches();
  }
}

const geolocationButton = document.createElement("button");
geolocationButton.textContent = "🌐";
geolocationButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition(
    (position) => {
      playerPosition.lat = position.coords.latitude;
      playerPosition.lng = position.coords.longitude;
      trackMovement();
      updateVisibleCaches();
      renderVisibleCaches();
    },
    (error) => alert("Error accessing geolocation: " + error.message),
    { enableHighAccuracy: true },
  );
});
document.body.appendChild(geolocationButton);

const resetButton = document.createElement("button");
resetButton.textContent = "🚮";
resetButton.addEventListener("click", resetGameState);
document.body.appendChild(resetButton);

addEventListener("beforeunload", saveGameState);
loadGameState();
updateVisibleCaches();
renderVisibleCaches();
