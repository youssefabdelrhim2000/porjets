import React, { useMemo } from 'react';

const SpaceBackground: React.FC = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 150 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 3,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Stars Layer */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-primary/60 animate-pulse"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
      
      {/* Shooting Stars */}
      <div className="absolute w-1 h-1 bg-primary rounded-full animate-shooting-star" style={{ top: '20%', left: '10%', animationDelay: '0s' }} />
      <div className="absolute w-1 h-1 bg-primary rounded-full animate-shooting-star" style={{ top: '40%', left: '30%', animationDelay: '3s' }} />
      <div className="absolute w-1 h-1 bg-primary rounded-full animate-shooting-star" style={{ top: '60%', left: '60%', animationDelay: '6s' }} />
      
      {/* Nebula Glow Effects */}
      <div className="absolute w-96 h-96 bg-primary/5 rounded-full blur-3xl" style={{ top: '10%', right: '5%' }} />
      <div className="absolute w-64 h-64 bg-accent/5 rounded-full blur-3xl" style={{ bottom: '20%', left: '10%' }} />
    </div>
  );
};

export default SpaceBackground;
