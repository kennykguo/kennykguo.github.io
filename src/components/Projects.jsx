import React from 'react';
import '../styles/Projects.css';

const projects = [
    {
        title: "Deep Learning Library From Scratch ",
        link: "https://github.com/kennykguo/deep-learning-from-scratch",
        technologies: ["C/C++", "CUDA", "Python", "PyTorch", "NumPy"],
        date: "Dec. 2023 -- Present",
        details: [
            "Spearheaded Neural Networks, CNNs, RNNs, LSTMs, and Transformers from scratch using OOP principles, increasing code implementation efficiency by 50%.",
            "Programmed implementations to utilize CUDA acceleration using NVIDIA’s C++ libraries, resulting in a 5x speedup in training.",
            "Produced educational resources with practical examples, instructing over 5+ individuals on deep learning theory."
        ]
    },
    {
        title: "Image Captioning ",
        link: "https://github.com/kennykguo/image-captioning",
        technologies: ["Python", "PyTorch", "Arduino"],
        date: "Jun. 2024 -- Jul. 2024",
        details: [
            "Engineered a deep learning model combining Computer Vision and NLP, using PyTorch to integrate CNNs with Vision Transformers/LSTMs, achieving a max BLEU-4 caption score of 11.0.",
            "Designed models using transfer learning with InceptionV3 and VGG16, improving BLEU caption scores by 0.2.",
            "Integrated the model with an Arduino ESP32 for real-time image data collection and caption generation."
        ]
    },
    {
        title: "AI-Generated Art Detection ",
        link: "https://github.com/kennykguo/ai-generated-art-detection",
        technologies: ["Python", "PyTorch"],
        date: "Dec. 2023 -- Jun. 2024",
        details: [
            "Co-developed a CNN-based deep learning model for AI-art detection using PyTorch, achieving a maximum 90% test accuracy.",
            "Leveraged transfer learning with pre-trained models such as VGG16 and ResNet50, reducing model loss by 6%.",
            "Evaluated 10+ architectures proposed in research papers to identify the best-performing model."
        ]
    },
    {
        title: "Project 4 ",
        link: "#",
        technologies: ["Tech1", "Tech2"],
        date: "Date",
        details: [
            "Detail 1",
            "Detail 2"
        ]
    },
    {
        title: "Project 5 ",
        link: "#",
        technologies: ["Tech1", "Tech2"],
        date: "Date",
        details: [
            "Detail 1",
            "Detail 2"
        ]
    },
    {
        title: "Project 6 ",
        link: "#",
        technologies: ["Tech1", "Tech2"],
        date: "Date",
        details: [
            "Detail 1",
            "Detail 2"
        ]
    }
];

const Projects = () => {
  return (
    <div className="projects-container">
      {projects.map((project, index) => (
        <div className="project" key={index}>
          <h2>
            {project.title} 
            <a href={project.link} target="_blank" rel="noopener noreferrer">🔗</a>
          </h2>
          <p><em>{project.date}</em></p>
          <p>{project.technologies.join(', ')}</p>
          <ul>
            {project.details.map((detail, idx) => (
              <li key={idx}>{detail}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Projects;
