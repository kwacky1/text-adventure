module.exports = {
  testEnvironment: "jsdom",
  setupFiles: ["./test/jest.setup.js"],
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  }
};