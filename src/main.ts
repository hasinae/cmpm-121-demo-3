import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";

const INITIAL_COORDINATES = { lat: 36.9895, lng: -122.0627 }; // Default coordinates
const GRID_SIZE = 0.0001;
const CACHE_PROBABILITY = 0.1;
const VIEW_RANGE = 8;

type Coordinates = { lat: number; lng: number };
type Cell = { i: number; j: number };
type Coin = { id: string };

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

class Geocache implements Momento<string> {
  constructor(public id: string, public location: Coordinates, public coins: Coin[] = []) {}

  toMomento(): string {
    return JSON.stringify(this);
  }

  fromMomento(momento: string): void {
    Object.assign(this, JSON.parse(momento));
  }
}

const cellCache = new Map<string, Cell>();

const latLngToCell = ({ lat, lng }: Coordinates): Cell => {
  const i = Math.floor(lat / GRID_SIZE);
  const j = Math.floor(lng / GRID_SIZE);
  const cacheKey = `${i}:${j}`;
  if (!cellCache.has(cacheKey)) cellCache.set(cacheKey, { i, j });
  return cellCache.get(cacheKey)!;
};

class Player {
  coins: Coin[] = [];
  visitedCaches: Set<string> = new Set();

  constructor(public position: Coordinates) {}

  move(direction: string): void {
    const movements: Record<string, () => void> = {
      north: () => (this.position.lat += GRID_SIZE),
      south: () => (this.position.lat -= GRID_SIZE),
      east: () => (this.position.lng += GRID_SIZE),
      west: () => (this.position.lng -= GRID_SIZE),
    };
    movements[direction]?.();
  }

  collectCoin(coin: Coin, cacheId: string): void {
    this.coins.push(coin);
    this.visitedCaches.add(cacheId);
  }

  depositCoin(cache: Geocache): void {
    if (this.coins.length) cache.coins.push(this.coins.pop()!);
  }
}

const player = new Player(INITIAL_COORDINATES);
let cacheLocations: Geocache[] = [];
const cacheState = new Map<string, string>();

const map = L.map("map").setView([INITIAL_COORDINATES.lat, INITIAL_COORDINATES.lng], 16);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const playerMarker = L.marker([player.position.lat, player.position.lng])
  .addTo(map)
  .bindPopup("This is your location!");

const deterministicRandom = (seed: number): number => Math.abs(Math.sin(seed) * 10000) % 1;

const generateCache = (cell: Cell): Geocache | null => {
  if (deterministicRandom(cell.i * VIEW_RANGE + cell.j) < CACHE_PROBABILITY) {
    const id = `cache_${cell.i}_${cell.j}`;
    const location = { lat: cell.i * GRID_SIZE, lng: cell.j * GRID_SIZE };
    const coins = Array.from({ length: Math.floor(deterministicRandom(cell.i + cell.j + 1) * 5) }, (_, idx) => ({
      id: `${cell.i}:${cell.j}#${idx}`,
    }));
    const cache = new Geocache(id, location, coins);
    cacheState.set(id, cache.toMomento());
    return cache;
  }
  return null;
};

const restoreCache = (cacheId: string): Geocache | null => {
  const momento = cacheState.get(cacheId);
  if (!momento) return null;
  const cache = new Geocache("", { lat: 0, lng: 0 });
  cache.fromMomento(momento);
  return cache;
};

const updateVisibleCaches = (): void => {
  const playerCell = latLngToCell(player.position);
  cacheLocations = [];
  const visibleCacheIds = new Set<string>();

  for (let i = -VIEW_RANGE; i <= VIEW_RANGE; i++) {
    for (let j = -VIEW_RANGE; j <= VIEW_RANGE; j++) {
      const cell: Cell = { i: playerCell.i + i, j: playerCell.j + j };
      const cacheId = `cache_${cell.i}_${cell.j}`;
      visibleCacheIds.add(cacheId);

      if (cacheState.has(cacheId)) {
        const restoredCache = restoreCache(cacheId);
        if (restoredCache) cacheLocations.push(restoredCache);
      } else {
        const newCache = generateCache(cell);
        if (newCache) cacheLocations.push(newCache);
      }
    }
  }

  updateCacheMarkers(visibleCacheIds);
};

const updateCacheMarkers = (visibleCacheIds: Set<string>): void => {
  map.eachLayer((layer: L.Layer) => {
    if (layer instanceof L.Marker && (layer.options as any).cacheId) {
      const cacheId = (layer.options as any).cacheId;
      if (!visibleCacheIds.has(cacheId)) map.removeLayer(layer);
    }
  });

  cacheLocations.forEach((cache) => {
    const marker = L.marker([cache.location.lat, cache.location.lng], {
      cacheId: cache.id,
    }).addTo(map);

    const getPopupContent = () => `
      <b>Cache at (${cache.location.lat.toFixed(5)}, ${cache.location.lng.toFixed(5)})</b><br>
      Coins: ${cache.coins.map((coin) => coin.id).join(", ") || "(empty)"}<br>
      <div>
        <button id="collect-btn-${cache.id}" class="popup-btn">Collect Coins</button>
        <button id="deposit-btn-${cache.id}" class="popup-btn">Deposit Coins</button>
      </div>
    `;

    marker.bindPopup(getPopupContent());

    marker.on("popupopen", () => {
      const collectBtn = document.getElementById(`collect-btn-${cache.id}`);
      const depositBtn = document.getElementById(`deposit-btn-${cache.id}`);

      collectBtn?.addEventListener("click", () => {
        collectCoins(cache.id);
        marker.setPopupContent(getPopupContent());
      });

      depositBtn?.addEventListener("click", () => {
        depositCoins(cache.id);
        marker.setPopupContent(getPopupContent());
      });
    });
  });
};

const collectCoins = (cacheId: string): void => {
  const cache = cacheLocations.find((c) => c.id === cacheId);
  if (!cache || cache.coins.length === 0) return alert("No coins to collect!");
  player.collectCoin(cache.coins.pop()!, cache.id);
  cacheState.set(cache.id, cache.toMomento());
  renderPlayerInventory();
};

const depositCoins = (cacheId: string): void => {
  const cache = cacheLocations.find((c) => c.id === cacheId);
  if (!cache || player.coins.length === 0) return alert("No coins to deposit!");
  player.depositCoin(cache);
  cacheState.set(cache.id, cache.toMomento());
  renderPlayerInventory();
};

const renderPlayerInventory = (): void => {
  const inventoryElement = document.getElementById("inventory");
  if (!inventoryElement) return;
  inventoryElement.innerHTML = `Inventory: ${
    player.coins.length ? player.coins.map((coin) => coin.id).join(", ") : "(empty)"
  }`;
};

const renderButtons = (): void => {
  const directions = ["north", "south", "west", "east"];
  const buttonsContainer = document.createElement("div");

  directions.forEach((dir, idx) => {
    const btn = document.createElement("button");
    btn.textContent = ["⬆️", "⬇️", "⬅️", "➡️"][idx];
    btn.onclick = () => {
      player.move(dir);
      map.setView([player.position.lat, player.position.lng]);
      playerMarker.setLatLng([player.position.lat, player.position.lng]);
      updateVisibleCaches();
      renderPlayerInventory();
    };
    buttonsContainer.appendChild(btn);
  });

  document.getElementById("ui-container")?.appendChild(buttonsContainer);
};

// Geolocation function to update player position
function enableGeolocationTracking() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        player.position = { lat, lng };
        playerMarker.setLatLng([lat, lng]);
        updateVisibleCaches();
        renderPlayerInventory();
      },
      (error) => {
        console.error("Error occurred while retrieving geolocation:", error);
      },
      { enableHighAccuracy: true }
    );
  } else {
    console.warn("Geolocation is not supported by this browser.");
  }
}

function renderGeolocationButton() {
  const geolocationButton = document.createElement("button");
  geolocationButton.innerText = "🌐";
  geolocationButton.onclick = enableGeolocationTracking;
  document.body.appendChild(geolocationButton);
}

document.addEventListener("DOMContentLoaded", () => {
  const uiContainer = document.createElement("div");
  uiContainer.id = "ui-container";
  document.body.appendChild(uiContainer);

  const inventoryElement = document.createElement("div");
  inventoryElement.id = "inventory";
  document.body.appendChild(inventoryElement);

  renderButtons();
  renderPlayerInventory();
  renderGeolocationButton();
  updateVisibleCaches();
});
