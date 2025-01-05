// App.jsx
import React from 'react';
import About from './components/About';
import Projects from './components/Projects';
import Contact from './components/Contact';
import AsciiArt from './components/AsciiArt';
import './index.css';
import Experience from './components/Experience';

const App = () => {
  return (
    <div className="bg-gray-900 text-gray-300 min-h-screen font-mono relative">
      <AsciiArt />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <About />
        <Experience/>
        <Projects />
        <Contact />
      </div>
    </div>
  );
};

export default App;