// Service Worker registration and management
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator;

  private constructor() {}

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('Service Worker: Not supported in this browser');
      return false;
    }

    try {
      console.log('Service Worker: Registering...');
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('Service Worker: Registered successfully', this.registration);

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        console.log('Service Worker: Update found');
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Service Worker: New version available');
              this.showUpdateNotification();
            }
          });
        }
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker: Controller changed');
        window.location.reload();
      });

      return true;
    } catch (error) {
      console.error('Service Worker: Registration failed:', error);
      return false;
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker: Unregistered', result);
      this.registration = null;
      return result;
    } catch (error) {
      console.error('Service Worker: Unregistration failed:', error);
      return false;
    }
  }

  async update(): Promise<void> {
    if (!this.registration) {
      return;
    }

    try {
      await this.registration.update();
      console.log('Service Worker: Update requested');
    } catch (error) {
      console.error('Service Worker: Update failed:', error);
    }
  }

  private showUpdateNotification(): void {
    // Show a notification to the user about the update
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('SmrutiMap Update', {
        body: 'A new version is available. Click to update.',
        icon: '/favicon.ico',
        requireInteraction: true
      });
    }

    // Or show an in-app notification
    const event = new CustomEvent('sw-update-available');
    window.dispatchEvent(event);
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async sendMessage(message: any): Promise<void> {
    if (!this.registration?.active) {
      return;
    }

    try {
      await this.registration.active.postMessage(message);
    } catch (error) {
      console.error('Service Worker: Message sending failed:', error);
    }
  }

  isRegistered(): boolean {
    return this.registration !== null;
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }
}

// Global instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance();

// Auto-register service worker
if (typeof window !== 'undefined') {
  // Register on page load
  window.addEventListener('load', () => {
    serviceWorkerManager.register();
  });

  // Listen for update notifications
  window.addEventListener('sw-update-available', () => {
    // You can show a UI notification here
    console.log('Service Worker: Update available - show notification to user');
  });
} 