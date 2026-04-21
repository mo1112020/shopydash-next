"use client";

import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
  spread?: number;
  yoyo?: boolean;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  delay?: number;
}

const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 2,
  className = '',
  color = '#b5b5b5',
  shineColor = '#ffffff',
  spread = 120,
  direction = 'left',
  delay = 0,
}) => {
  if (disabled) {
    return <span className={`inline-block ${className}`} style={{ color }}>{text}</span>;
  }

  const style: React.CSSProperties = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: `shiny-text-move ${speed}s linear ${delay}s infinite`,
    animationDirection: direction === 'right' ? 'reverse' : 'normal',
  };

  return (
    <span className={`inline-block ${className}`} style={style}>
      {text}
    </span>
  );
};

export default ShinyText;
