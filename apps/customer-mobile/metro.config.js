const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The pnpm virtual store lives outside the project root (C:\.pnpm-store) to
// keep native build paths under Windows' MAX_PATH. Metro must watch it to
// resolve modules like expo-router/entry that physically live there.
config.watchFolders = Array.from(
  new Set([
    ...(config.watchFolders ?? []),
    'C:/.pnpm-store',
  ]),
);

module.exports = config;
