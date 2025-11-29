export class HealthUI {
  private container: HTMLDivElement;
  private healthEl: HTMLDivElement;
  private respawnEl: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'health-ui';
    this.container.style.cssText = `
      position: fixed;
      left: 20px;
      bottom: 20px;
      z-index: 1000;
      font-family: Arial, sans-serif;
      color: #fff;
      pointer-events: none;
    `;

    this.healthEl = document.createElement('div');
    this.healthEl.style.cssText = `
      background: rgba(0,0,0,0.6);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 18px;
      font-weight: bold;
      min-width: 100px;
    `;
    this.healthEl.textContent = 'Health: 100';

    this.respawnEl = document.createElement('div');
    this.respawnEl.style.cssText = `
      margin-top: 6px;
      font-size: 14px;
      opacity: 0.95;
    `;
    this.respawnEl.textContent = '';

    this.container.appendChild(this.healthEl);
    this.container.appendChild(this.respawnEl);
    document.body.appendChild(this.container);
  }

  public setHealth(value: number): void {
    this.healthEl.textContent = `Health: ${value}`;
  }

  public showRespawnCountdown(msRemaining: number): void {
    const seconds = Math.ceil(msRemaining / 1000);
    this.respawnEl.textContent = `Respawning in ${seconds}...`;
  }

  public clearRespawn(): void {
    this.respawnEl.textContent = '';
  }
}
