// Karma configuration for customer-web.
//
// When a custom `karmaConfig` is set, the Angular karma builder skips its
// built-in defaults — so frameworks/plugins must be declared here explicitly
// (the file also keeps the launcher + port settings the built-in used to add).
module.exports = function (config) {
  const { createRequire } = require('node:module');
  const workspaceRootRequire = createRequire(require('node:path').join(__dirname, 'package.json'));

  config.set({
    // Freebuff Desktop itself binds an ephemeral port in the 54xxx range on
    // this machine, which karma's auto-picked port can collide with — when
    // that happens the spawned Chrome navigates to the wrong server and never
    // captures. Pin an explicit, free port instead.
    port: 9876,
    frameworks: ['jasmine'],
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-jasmine-html-reporter',
      'karma-coverage',
    ].map((p) => workspaceRootRequire(p)),
    reporters: ['progress', 'kjhtml'],
    jasmineHtmlReporter: { suppressAll: true },
    customLaunchers: {
      // CI/container environments cannot launch Chrome with the SUID sandbox.
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--headless=new',
          '--no-proxy-server',
          '--proxy-bypass-list=*',
        ],
      },
    },
  });
};
