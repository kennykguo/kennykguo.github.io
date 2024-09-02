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
          <p className="mb-4">I am a Computer Engineering student at the University of Toronto with a passion for machine learning and full stack development.</p>
          <p>I enjoy creating innovative solutions to complex problems and am always looking for new challenges.</p>
        </div>
      </div>
    </section>
  );
};

export default About;