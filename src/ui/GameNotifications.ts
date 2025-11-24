/**
 * In-game notification system for player events
 */
export class GameNotifications {
  private container: HTMLDivElement;
  private notifications: HTMLDivElement[] = [];
  private maxNotifications = 5;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'game-notifications';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      z-index: 1000;
      pointer-events: none;
      font-family: 'Arial', sans-serif;
    `;
    
    document.body.appendChild(this.container);
  }

  /**
   * Show player joined notification
   */
  public showPlayerJoined(username: string): void {
    this.addNotification(username, 'joined', '#4CAF50');
  }

  /**
   * Show player left notification
   */
  public showPlayerLeft(username: string): void {
    this.addNotification(username, 'left', '#f44336');
  }

  private addNotification(username: string, action: string, color: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      border-left: 4px solid ${color};
      color: #fff;
      padding: 12px 16px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
      opacity: 0;
      transform: translateX(100%);
    `;

    notification.innerHTML = `
      <span style="color: ${color}; font-weight: bold;">${username}</span>
      <span style="color: rgba(255, 255, 255, 0.8);"> ${action}</span>
    `;

    // Add CSS animation
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `;
      document.head.appendChild(style);
    }

    this.container.appendChild(notification);
    this.notifications.push(notification);

    // Trigger animation
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Remove old notifications if exceeding max
    if (this.notifications.length > this.maxNotifications) {
      const oldNotification = this.notifications.shift();
      if (oldNotification) {
        this.removeNotification(oldNotification);
      }
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);
  }

  private removeNotification(notification: HTMLDivElement): void {
    notification.style.animation = 'fadeOut 0.3s ease';
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  }

  /**
   * Clear all notifications
   */
  public clear(): void {
    this.notifications.forEach(notif => notif.remove());
    this.notifications = [];
  }
}
