import React from 'react';
import './Starfield.css';

export default function Starfield() {
  return (
    <div className="space-container pointer-events-none select-none">
      {/* Dynamic Star Layers */}
      <div className="stars-static" />
      <div className="stars-twinkling" />
      <div className="stars-moving" />

      {/* Orbit Rings Backdrop */}
      <div className="orbits-wrapper">
        <div className="orbit-circle-1" />
        <div className="orbit-circle-2" />
        <div className="orbit-circle-3" />
        <div className="central-glow" />
      </div>
    </div>
  );
}
