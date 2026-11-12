---
title: AI-Driven Rendering and Visualization
slug: ai-driven-rendering-and-visualization
category: objective
importance: 2
description: AI-powered visualization algorithms that render directly from homomorphic representations, using intelligent sparse sampling and generative reconstruction to balance performance and visual fidelity.
---

### Research questions

- How can sparse sampling with neural postprocessing accelerate volume rendering?
- Can AI predict intelligent data partitions to optimize distributed rendering performance?

### Year-1 progress

- **Radiance caching.** We have investigated explicit representations for volume data and radiance caching for real-time rendering. GSCache, our radiance-caching method, has been published in IEEE Transactions on Visualization and Computer Graphics.
- **Generative illumination.** DiffusionShadow trains a diffusion model on the weights of SIREN networks, conditioned on lighting parameters, to cache shadow effects for INR-based volume rendering. It reduces the cost of shadow rendering from quadratic to linear in the number of ray-marching samples, and it is evaluated against ground truth with PSNR, MS-SSIM and LPIPS.
- **Parallel feature-based encoding.** We are scaling feature-based multiresolution tesseract encoding (F-Hash) beyond the limits of a single GPU through partitioning and distributed training, with initial experiments on spatial and temporal partitioning complete.
