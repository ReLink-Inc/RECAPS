// In NavigationButtons.js
import React from 'react';

function NavigationButtons({ onNavigate }) {
  return (
    <div className="navigation-buttons">
      <button onClick={() => onNavigate(-1)}>{"<"}</button>
      <button onClick={() => onNavigate(1)}>{">"}</button>
    </div>
  );
}

export default NavigationButtons;