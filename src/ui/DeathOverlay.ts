export class DeathOverlay {
  private container: HTMLDivElement;
  private messageEl: HTMLDivElement;
  private countdownEl: HTMLDivElement;
  private intervalId: number | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'death-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      pointer-events: none;
      flex-direction: column;
      font-family: Arial, sans-serif;
      color: #fff;
    `;

    this.messageEl = document.createElement('div');
    this.messageEl.style.cssText = `
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 12px;
      text-align: center;
    `;
    this.messageEl.textContent = 'You are dead';

    this.countdownEl = document.createElement('div');
    this.countdownEl.style.cssText = `
      font-size: 28px;
      opacity: 0.95;
    `;

    this.container.appendChild(this.messageEl);
    this.container.appendChild(this.countdownEl);
    this.container.style.display = 'none';

    // Use a flex container so we can center
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;width:100%';
    wrapper.appendChild(this.container);
    document.body.appendChild(wrapper);
  }

  public showCountdown(ms: number): void {
    // Avoid restarting the countdown if it's already visible
    if (this.container.style.display === 'flex' && this.intervalId) return;

    const seconds = Math.ceil(ms / 1000);
    let remaining = seconds;
    this.container.style.display = 'flex';
    this.countdownEl.textContent = `Respawning in ${remaining}`;

    this.intervalId = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        // Don't hide - wait for server to respawn (game_state will trigger hide)
        this.countdownEl.textContent = 'Respawning...';
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        return;
      }
      this.countdownEl.textContent = `Respawning in ${remaining}`;
    }, 1000);
  }

  public hide(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.container.style.display = 'none';
  }
}
