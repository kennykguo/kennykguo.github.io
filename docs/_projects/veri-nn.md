---
title: veri-nn
link: https://github.com/kennykguo/veri_nn/tree/main/object
technologies: ["Verilog", "Python", "PyTorch", "Intel Quartus Prime", "ModelSim"]
start_date: 2024-10-01
end_date: 2024-11-01
---

- Engineered a high-performance neural network library in Verilog with modular, scalable components, meeting 0.53MB on-chip memory constraints for deploying ML architectures on a DE1-SoC FPGA, achieving 2.27ms inference speed.
- Trained a neural network in PyTorch, utilizing quantization to optimize memory usage with int32 precision, achieving 80% validation accuracy on the MNIST dataset.
- Implemented overflow-resistant arithmetic using quantization to bound weights to [-31, +32], ensuring dot products remain within 32-bit signed integer range.
- Implemented custom gradual quantization algorithm using epoch-based scaling from fp32 to int32, preventing convergence failure that occurred with immediate weight truncation.
- Built real-time classification system using VGA display and PS2 keyboard interface, enabling live digit classification as user draws 28×28 pixel input.
- Designed custom memory interface architecture using separate read/write address channels, eliminating 100% of race condition errors.
- Built matrix indexing system from scratch using a row-major data arrangement, solving Verilog's inability to pass multi-dimensional arrays between modules.
- Designed FSM-based matrix multiplication using wait-cycle insertion and sequential dot product accumulation, achieving 100% timing closure without setup/hold violations.