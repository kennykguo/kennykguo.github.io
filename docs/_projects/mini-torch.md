---
title: mini-torch
link: https://github.com/kennykguo/mini-torch
technologies: ["C++", "CUDA", "LLVM", "Nsight Compute"]
start_date: 2024-07-01
end_date: 2024-08-01
---

- Recreated PyTorch's object-oriented design with C++ and CUDA, implementing core functionalities such as LinearLayer, ReLU, Softmax, and CrossEntropyLoss, enabling an intuitive setup for deep learning training loops similar to higher-level languages.
- Optimized CUDA kernel functions for matrix multiplication through memory coalescing and tiling, and further utilizing kernel fusion with ReLU, to achieve a 5x reduction in training time.