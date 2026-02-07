"use client";

import { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    symbol: string;
    size: number;
}

const MATH_SYMBOLS = [
    "π", "∑", "∫", "∞", "√", "∂", "Δ", "θ", "λ", "Ω",
    "α", "β", "γ", "ε", "φ", "ψ", "ω", "∇", "∈", "∀",
    "+", "−", "×", "÷", "=", "≠", "≤", "≥", "±", "∝",
];

// Generate random numbers between -1000 and 1000
function getRandomSymbol(): string {
    // 40% chance of a random number, 60% chance of a math symbol
    if (Math.random() < 0.4) {
        return String(Math.floor(Math.random() * 2001) - 1000);
    }
    return MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)];
}

export function MathBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            initParticles();
        };

        // Initialize particles
        const initParticles = () => {
            const numParticles = Math.floor((canvas.width * canvas.height) / 3500);
            particlesRef.current = [];

            for (let i = 0; i < numParticles; i++) {
                particlesRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: 0,
                    vy: 0,
                    symbol: getRandomSymbol(),
                    size: 14 + Math.random() * 18,
                });
            }
        };

        // Mouse move handler
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        // Animation loop
        const animate = () => {
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Get computed styles for colors
            const styles = getComputedStyle(document.documentElement);
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const color = isDark ? "rgba(245, 244, 239, 0.12)" : "rgba(26, 26, 26, 0.08)";

            ctx.fillStyle = color;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const mouse = mouseRef.current;
            const repelRadius = 100;
            const repelStrength = 0.9;
            const friction = 0.95;

            particlesRef.current.forEach((p) => {
                // Calculate distance from mouse
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Repel from mouse - fully pushable, no spring back
                if (dist < repelRadius && dist > 0) {
                    const force = (repelRadius - dist) / repelRadius;
                    const angle = Math.atan2(dy, dx);
                    p.vx += Math.cos(angle) * force * repelStrength;
                    p.vy += Math.sin(angle) * force * repelStrength;
                }

                // Apply friction to slow down gradually
                p.vx *= friction;
                p.vy *= friction;

                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < -20) p.x = canvas.width + 20;
                if (p.x > canvas.width + 20) p.x = -20;
                if (p.y < -20) p.y = canvas.height + 20;
                if (p.y > canvas.height + 20) p.y = -20;

                // Draw particle
                ctx.font = `${p.size}px "Crimson Pro", Georgia, serif`;
                ctx.fillText(p.symbol, p.x, p.y);
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        // Setup
        resize();
        window.addEventListener("resize", resize);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseleave", handleMouseLeave);
        animate();

        return () => {
            window.removeEventListener("resize", resize);
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("mouseleave", handleMouseLeave);
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ zIndex: 0 }}
        />
    );
}
