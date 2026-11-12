---
title: Efficient Data Representations
slug: efficient-data-representations
category: objective
importance: 1
tagline: Make the data small enough to think with.
figure:
  src: assets/img/research/representative-pixels.png
  alt: Grid comparing three datasets, Chameleon, BeechNut and Rayleigh–Taylor, using 5%, 10% and 30% of total pixels respectively. Columns show the representative pixels, the partially rendered image, and the reconstruction with zoomed details and speed-ups of 4.3×, 3.2× and 2.1×.
  caption: "Representative pixels for accelerating a reconstruction neural network. From 5, 10 and 30 percent of the total pixels, the full image is reconstructed, with the speed-up shown for each."
  credit: IDEAS team, Argonne Base proposal (2025).
---

Raw simulation output is a poor format for curiosity. It is enormous, rigid and slow to move. IDEAS replaces it with homomorphic representations: compact mathematical models of the data, built from implicit neural representations, multivariate functional approximations and spline-based networks. They preserve the data's analytical and visual fidelity, so rendering and analysis can run on the model directly instead of on the raw output.

The open questions are fundamental. How should such a model organize itself across scales, so that a scientist can move from the shape of a whole simulation down to its finest features without waiting? And what is gained when neural networks and classical splines work together, instead of competing?

The first answers are arriving. We are rebuilding our multivariate functional approximation library around a hierarchy of overlapping patches, in the spirit of adaptive mesh refinement, in place of the tessellated tensors it used before. The new design already reproduces every test case from our 2023 LDAV paper with comparable accuracy, fewer tensors and comparable or slightly faster run times. A proof-of-concept network that uses splines as its activation functions matches state-of-the-art methods on scientific data, and its next lessons are to report its own uncertainty and to adapt its resolution to the features it finds. We have also begun building hierarchical neural representations that adjust their own capacity to the error a scientist is willing to tolerate.

One result is already published. Our importance-mask work, in IEEE Transactions on Visualization and Computer Graphics, learns which pixels of a rendering matter most by weighing the data, how people explore it, and what a neural network needs to rebuild the rest. An image can then be reconstructed from a small fraction of its pixels.
