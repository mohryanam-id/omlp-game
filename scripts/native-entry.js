import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
if (Capacitor.isNativePlatform()) {
  App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) window.dispatchEvent(new Event('pony:pause'));
  });
  App.addListener('backButton', () => {
    const event = new Event('pony:back', { cancelable: true });
    if (window.dispatchEvent(event)) App.minimizeApp();
  });
}
