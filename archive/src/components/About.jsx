import React from 'react';

const About = () => {
  return (
    <section className="mb-16">
      <div className="p-6 rounded-lg">
        <h1 className="text-7xl font-bold mb-2 text-white-500">Kenny Guo</h1>
        {/* <p className="text-xl mb-4 text-gray-400">Computer Engineering Student | ML Enthusiast | Full Stack Developer</p> */}
        <div className="mt-8">
            <br/>
            <br/>
            <br/>
          <h2 className="text-4xl font-semibold mb-4 text-white-700">About Me</h2>
          <p className="mb-4">I am a Computer Engineering student at the University of Toronto. At the moment, I am currently interested in deep learning, and low level optimizations involving GPUs. In the future, I would like to explore areas such as reverse engineering, cybersecurity, and firmware. </p>
        </div>
      </div>
    </section>
  );
};

export default About;