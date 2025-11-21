import React, { useState, useEffect, useRef } from 'react';

function InteractiveHeader() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const text = "Planned activities";

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const getLetterStyle = (element) => {
        if (!element) return {};

        const rect = element.getBoundingClientRect();
        const letterX = rect.left + rect.width / 2;
        const letterY = rect.top + rect.height / 2;

        const dist = Math.sqrt(
            Math.pow(mousePos.x - letterX, 2) +
            Math.pow(mousePos.y - letterY, 2)
        );

        // Max distance to affect the letter
        const maxDist = 150;

        if (dist < maxDist) {
            const scale = 1 + (1 - dist / maxDist) * 0.5; // Scale up to 1.5x
            const weight = 400 + (1 - dist / maxDist) * 400; // Weight up to 800

            return {
                transform: `scale(${scale})`,
                fontWeight: Math.round(weight),
                color: `hsl(${200 + (1 - dist / maxDist) * 60}, 100%, 70%)` // Shift color
            };
        }

        return {
            transform: 'scale(1)',
            fontWeight: 400,
            color: 'inherit'
        };
    };

    return (
        <h1 ref={containerRef} className="interactive-header" style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
            {text.split('').map((char, index) => (
                <Letter key={index} char={char} mousePos={mousePos} />
            ))}
        </h1>
    );
}

// Separate component for each letter to optimize re-renders if needed, 
// but for this effect, we pass mousePos down.
const Letter = ({ char, mousePos }) => {
    const ref = useRef(null);
    const [style, setStyle] = useState({});

    useEffect(() => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const letterX = rect.left + rect.width / 2;
        const letterY = rect.top + rect.height / 2;

        const dist = Math.sqrt(
            Math.pow(mousePos.x - letterX, 2) +
            Math.pow(mousePos.y - letterY, 2)
        );

        const maxDist = 100;

        if (dist < maxDist) {
            const intensity = 1 - dist / maxDist;
            setStyle({
                transform: `translateY(${-intensity * 10}px) scale(${1 + intensity * 0.3})`,
                fontWeight: 400 + intensity * 400,
                textShadow: `0 0 ${intensity * 10}px rgba(56, 189, 248, ${intensity})`,
                color: `rgb(${255 - intensity * 50}, ${255}, ${255})`
            });
        } else {
            setStyle({
                transform: 'none',
                fontWeight: 400,
                textShadow: 'none',
                color: 'inherit'
            });
        }
    }, [mousePos]);

    return (
        <span ref={ref} style={{ display: 'inline-block', transition: 'all 0.1s ease-out', ...style }}>
            {char === ' ' ? '\u00A0' : char}
        </span>
    );
};

export default InteractiveHeader;
