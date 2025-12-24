// Only import in dev mode to avoid bundling in production
let composeWithDevTools = f => f;
if (__DEV__) {
  try {
    composeWithDevTools = require('redux-devtools-extension').composeWithDevTools;
  } catch (e) {
    // DevTools not installed, fallback to identity
  }
}
export default composeWithDevTools;
