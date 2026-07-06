import React, { useEffect, useRef, useState } from 'react';

interface WordParticle {
  id: string;
  x: number;
  y: number;
  word: string;
  translation: string;
  speed: number;
  size: number;
  opacity: number;
  maxOpacity: number;
  color: string;
  spawnedByClick: boolean;
  glitchTimer: number;
  offsetX: number;
  offsetY: number;
  glitchChar: string;
  flickerOpacity: number;
}

const CHINESE_VCS_WORDS = [
  { word: 'JSON 错误', translation: 'json error' },
  { word: '应用错误', translation: 'app error' },
  { word: '语法错误', translation: 'syntax error' },
  { word: '网络异常', translation: 'network error' },
  { word: '未定义', translation: 'undefined' },
  { word: '崩溃', translation: 'crash' },
  { word: '编译失败', translation: 'compilation failed' },
  { word: '空指针', translation: 'null pointer' },
  { word: '拒绝访问', translation: 'access denied' },
  { word: '连接超时', translation: 'connection timeout' },
  { word: '内存泄漏', translation: 'memory leak' },
  { word: '合并冲突', translation: 'merge conflict' },
  { word: '无限循环', translation: 'infinite loop' },
  { word: '程序漏洞', translation: 'system bug' },
  { word: '文件未找到', translation: 'file not found' },
  { word: '无效令牌', translation: 'invalid token' },
  { word: '栈溢出', translation: 'stack overflow' },
  { word: '核心错误', translation: 'core error' },
  { word: '系统异常', translation: 'system exception' },
  { word: '代码异常', translation: 'code error' }
];

interface GitChineseBackdropProps {
  isDarkMode?: boolean;
}

export const GitChineseBackdrop: React.FC<GitChineseBackdropProps> = ({ isDarkMode = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<WordParticle[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Detect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;

    // Handle fluid resizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = Math.floor(entry.contentRect.width);
        height = Math.floor(entry.contentRect.height);
        canvas.width = width;
        canvas.height = height;
      }
    });
    resizeObserver.observe(container);

    // Seed continuous base particles (increased count for more numerous words)
    const baseCount = Math.min(28, Math.max(14, Math.floor(width / 60)));
    const particles: WordParticle[] = [];

    const createParticle = (fromLeft = false, clickX?: number, clickY?: number): WordParticle => {
      const item = CHINESE_VCS_WORDS[Math.floor(Math.random() * CHINESE_VCS_WORDS.length)];
      const size = 22 + Math.random() * 26; // Larger font size range: 22px to 48px
      const maxOpacity = clickX !== undefined 
        ? (isDarkMode ? 0.95 : 0.9) 
        : (isDarkMode ? 0.75 : 0.68); // Even darker/more opaque default presence

      let x = fromLeft ? -100 : Math.random() * (width + 100) - 50;
      let y = Math.random() * (height - 60) + 30;

      if (clickX !== undefined && clickY !== undefined) {
        x = clickX + (Math.random() * 40 - 20);
        y = clickY + (Math.random() * 40 - 20);
      }

      // Determine colors based on themes and click statuses
      let color = '';
      if (isDarkMode) {
        // Dark theme: glows with rich solid amber / gold / emerald
        color = clickX !== undefined
          ? (Math.random() > 0.5 ? '251, 191, 36' : '52, 211, 153') // Bright gold vs bright emerald on click
          : '245, 158, 11'; // Warm amber default
      } else {
        // Light theme: absolute pitch black ink / ultra-rich crimson
        color = clickX !== undefined
          ? '153, 27, 27' // Rich deep crimson red on click
          : (Math.random() > 0.75 ? '153, 27, 27' : '0, 0, 0'); // Elegant deep crimson vs absolute black ink
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        x,
        y,
        word: item.word,
        translation: item.translation,
        speed: (1.2 + Math.random() * 2.2) * (clickX !== undefined ? 1.4 : 1.0), // significantly faster left-to-right sweep
        size,
        opacity: clickX !== undefined ? 0.25 : Math.random() * (maxOpacity - 0.2) + 0.2, // higher starting opacity
        maxOpacity,
        color,
        spawnedByClick: clickX !== undefined,
        glitchTimer: 0,
        offsetX: 0,
        offsetY: 0,
        glitchChar: '',
        flickerOpacity: 1
      };
    };

    // Pre-populate particles spread out on screen
    for (let i = 0; i < baseCount; i++) {
      particles.push(createParticle(false));
    }
    particlesRef.current = particles;

    let animationFrameId = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background text stream
      particlesRef.current.forEach((p, idx) => {
        // Very slow drifting movement
        if (!reducedMotion) {
          p.x += p.speed;
        }

        // Handle glitch timer states
        if (p.glitchTimer > 0) {
          p.glitchTimer--;
          if (p.glitchTimer === 0) {
            // Reset glitch values
            p.offsetX = 0;
            p.offsetY = 0;
            p.glitchChar = '';
            p.flickerOpacity = 1;
          } else {
            // Maintain dynamic jitter during an active glitch
            if (Math.random() < 0.4) {
              p.offsetX = Math.random() * 30 - 15;
              p.offsetY = Math.random() * 10 - 5;
              p.flickerOpacity = Math.random() > 0.3 ? Math.random() * 0.4 + 0.6 : 0;
            }
          }
        } else {
          // Occasional random triggering of a glitch event (approx 1.5% chance per frame)
          if (!reducedMotion && Math.random() < 0.015) {
            p.glitchTimer = Math.floor(Math.random() * 12) + 4; // active for 4-16 frames
            p.offsetX = Math.random() * 40 - 20;
            p.offsetY = Math.random() * 14 - 7;
            p.flickerOpacity = Math.random() > 0.25 ? Math.random() * 0.5 + 0.5 : 0;
            
            // Randomly corrupt the string slightly
            if (Math.random() < 0.5) {
              const symbols = ['_', '01', '✕', '■', 'Ø', '⚠', '[ERR]'];
              p.glitchChar = symbols[Math.floor(Math.random() * symbols.length)];
            }
          }
        }

        // Fade in when newly spawned
        if (p.opacity < p.maxOpacity) {
          p.opacity += 0.015;
        }

        // Slow fade out as it approaches the right edge of screen
        const fadeZone = width * 0.85;
        if (p.x > fadeZone) {
          const ratio = Math.max(0, 1 - (p.x - fadeZone) / (width - fadeZone));
          p.opacity = Math.min(p.opacity, p.maxOpacity * ratio);
        }

        const renderOpacity = p.opacity * p.flickerOpacity;
        if (renderOpacity <= 0) return;

        const posX = p.x + p.offsetX;
        const posY = p.y + p.offsetY;
        const displayText = p.glitchChar ? `${p.word.slice(0, 2)}${p.glitchChar}` : p.word;

        // Draw Chromatic Aberration Red Offset Layer when actively glitching
        if (p.glitchTimer > 0 && !reducedMotion) {
          ctx.fillStyle = isDarkMode ? `rgba(239, 68, 68, ${renderOpacity * 0.7})` : `rgba(220, 38, 38, ${renderOpacity * 0.6})`;
          ctx.font = `bold ${p.size}px "Inter", "Microsoft YaHei", "Heiti SC", sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(displayText, posX - 6, posY + 2);

          // Draw Cyan Offset Layer
          ctx.fillStyle = isDarkMode ? `rgba(6, 182, 212, ${renderOpacity * 0.7})` : `rgba(8, 145, 178, ${renderOpacity * 0.6})`;
          ctx.fillText(displayText, posX + 6, posY - 2);
        }

        // Draw Primary Chinese characters
        ctx.fillStyle = `rgba(${p.color}, ${renderOpacity})`;
        ctx.font = `bold ${p.size}px "Inter", "Microsoft YaHei", "Heiti SC", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText, posX, posY);

        // Draw light, minimalist English translation label underneath
        const labelOpacity = isDarkMode ? renderOpacity * 0.55 : renderOpacity * 0.52;
        ctx.fillStyle = isDarkMode 
          ? `rgba(255, 255, 255, ${labelOpacity})`
          : `rgba(15, 15, 15, ${labelOpacity})`;
        ctx.font = `normal ${Math.max(8, p.size * 0.45)}px "JetBrains Mono", monospace`;
        ctx.fillText(p.translation, posX, posY + p.size * 0.7);

        // Recycle particles that move entirely off screen or fade out completely
        if (p.x > width + 120 || p.opacity <= 0.005) {
          particlesRef.current[idx] = createParticle(true);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Spawn on click handler
    const handleCanvasClick = (e: MouseEvent) => {
      if (reducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Spawn 4-6 beautiful floating Chinese particles centered around click coordinate
      const spawnCount = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < spawnCount; i++) {
        particlesRef.current.push(createParticle(true, clickX, clickY));
      }

      // Limit particle array size to prevent performance lag
      if (particlesRef.current.length > 50) {
        particlesRef.current = particlesRef.current.filter(p => !p.spawnedByClick || p.x < width * 0.7);
      }
    };

    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [isDarkMode, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden pointer-events-auto select-none"
      id={`chinese-backdrop-container-${isDarkMode ? 'dark' : 'light'}`}
    >
      {/* Electronic sweep line */}
      <div className={`electronic-sweep-bar electronic-sweep-bar-${isDarkMode ? 'dark' : 'light'}`} />

      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        id={`chinese-backdrop-canvas-${isDarkMode ? 'dark' : 'light'}`}
      />
    </div>
  );
};
