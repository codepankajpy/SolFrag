/**
 * Loading screen with progress tracking
 */
export class LoadingScreen {
  private container: HTMLDivElement;
  private progressBar: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private statusText: HTMLDivElement;
  private percentText: HTMLDivElement;
  private totalSteps = 0;
  private currentStep = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'loading-screen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Arial', sans-serif;
    `;

    // Game title
    const title = document.createElement('h1');
    title.textContent = 'FPS GAME';
    title.style.cssText = `
      color: #fff;
      font-size: 48px;
      margin-bottom: 40px;
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
      letter-spacing: 8px;
    `;
    this.container.appendChild(title);

    // Progress bar container
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      width: 400px;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `;

    // Progress fill
    this.progressFill = document.createElement('div');
    this.progressFill.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #00d4ff 0%, #0099ff 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    `;
    this.progressBar.appendChild(this.progressFill);
    this.container.appendChild(this.progressBar);

    // Percent text
    this.percentText = document.createElement('div');
    this.percentText.style.cssText = `
      color: #00d4ff;
      font-size: 24px;
      margin-bottom: 10px;
      font-weight: bold;
    `;
    this.percentText.textContent = '0%';
    this.container.appendChild(this.percentText);

    // Status text
    this.statusText = document.createElement('div');
    this.statusText.style.cssText = `
      color: rgba(255, 255, 255, 0.7);
      font-size: 16px;
      margin-top: 10px;
      min-height: 24px;
    `;
    this.statusText.textContent = 'Initializing...';
    this.container.appendChild(this.statusText);

    document.body.appendChild(this.container);
  }

  /**
   * Set total number of loading steps
   */
  public setTotalSteps(total: number): void {
    this.totalSteps = total;
    this.currentStep = 0;
  }

  /**
   * Update loading progress with status message
   */
  public updateProgress(message: string): void {
    this.currentStep++;
    const percent = Math.round((this.currentStep / this.totalSteps) * 100);
    
    this.progressFill.style.width = `${percent}%`;
    this.percentText.textContent = `${percent}%`;
    this.statusText.textContent = message;
  }

  /**
   * Set progress directly (0-100)
   */
  public setProgress(percent: number, message: string): void {
    this.progressFill.style.width = `${percent}%`;
    this.percentText.textContent = `${percent}%`;
    this.statusText.textContent = message;
  }

  /**
   * Hide loading screen with fade out
   */
  public hide(): void {
    this.container.style.transition = 'opacity 0.5s ease';
    this.container.style.opacity = '0';
    
    setTimeout(() => {
      this.container.remove();
    }, 500);
  }

  /**
   * Show loading screen
   */
  public show(): void {
    this.container.style.opacity = '1';
  }
}
