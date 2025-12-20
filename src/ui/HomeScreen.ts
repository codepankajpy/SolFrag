/**
 * Home screen with click to play
 */
export class HomeScreen {
  private container: HTMLDivElement;
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D | null;
  private particles: Array<any> = [];
  private particleImg?: HTMLImageElement;
  private animId?: number;
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
    // apply themed styles via injected stylesheet (keeps DOM/styles separate)
    const hsStyle = document.createElement('style');
    hsStyle.textContent = `
      @import url("https://fonts.cdnfonts.com/css/ethnocentric");
      #home-screen { position: fixed; inset: 0; display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:9000; background: #0a0a0a; font-family: Inter, system-ui, sans-serif; }
      #home-screen .hs-title { font-family: 'Ethnocentric', Inter, sans-serif; color:#fff; font-size:72px; margin-bottom:20px; text-shadow: 0 12px 40px rgba(249,115,22,0.14); letter-spacing: 10px; }
      #home-screen .hs-sub { color: rgba(255,255,255,0.6); font-size:20px; margin-bottom:40px; letter-spacing:4px; text-transform:uppercase; }
      #home-screen input.hs-input { width:300px; padding:12px 20px; background: rgba(255,255,255,0.03); border: 2px solid rgba(249,115,22,0.18); border-radius:8px; color:#fff; font-size:16px; text-align:center; transition: all 0.25s ease; }
      #home-screen .hs-connect { margin-bottom: 16px; color:#000; font-size:16px; padding:12px 24px; border: none; border-radius:8px; background: linear-gradient(90deg,#ffb069 0%,#f97316 60%); cursor:pointer; transition: all 0.2s ease; font-weight:700; box-shadow: 0 8px 30px rgba(249,115,22,0.18); }
      #home-screen .hs-connect[connected] { background: linear-gradient(90deg,#6ee7b7, #10b981); border-color: rgba(16,185,129,0.8); }
      #home-screen .hs-play { color:#fff; font-size:28px; padding:20px 50px; border: 3px solid rgba(249,115,22,0.22); border-radius:8px; background: rgba(249,115,22,0.06); cursor:pointer; transition: all 0.3s ease; letter-spacing:2px; font-weight:800; box-shadow: 0 10px 40px rgba(249,115,22,0.12); animation: float 3s ease-in-out infinite; opacity:0.5; }
      #home-screen .hs-play.enabled { opacity:1; }
      #home-screen .hs-controls { position: absolute; bottom:40px; color: rgba(255,255,255,0.5); font-size:14px; text-align:center; line-height:1.8; }
      /* ambient radial glows like landing page */
      #home-screen { background-image: radial-gradient(circle at 50% 20%, rgba(249,115,22,0.06) 0, transparent 30%), radial-gradient(circle at 10% 80%, rgba(249,115,22,0.03) 0, transparent 40%); background-blend-mode: screen; }
      @keyframes float { 0%,100%{transform:translateY(0px);}50%{transform:translateY(-8px);} }
    `;
    document.head.appendChild(hsStyle);

    this.container.style.cssText = `position: fixed; inset: 0;`;

    // particle canvas (behind UI)
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hs-particles-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.zIndex = '-1';
    this.canvas.style.pointerEvents = 'none';
    this.ctx = this.canvas.getContext('2d');

    // preload particle image
    this.particleImg = new Image();
    this.particleImg.src = '/textures/fire.png';
    this.particleImg.onload = () => {
      // start when image ready if shown
      if (this.container.isConnected) this.startParticles();
    };

    // attach canvas to container so it stays behind interactive elements
    if (this.canvas) this.container.appendChild(this.canvas);

    // Game title
    const title = document.createElement('h1');
    title.textContent = 'SolFrag';
    title.className = 'hs-title';
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.textContent = 'First Person Shooter';
    subtitle.className = 'hs-sub';
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
    this.usernameInput.className = 'hs-input';

    this.usernameInput.addEventListener('focus', () => {
      this.usernameInput!.style.background = 'rgba(255, 255, 255, 0.06)';
      this.usernameInput!.style.borderColor = 'rgba(249,115,22,0.4)';
      this.usernameInput!.style.boxShadow = '0 0 20px rgba(249,115,22,0.14)';
    });

    this.usernameInput.addEventListener('blur', () => {
      this.usernameInput!.style.background = 'rgba(255, 255, 255, 0.03)';
      this.usernameInput!.style.borderColor = 'rgba(249,115,22,0.18)';
      this.usernameInput!.style.boxShadow = 'none';
    });

    inputContainer.appendChild(this.usernameInput);
    this.container.appendChild(inputContainer);

    // Wallet connect button (themed)
    this.connectBtn = document.createElement('button');
    this.connectBtn.textContent = 'Connect Wallet';
    this.connectBtn.className = 'hs-connect';
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
          this.connectBtn!.setAttribute('connected', 'true');
          // Enable play button once wallet connected
          if (this.playBtn) {
            this.playBtn.classList.add('enabled');
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
    this.playBtn.className = 'hs-play';

    // Hover effect
    this.playBtn.addEventListener('mouseenter', () => {
      if ((this.playBtn as any).disabled) return;
      this.playBtn!.style.transform = 'scale(1.05)';
      this.playBtn!.style.boxShadow = '0 18px 50px rgba(249,115,22,0.18)';
    });

    this.playBtn.addEventListener('mouseleave', () => {
      this.playBtn!.style.transform = 'scale(1)';
      this.playBtn!.style.boxShadow = '0 10px 40px rgba(249,115,22,0.12)';
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
    controls.className = 'hs-controls';
    controls.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold; color: rgba(255, 255, 255, 0.7);">CONTROLS</div>
      WASD - Move | SPACE - Jump | MOUSE - Look | LEFT CLICK - Shoot
    `;
    this.container.appendChild(controls);

    // Styles injected earlier (hsStyle) include needed animations
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
    this.stopParticles();

    setTimeout(() => {
      this.container.remove();
    }, 500);
  }

  /**
   * Show home screen
   */
  public show(): void {
    if (!this.container.isConnected) document.body.appendChild(this.container);
    this.container.style.opacity = '1';
    this.container.style.display = 'flex';
    // ensure canvas size and start particles
    this.resizeCanvas();
    if (!this.animId && this.particleImg && this.particleImg.complete) this.startParticles();
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.scale(dpr, dpr);
  }

  private startParticles(): void {
    if (!this.canvas || !this.ctx || this.animId) return;
    this.resizeCanvas();
    const count = 40;
    this.particles = [];
    for (let i = 0; i < count; i++) this.spawnParticle(true);

    const loop = () => {
      this.updateParticles();
      this.animId = window.requestAnimationFrame(loop);
    };
    this.animId = window.requestAnimationFrame(loop);

    window.addEventListener('resize', this.resizeHandler);
  }

  private stopParticles(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = undefined;
    }
    window.removeEventListener('resize', this.resizeHandler);
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.particles = [];
  }

  private resizeHandler = () => this.resizeCanvas();

  private spawnParticle(initial = false): void {
    if (!this.canvas) return;
    const w = this.container.getBoundingClientRect().width;
    const h = this.container.getBoundingClientRect().height;
    const x = Math.random() * w;
    const y = initial ? Math.random() * h : h + 20;
    const vx = (Math.random() - 0.5) * 0.12;
    const vy = - (0.05 + Math.random() * 0.15);
    const size = 4 + Math.random() * 8;
    const isLong = Math.random() < 0.18;
    const life = isLong ? (4 + Math.random() * 4) : (1.2 + Math.random() * 1.6);
    this.particles.push({ x, y, vx, vy, size, life, age: 0, rot: Math.random() * Math.PI * 2, omega: (Math.random() - 0.5) * 0.02 });
  }

  private updateParticles(): void {
    if (!this.ctx || !this.canvas || !this.particleImg) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * 30;
      p.y += p.vy * 30;
      p.vx *= 0.995;
      p.vy -= 0.0015;
      p.age += 1/60;
      p.rot += p.omega;
      const t = p.age / p.life;
      const alpha = Math.max(0, 1 - t);
      const drawX = p.x;
      const drawY = p.y;
      const size = p.size;

      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.translate(drawX, drawY);
      ctx.rotate(p.rot);
      ctx.drawImage(this.particleImg, -size/2, -size/2, size, size);
      ctx.restore();

      if (p.y + p.size < -50 || p.age > p.life) {
        this.particles.splice(i, 1);
        this.spawnParticle(false);
      }
    }
  }
}
