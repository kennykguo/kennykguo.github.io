import React from 'react';

const Contact = () => {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-white-500">Contact</h2>
      <div className="border border-gray-700 p-6 rounded-lg shadow-md">
        <p className="mb-4">
          Email: <a href="mailto:kennyg.guo@mail.utoronto.ca" className="text-gray-400 hover:text-cyan-500">kennyg.guo@mail.utoronto.ca</a>
        </p>
        <p className="mb-4">
          LinkedIn: <a href="https://linkedin.com/in/kennykguo" className="text-gray-400 hover:text-cyan-500">linkedin.com/in/kennykguo</a>
        </p>
        <p>
          GitHub: <a href="https://github.com/kennykguo" className="text-gray-400 hover:text-cyan-500">github.com/kennykguo</a>
        </p>
      </div>
    </section>
  );
};

export default Contact;