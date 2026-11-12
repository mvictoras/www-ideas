---
title: Cosmology
slug: cosmology
category: use-case
status: active
importance: 1
tagline: Finding the one-in-a-billion in a petabyte of universe.
figure:
  src: assets/img/use-cases/hacc.png
  alt: A wide-field cosmology simulation in blue, with a small region zoomed into three panels showing the matter density, stellar density and gas temperature of a massive cluster.
  caption: "A rare cluster identified within a 4-trillion-particle HACC simulation: the full matter-density field, with the zoomed region showing matter density, stellar density and gas temperature."
  credit: IDEAS team, Argonne Base proposal (2025).
---

Cosmology's most instructive objects are its rarest. In large-scale cosmological simulations such as HACC, scientists seek rare but scientifically critical structures — Bullet Cluster analogs, where dark matter and baryonic matter are spatially offset — because these phenomena offer key insights into cosmological models. Yet they are extremely difficult to isolate amid petabytes of multiscale, multivariate data. Today's workflows rely on manual scripting and exhaustive, error-prone searches, which makes targeted follow-up simulations slow and inefficient.

The IDEAS assistant attacks the search directly. Compact homomorphic representations preserve the salient structures of a simulation while downsampling the irrelevant regions around them, so a scientist can interactively query and visualize simulation outputs in natural language, rapidly identify regions of interest, and initiate high-resolution follow-up simulations through provenance-aware, multiagent orchestration.

The working testbed is Frontier-E, the first cosmological simulation to combine survey-scale volumes with self-consistent modeling of gravity, gas dynamics and galaxy formation: multiple petabytes across hundreds of snapshots. A version downscaled 2000× — same resolution, same physics, a far smaller volume — serves as a reproducible testbed where natural-language-driven spatial slices and galaxy-distribution visualizations generated with the assistant have been validated against known structures. The next target is rare-object detection, with Bullet Cluster analogs as the initial benchmark, before the methods extend to the full Frontier-E volume.
