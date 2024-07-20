import React from 'react';
import Header from './components/Header.jsx';
import Project from './components/Projects.jsx';
import About from './components/About.jsx';
import Contact from './components/Contact.jsx';
import './styles/App.css';

const App = () => {
  return (
    <div className="App">
      <Header />
      <About />
      <main>
        <Project />
      </main>
      <Contact />
    </div>
  );
};

export default App;
