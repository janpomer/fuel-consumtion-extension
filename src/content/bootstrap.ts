/**
 * Content scripts declared in the manifest are classic scripts, so they cannot
 * use static `import`. Dynamic `import()` of a web-accessible module runs in
 * the same isolated world and keeps the rest of the code as normal ES modules.
 */
void (async () => {
  try {
    const module: typeof import('./main.js') = await import(
      chrome.runtime.getURL('content/main.js')
    );
    await module.init();
  } catch (error) {
    console.warn('[fuel-consumption] failed to start:', error);
  }
})();
