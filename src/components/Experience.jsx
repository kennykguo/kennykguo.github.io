import React from 'react';

const experiences = [
  {
    title: "ML Research Engineer Intern",
    company: "SmartMate",
    location: "New York, NY",
    date: "Jun. 2024 -- Sept. 2024",
    details: [
      "Revamped the implementations of 30+ research papers for American Sign Language (ASL) detection, utilizing a range of architectures in PyTorch including 3DCNNs, Bi-directional LSTMs, and Encoder-Decoder Transformers.",
      "Developed a computer vision model using OpenCV and PyTorch to translate ASL to English captions, achieving a maximum accuracy of 84% over the testing dataset.",
      "Authored a comprehensive research paper detailing the end-to-end implementation of the ASL translation model, facilitating future research and development."
    ]
  },
  {
    title: "Full Stack Engineer Intern",
    company: "ML4U",
    location: "Amsterdam, NL",
    date: "Jun. 2024 -- Sept. 2024",
    details: [
      "Prototyped a sentiment analysis model using a Decoder-Only Transformer architecture with PyTorch, spaCy, and NLTK, resulting in an 87% testing accuracy on 100+ company review datasets.",
      "Developed an ML model API using Django for the backend server and PostgreSQL for the database, enabling concurrent storage of 10,000+ customer sentiments.",
      "Integrated Django with a React frontend, transitioning from server-side rendering with HTML templates to client-side rendering, reducing server response times by 40%."
    ]
  },
  {
    title: "Undergraduate Research Assistant",
    company: "University of Toronto",
    location: "Toronto, ON",
    date: "Jun. 2024 -- Sept. 2024",
    details: [
      "Enhanced the ECE353 (Systems Software) teaching resources for over 60+ students by developing a basic shell program in C to interact with the Linux kernel.",
      "Implemented 3+ shell features from the MIT xv6 operating system shell, creating functionalities from scratch using the GNU C library, establishing a practical teaching resource for students."
    ]
  }
];

const Experience = () => {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-white-500">Experience</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {experiences.map((exp, index) => (
          <div key={index} className="border border-gray-700 p-6 rounded-lg shadow-md hover:shadow-white-700 transition duration-300">
            <h3 className="text-xl font-semibold mb-2 text-white-500">
              {exp.title}
            </h3>
            <p className="text-sm mb-2 text-gray-400">
              {exp.company}, {exp.location}
            </p>
            <p className="text-sm mb-4 text-gray-400">{exp.date}</p>
            <ul className="list-disc list-inside">
              {exp.details.map((detail, idx) => (
                <li key={idx} className="text-sm mb-1">{detail}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Experience;
