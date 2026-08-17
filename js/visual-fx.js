/**
 * Visual Effects, Canvas Starfield & Particle Systems
 * Delivers premium sci-fi aesthetics, dynamic click particle feedback, and floating numbers.
 */

class VisualFX {
    constructor() {
        this.starCanvas = null;
        this.starCtx = null;
        this.reactorCanvas = null;
        this.reactorCtx = null;
        this.stars = [];
        this.particles = [];
        this.floatingTexts = [];
        this.animFrameId = null;
        this.lastTime = performance.now();
        this.reactorAngle = 0;
        this.reactorPulse = 0;
        this.isClicking = false;
        this.lowPerformanceMode = false;
    }

    init() {
        this.initStarfield();
        this.initReactorCanvas();
        this.initEventListeners();
        this.startLoop();
    }

    initStarfield() {
        this.starCanvas = document.getElementById('starfield-canvas');
        if (!this.starCanvas) return;
        this.starCtx = this.starCanvas.getContext('2d');
        this.resizeStarfield();

        // Create initial stars
        const count = this.lowPerformanceMode ? 60 : 180;
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.starCanvas.width,
                y: Math.random() * this.starCanvas.height,
                radius: Math.random() * 1.5 + 0.5,
                color: this.getRandomStarColor(),
                speed: Math.random() * 0.3 + 0.05,
                alpha: Math.random() * 0.8 + 0.2,
                pulseSpeed: Math.random() * 0.02 + 0.005
            });
        }
    }

    getRandomStarColor() {
        const colors = [
            'rgba(0, 242, 254, ',   // cyan
            'rgba(79, 172, 254, ',  // blue
            'rgba(168, 85, 247, ',  // purple
            'rgba(236, 72, 153, ',  // pink
            'rgba(255, 255, 255, '  // white
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    resizeStarfield() {
        if (!this.starCanvas) return;
        this.starCanvas.width = window.innerWidth;
        this.starCanvas.height = window.innerHeight;
    }

    initReactorCanvas() {
        this.reactorCanvas = document.getElementById('reactor-canvas');
        if (!this.reactorCanvas) return;
        this.reactorCtx = this.reactorCanvas.getContext('2d');
        this.resizeReactor();
    }

    resizeReactor() {
        if (!this.reactorCanvas) return;
        const rect = this.reactorCanvas.getBoundingClientRect();
        this.reactorCanvas.width = rect.width * window.devicePixelRatio || 300;
        this.reactorCanvas.height = rect.height * window.devicePixelRatio || 300;
    }

    initEventListeners() {
        window.addEventListener('resize', () => {
            this.resizeStarfield();
            this.resizeReactor();
        });
    }

    startLoop() {
        const loop = (currentTime) => {
            const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
            this.lastTime = currentTime;

            this.update(dt);
            this.render();

            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }

    update(dt) {
        // Update stars
        if (this.starCanvas) {
            for (let star of this.stars) {
                star.y += star.speed * 60 * dt;
                if (star.y > this.starCanvas.height) {
                    star.y = 0;
                    star.x = Math.random() * this.starCanvas.width;
                }
                star.alpha += Math.sin(performance.now() * star.pulseSpeed) * 0.005;
                star.alpha = Math.max(0.15, Math.min(0.9, star.alpha));
            }
        }

        // Update reactor state
        this.reactorAngle += dt * 0.8;
        if (this.reactorPulse > 0) {
            this.reactorPulse = Math.max(0, this.reactorPulse - dt * 4);
        }

        // Update click particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vy += (p.gravity || 0) * dt * 60;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.alpha -= dt / p.lifetime;
            p.scale = Math.max(0, p.scale - dt * 0.5);

            if (p.alpha <= 0 || p.scale <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * dt * 60;
            ft.x += ft.vx * dt * 60;
            ft.vy *= 0.96;
            ft.alpha -= dt / ft.lifetime;

            if (ft.alpha <= 0) {
                if (ft.element && ft.element.parentNode) {
                    ft.element.parentNode.removeChild(ft.element);
                }
                this.floatingTexts.splice(i, 1);
            } else if (ft.element) {
                ft.element.style.transform = `translate(${ft.x}px, ${ft.y}px) scale(${ft.scale})`;
                ft.element.style.opacity = ft.alpha;
            }
        }
    }

    render() {
        this.renderStarfield();
        this.renderReactor();
    }

    renderStarfield() {
        if (!this.starCtx || !this.starCanvas) return;
        const ctx = this.starCtx;
        const w = this.starCanvas.width;
        const h = this.starCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Subtle dynamic cosmic ambient gradient
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 50, w * 0.5, h * 0.5, w * 0.8);
        grad.addColorStop(0, 'rgba(18, 24, 54, 0.4)');
        grad.addColorStop(0.5, 'rgba(10, 14, 34, 0.7)');
        grad.addColorStop(1, 'rgba(4, 7, 20, 0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Draw stars
        for (let star of this.stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = star.color + star.alpha + ')';
            ctx.fill();
        }

        // Render particles on background if in full screen mode
        if (this.particles.length > 0) {
            for (let p of this.particles) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * p.scale, 0, Math.PI * 2);
                ctx.fillStyle = p.color + p.alpha + ')';
                ctx.shadowColor = p.glowColor || '#00f2fe';
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.restore();
            }
        }
    }

    renderReactor() {
        if (!this.reactorCtx || !this.reactorCanvas) return;
        const ctx = this.reactorCtx;
        const w = this.reactorCanvas.width;
        const h = this.reactorCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const baseR = Math.min(w, h) * 0.28;
        const pulseR = baseR * (1 + this.reactorPulse * 0.15);

        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.translate(cx, cy);

        // Outer Rotating Orbit Ring 1
        ctx.save();
        ctx.rotate(this.reactorAngle);
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.35, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
        ctx.setLineDash([15, 10, 5, 10]);
        ctx.stroke();

        // Orbit nodes
        for (let i = 0; i < 3; i++) {
            const nodeAngle = (i * Math.PI * 2) / 3;
            const nx = Math.cos(nodeAngle) * (baseR * 1.35);
            const ny = Math.sin(nodeAngle) * (baseR * 1.35);
            ctx.beginPath();
            ctx.arc(nx, ny, 4 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
            ctx.fillStyle = '#00f2fe';
            ctx.shadowColor = '#00f2fe';
            ctx.shadowBlur = 10;
            ctx.fill();
        }
        ctx.restore();

        // Counter-rotating Ring 2
        ctx.save();
        ctx.rotate(-this.reactorAngle * 1.4);
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.15, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.lineWidth = 1.5 * (window.devicePixelRatio || 1);
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.restore();

        // Core Glowing Plasma Sphere
        const coreGrad = ctx.createRadialGradient(0, 0, pulseR * 0.1, 0, 0, pulseR);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#00f2fe');
        coreGrad.addColorStop(0.7, '#4facfe');
        coreGrad.addColorStop(0.9, '#a855f7');
        coreGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.beginPath();
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 30 + this.reactorPulse * 30;
        ctx.fill();

        // Inner bright spark
        ctx.beginPath();
        ctx.arc(0, 0, pulseR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Trigger click pulse animation and particle explosion
     */
    triggerClickFX(clientX, clientY, textFormatted) {
        this.reactorPulse = 1.0;

        // Particle burst
        const particleCount = this.lowPerformanceMode ? 8 : 16;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 3;
            this.particles.push({
                x: clientX,
                y: clientY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 2,
                scale: 1.0,
                alpha: 1.0,
                lifetime: Math.random() * 0.4 + 0.4,
                color: 'rgba(0, 242, 254, ',
                glowColor: '#00f2fe'
            });
        }

        // Floating dynamic text
        if (textFormatted) {
            this.spawnFloatingText(clientX, clientY, textFormatted);
        }
    }

    spawnFloatingText(clientX, clientY, text) {
        const container = document.getElementById('floating-container');
        if (!container) return;

        const el = document.createElement('div');
        el.className = 'floating-coin-text';
        el.textContent = '+' + text;
        container.appendChild(el);

        const offsetX = (Math.random() - 0.5) * 40;
        const initialX = clientX + offsetX;
        const initialY = clientY - 20;

        el.style.transform = `translate(${initialX}px, ${initialY}px) scale(1)`;

        this.floatingTexts.push({
            element: el,
            x: initialX,
            y: initialY,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -(Math.random() * 2.5 + 2.5),
            alpha: 1.0,
            scale: 1.1,
            lifetime: 0.85
        });
    }

    /**
     * Trigger confetti/milestone burst for achievements or round numbers
     */
    triggerMilestoneBurst(cx, cy, color = '#f59e0b') {
        const count = 30;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 4;
            this.particles.push({
                x: cx || window.innerWidth / 2,
                y: cy || window.innerHeight / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                gravity: 0.15,
                radius: Math.random() * 4 + 2,
                scale: 1.2,
                alpha: 1.0,
                lifetime: 1.2,
                color: 'rgba(245, 158, 11, ',
                glowColor: color
            });
        }
    }

    /**
     * Show animated toast notification (Achievement / Milestone)
     */
    showToast(title, message, icon = '🏆') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'cosmic-toast';
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-desc">${message}</div>
            </div>
        `;
        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('toast-active');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('toast-active');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 400);
        }, 4000);
    }
}

if (typeof window !== 'undefined') {
    window.VisualFX = VisualFX;
}
