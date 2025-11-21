// Modern Mouse Tracking Effects for Quantum UI
export const initMouseTracker = () => {
  let mouseX = 0;
  let mouseY = 0;

  const updateMousePosition = (e) => {
    mouseX = (e.clientX / window.innerWidth) * 100;
    mouseY = (e.clientY / window.innerHeight) * 100;
    
    // Update CSS custom properties for mouse position
    document.documentElement.style.setProperty('--mouse-x', `${mouseX}%`);
    document.documentElement.style.setProperty('--mouse-y', `${mouseY}%`);
  };

  // Throttle mouse move events for better performance
  let ticking = false;
  const handleMouseMove = (e) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateMousePosition(e);
        ticking = false;
      });
      ticking = true;
    }
  };

  // Add mouse move listener
  document.addEventListener('mousemove', handleMouseMove);

  // Cleanup function
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
  };
};

// Parallax effect for floating elements
export const initParallaxEffect = () => {
  const parallaxElements = document.querySelectorAll('.quantum-card, .quantum-header');
  
  const handleMouseMove = (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    parallaxElements.forEach((element, index) => {
      const speed = (index + 1) * 0.5;
      const x = (mouseX - 0.5) * speed;
      const y = (mouseY - 0.5) * speed;
      
      element.style.transform = `translate(${x}px, ${y}px)`;
    });
  };

  document.addEventListener('mousemove', handleMouseMove);
  
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    parallaxElements.forEach(element => {
      element.style.transform = '';
    });
  };
};
