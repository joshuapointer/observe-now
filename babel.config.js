module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "@tamagui/babel-plugin",
        {
          components: ["tamagui"],
          config: "./tamagui.config.ts",
          logTimings: false,
          // Flatten styled components into plain views in release builds; keep dev reloads quick.
          disableExtraction: process.env.NODE_ENV === "development",
        },
      ],
    ],
  };
};
