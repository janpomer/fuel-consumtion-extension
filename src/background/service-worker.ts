import { loadSettings, saveSettings } from '../lib/settings.js';

/**
 * Write the full, sanitised settings on install and update, so the popup and
 * options page open populated and any keys added in a new version get defaults.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  await saveSettings(await loadSettings());

  if (details.reason === 'install') {
    await chrome.runtime.openOptionsPage();
  }
});
