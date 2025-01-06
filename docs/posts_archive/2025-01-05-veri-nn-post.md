### Excited to Share My Latest Project: veri-nn!
I recently completed a project that combines hardware design and machine learning: veri-nn, a neural network classifier for the MNIST dataset implemented entirely in Verilog and synthesized on a DE1-SoC FPGA board. This project entailed a deep dive into the world of embedded deep learning and hardware acceleration!

### Introduction
My project, veri-nn, is a fully functional neural network library designed to classify handwritten digits from the MNIST dataset. The entire library consists of modular and reusable components built from scratch in Verilog, and includes VGA display modules for visualization and an interactive drawing tool interfacing with a PS2 keyboard. Since this project is a library implementation, the network can potentially be reconfigured for any viable deep learning task, provided it fits within the FPGA's resource constraints. This project showcases the power of hardware implementation for deep learning models, achieving impressive performance with constrained resources, including memory and limited clock speed (50MHz).

### Technical Highlights
Engineered a modular, scalable neural network library in Verilog, optimized for the DE1-SoC FPGA.
Managed to fit the design within the 4MB on-chip memory constraint, a significant achievement given the resource limitations.
Achieved an impressive inference speed of 2.27ms per classification, making real-time inference feasible on embedded hardware.
Trained a neural network in PyTorch with int32 precision (another notable achievement due to low precision), achieving 80% validation accuracy on the MNIST dataset.
Utilized quantization techniques to convert fp32 weights to 32-bit signed integers (int32), ensuring compatibility with the Verilog implementation while optimizing memory usage.
Implemented a 4-layer neural network with ReLU activations and an argmax layer for classification.
Designed an FSM to control the sequential processing of layers, ensuring efficient pipeline execution as well as a reconfigurable implementation for future tasks.

### Non-Technical Highlights
Displayed a 28x28 drawing grid on a VGA monitor, allowing real-time input via the keyboard of any handwritten digit.
Visualized classification results on seven-segment displays for immediate feedback (one can leave the classification pipeline on to classify dynamically).
Utilized push-button controls and a PS2 keyboard for user input, enabling navigation and drawing on the grid.

### Collaboration & Open Source
This project would not have been possible without the invaluable support of my partner, Pavel Smolovich, who worked on the VGA and keyboard modules, and my classmates who encouraged me to persevere in this project. I would not have completed it without the tremendous support for this idea.
I am making my codebase for veri-nn open source and invite anyone to contribute on GitHub. Due to potential copyright/plagiarism concerns, I have not made the VGA and keyboard modules public; they can be provided upon private request. Additionally, I’ve documented the challenges and solutions in a detailed blog post, which I hope will be a helpful resource for anyone tackling similar projects.

### Conclusion
This project is a step forward in my current interests around hardware-accelerated machine learning, through which I was able to grow by overcoming technical challenges. I’m proud of what my teammate and I achieved and excited to see where this journey will take us next.

Feel free to reach out to us if you have any questions or feedback! 🌟