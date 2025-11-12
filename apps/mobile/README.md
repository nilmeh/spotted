Mobile App (React Native, Expo)
===============================

Bootstrap the mobile app:
-------------------------
Run:

1) `npx create-expo-app apps/mobile`
   - Typescript: Yes
   - Use npm or yarn as you prefer

2) `cd apps/mobile && npm start` (or `npx expo start`)

Recommended libs
----------------
- `react-native-gesture-handler` (swipes)
- `react-native-reanimated` (card animations)
- `expo-location` (location radius and privacy controls)
- Optional: `expo-router` for routing

UI guidance
-----------
- Unified feed with toggle for Events/People (persist last selection)
- Single card component with `event` and `person` variants
- Swipe semantics: Right = Save/Connect, Left = Pass, Up = Details
- Details shown in a modal/sheet; avoid full navigation mid-swipe

Next steps
----------
- Add screens: Feed, Filters, Saved (events), Connections
- Wire API base URL via `.env` support (e.g., `@env` or expo config)
