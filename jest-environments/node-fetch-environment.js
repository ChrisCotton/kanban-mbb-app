const JSDOMEnvironment = require('jest-environment-jsdom').default;
const fetch = require('node-fetch');

class CustomJSDOMEnvironment extends JSDOMEnvironment {
  async setup() {
    await super.setup();
    // Directly assign fetch and related globals
    global.fetch = fetch;
    global.Headers = fetch.Headers;
    global.Request = fetch.Request;
    global.Response = fetch.Response;
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = CustomJSDOMEnvironment;