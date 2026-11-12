---
title: Efficient Data Representations
slug: efficient-data-representations
category: objective
importance: 1
description: Compact, computation-ready homomorphic representations that reduce the size of massive scientific datasets while keeping their analytical and visual fidelity, so they can be explored interactively.
figure:
  src: assets/img/research/representative-pixels.png
  alt: Three rows of panels, one each for 5%, 10% and 30% of total pixels, showing the selected representative pixels on a rendered volume, zoomed detail views, and the speed-up for each subset.
  caption: "Representative pixels for accelerating the reconstruction neural network: 5%, 10% and 30% of total pixels, with the speed-up each subset achieves."
---

### Research questions

- How can hierarchical multiresolution structures be implemented in multivariate homomorphic models to support scalable encoding and interactive access?
- What fidelity and performance benefits arise from combining neural and spline-based representations in scientific modeling?

### Year-1 progress

- **Hierarchical neural representations.** We have begun investigating hybrid, multiresolution implicit neural representations (INRs) that adapt accuracy and network capacity dynamically, with the goal of supporting user-defined error tolerances across scalar fields, signed distance fields and finite-time Lyapunov exponent fields.
- **Spline-based neural representations.** We have begun developing a spline-based architecture, distinct from Kolmogorov–Arnold networks. A proof-of-concept network with tensor-product spline activations reaches accuracy comparable to state-of-the-art methods on scientific data. Uncertainty quantification and adaptive model resolution are the next goals.
- **Patch-based multivariate functional approximation.** We are converting the MFA representation from a monolithic tessellation of tensor products to a patch-based, multiscale hierarchy. The new design reproduces all of the test cases from our 2023 LDAV paper.
- **Importance-aware representations.** We have completed work on representations that learn the pixels most important for efficient interactive visualization by jointly considering the data, user behavior and downstream reconstruction.
