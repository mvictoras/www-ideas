---
title: AI-Driven Rendering and Visualization
slug: ai-driven-rendering-and-visualization
category: objective
importance: 2
tagline: Draw the picture from the model, not from the mountain of data.
---

Once data lives as a model, the picture no longer has to be made the old way. Traditional volume rendering marches rays through the data and samples light again and again along each one. At exascale, that brute force runs out of road. IDEAS renders straight from homomorphic representations, and asks AI to do what it does well: fill in what was never computed.

Two questions drive the work. Can sparse sampling, followed by a neural network that restores the missing detail, make volume rendering fast enough to feel immediate? And can AI learn in advance how a rendering will touch the data, so that models can be divided across a supercomputer before the work begins?

GSCache, published in IEEE Transactions on Visualization and Computer Graphics, uses 3D Gaussians to cache how light moves through a volume. Physically based rendering of scientific data can then reuse what it has already learned, instead of recomputing every bounce. DiffusionShadow goes further and hands shadows to a diffusion model, the same family of AI behind modern image generators. Trained on the weights of neural representations and conditioned on the lighting, it cuts the cost of rendering shadows from quadratic to linear in the number of samples along each ray. We measure its output against ground truth with standard image-quality metrics, not by eye.

To carry these methods beyond a single GPU, we are distributing F-Hash, a fast-converging encoding for time-varying volumes, across many GPUs. The first experiments in splitting the data across space and time are complete.
