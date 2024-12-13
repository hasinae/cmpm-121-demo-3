# cmpm-121-demo-3

cmpm-121-demo-3: Geocaching Game
Overview
This game, built using TypeScript and Leaflet, simulates a geocaching adventure. Players can collect coins from caches scattered around a grid and deposit them into other caches. The game is centered on a dynamic map where the player's location and the nearby caches are displayed.

Key Features

D3.a Features
- The map shows caches distributed around the player's initial location.
- Each cache contains a set of coins that the player can either collect or deposit.
- Popups provide information about the player’s and cache locations on the map.

D3.b Features
- The game's grid system starts at the coordinates (0°N, 0°E).
- Each coin has a unique label indicating the cache and coin number (e.g., 369894:-1220627#0).
- The player’s inventory updates in real-time as coins are collected or deposited.

D3.c Features
- The player can move on the map using direction buttons: ⬆️⬇️⬅️➡️.
- As the player moves, the map and nearby caches are updated.
- The Memento pattern ensures the consistency of cache states as players move in and out of range.
- Player movement is restricted to a grid with a 0.0001-degree step size, ensuring the visibility of only nearby caches.

D3.d Features
- Automatic Position Updates: Players can enable automatic geolocation updates by pressing the 🌐 button, allowing the game to track their real-time movement.
- Persistent Data Storage: The game uses local storage to save the player's progress, allowing them to resume gameplay even after closing the browser.
- Movement History: The player's movement is tracked and displayed using a polyline, providing a visual representation of their journey.
- Reset Game State: Players can reset the game by pressing the 🚮 button. Before resetting, a confirmation prompt ensures the player intends to erase their progress and sensitive data.
- Coin Identifier Click: Clicking on a coin identifier centers the map on the location of the coin's home cache, even if it's far from the player's current position.

- ## Acknowledgments
This project benefited from collaboration and feedback from peers. Special thanks to:
- Samina [GitHub Repository](https://github.com/saminame/cmpm-121-demo-3) for advice. 
Their contributions significantly enhanced the game's functionality.

