/**
 * Home screen with click to play
 */
export class HomeScreen {
  private container: HTMLDivElement;
  private onPlayCallback?: (username: string) => void;
  private usernameInput?: HTMLInputElement;
  private walletAddress: string | null = null;
  private connectBtn?: HTMLButtonElement;
  private playBtn?: HTMLDivElement;
  private playerCounter = 1;
  private usedNumbers: Set<number> = new Set();

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'home-screen';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9000;
      font-family: 'Arial', sans-serif;
    `;

    // Game title
    const title = document.createElement('h1');
    title.textContent = 'FPS GAME';
    title.style.cssText = `
      color: #fff;
      font-size: 72px;
      margin-bottom: 20px;
      text-shadow: 0 0 30px rgba(255, 255, 255, 0.8),
                   0 0 60px rgba(0, 212, 255, 0.6);
      letter-spacing: 12px;
      animation: pulse 2s ease-in-out infinite;
    `;
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.textContent = 'First Person Shooter';
    subtitle.style.cssText = `
      color: rgba(255, 255, 255, 0.6);
      font-size: 20px;
      margin-bottom: 40px;
      letter-spacing: 4px;
      text-transform: uppercase;
    `;
    this.container.appendChild(subtitle);

    // Username input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      margin-bottom: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;

    const inputLabel = document.createElement('div');
    inputLabel.textContent = 'Enter Username (optional)';
    inputLabel.style.cssText = `
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      letter-spacing: 1px;
    `;
    inputContainer.appendChild(inputLabel);

    this.usernameInput = document.createElement('input');
    this.usernameInput.type = 'text';
    this.usernameInput.placeholder = 'Leave empty for auto-name';
    this.usernameInput.maxLength = 20;
    this.usernameInput.style.cssText = `
      width: 300px;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(0, 212, 255, 0.5);
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      text-align: center;
      outline: none;
      transition: all 0.3s ease;
    `;

    this.usernameInput.addEventListener('focus', () => {
      this.usernameInput!.style.background = 'rgba(255, 255, 255, 0.15)';
      this.usernameInput!.style.borderColor = '#00d4ff';
      this.usernameInput!.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.4)';
    });

    this.usernameInput.addEventListener('blur', () => {
      this.usernameInput!.style.background = 'rgba(255, 255, 255, 0.1)';
      this.usernameInput!.style.borderColor = 'rgba(0, 212, 255, 0.5)';
      this.usernameInput!.style.boxShadow = 'none';
    });

    inputContainer.appendChild(this.usernameInput);
    this.container.appendChild(inputContainer);

    // Wallet connect button
    this.connectBtn = document.createElement('button');
    this.connectBtn.textContent = 'Connect Wallet';
    this.connectBtn.style.cssText = `
      margin-bottom: 16px;
      color: #fff;
      font-size: 16px;
      padding: 12px 24px;
      border: 2px solid #00d4ff;
      border-radius: 8px;
      background: rgba(0, 212, 255, 0.2);
      cursor: pointer;
      transition: all 0.3s ease;
      letter-spacing: 1px;
      font-weight: 600;
      box-shadow: 0 0 16px rgba(0, 212, 255, 0.3);
    `;
    this.connectBtn.addEventListener('mouseenter', () => {
      if (!this.walletAddress) {
        this.connectBtn!.style.background = 'rgba(0, 212, 255, 0.35)';
      }
    });
    this.connectBtn.addEventListener('mouseleave', () => {
      if (!this.walletAddress) {
        this.connectBtn!.style.background = 'rgba(0, 212, 255, 0.2)';
      }
    });
    this.connectBtn.addEventListener('click', async () => {
      try {
        // Simple Phantom connect; later replace with Wallet Adapter if desired
        const provider = (window as any).solana;
        if (!provider || !provider.isPhantom) {
          alert('Please install Phantom Wallet');
          return;
        }
        const resp = await provider.connect();
        this.walletAddress = resp?.publicKey?.toString() || null;
        if (this.walletAddress) {
          const short = `${this.walletAddress.slice(0, 4)}...${this.walletAddress.slice(-4)}`;
          this.connectBtn!.textContent = `Connected: ${short}`;
          this.connectBtn!.style.background = 'rgba(0, 200, 0, 0.35)';
          this.connectBtn!.style.borderColor = 'rgba(0, 200, 0, 0.8)';
          // Enable play button once wallet connected
          if (this.playBtn) {
            this.playBtn.style.opacity = '1';
            (this.playBtn as any).disabled = false;
          }
        }
      } catch (e) {
        console.error('Wallet connect failed', e);
        alert('Failed to connect wallet');
      }
    });
    this.container.appendChild(this.connectBtn);

    // Click to play button
    this.playBtn = document.createElement('div');
    this.playBtn.textContent = 'CLICK TO PLAY';
    this.playBtn.style.cssText = `
      color: #fff;
      font-size: 28px;
      padding: 20px 50px;
      border: 3px solid #00d4ff;
      border-radius: 8px;
      background: rgba(0, 212, 255, 0.1);
      cursor: pointer;
      transition: all 0.3s ease;
      letter-spacing: 2px;
      font-weight: bold;
      box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
      animation: float 3s ease-in-out infinite;
      opacity: 0.5;
    `;

    // Hover effect
    this.playBtn.addEventListener('mouseenter', () => {
      if ((this.playBtn as any).disabled) return;
      this.playBtn!.style.background = 'rgba(0, 212, 255, 0.3)';
      this.playBtn!.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.6)';
      this.playBtn!.style.transform = 'scale(1.05)';
    });

    this.playBtn.addEventListener('mouseleave', () => {
      this.playBtn!.style.background = 'rgba(0, 212, 255, 0.1)';
      this.playBtn!.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
      this.playBtn!.style.transform = 'scale(1)';
    });

    // Disabled until wallet connects
    (this.playBtn as any).disabled = true;
    this.playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if ((this.playBtn as any).disabled) {
        alert('Please connect your wallet to play');
        return;
      }
      this.handlePlay();
    });

    this.container.appendChild(this.playBtn);

    // Controls info
    const controls = document.createElement('div');
    controls.style.cssText = `
      position: absolute;
      bottom: 40px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      text-align: center;
      line-height: 1.8;
    `;
    controls.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold; color: rgba(255, 255, 255, 0.7);">CONTROLS</div>
      WASD - Move | SPACE - Jump | MOUSE - Look | LEFT CLICK - Shoot
    `;
    this.container.appendChild(controls);

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.container);
  }

  private handlePlay(): void {
    let username = this.usernameInput?.value.trim() || '';
    
    // If no username provided, generate one
    if (!username) {
      username = this.walletAddress ? this.walletAddress : this.generateUsername();
    }
    
    if (this.onPlayCallback) {
      this.onPlayCallback(username);
    }
  }

  private generateUsername(): string {
    // Find next available player number
    let playerNumber = this.playerCounter;
    while (this.usedNumbers.has(playerNumber)) {
      playerNumber++;
    }
    this.usedNumbers.add(playerNumber);
    this.playerCounter = playerNumber + 1;
    return `Player ${playerNumber}`;
  }

  /**
   * Set callback for when play is clicked
   */
  public onPlay(callback: (username: string) => void): void {
    this.onPlayCallback = callback;
  }

  /**
   * Hide home screen with fade out
   */
  public hide(): void {
    this.container.style.transition = 'opacity 0.5s ease';
    this.container.style.opacity = '0';
    
    setTimeout(() => {
      this.container.remove();
    }, 500);
  }

  /**
   * Show home screen
   */
  public show(): void {
    this.container.style.opacity = '1';
    this.container.style.display = 'flex';
  }
}
