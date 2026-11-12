---
title: X-Ray Science
slug: x-ray-science
category: use-case
status: upcoming
importance: 3
tagline: From beamtime bottleneck to real-time dialogue.
figure:
  src: assets/img/use-cases/xpcs-interface.png
  alt: Screenshot of an XPCS data analysis interface. A g2 curve plot compares single (orange) and averaged (blue) curves, with red outlier bounds for filtering anomalous datasets, above averaging settings and a job list.
  caption: "Interface for XPCS data analysis showing single (orange) and averaged (blue) g₂(τ) curves. Outlier bounds (red lines) are applied to filter anomalous datasets before averaging, ensuring data quality and efficient beamtime use."
  credit: IDEAS team, Argonne Base proposal (2025).
---

X-Ray Science moves the assistant from supercomputer output to live instrument data. X-ray photon correlation spectroscopy (XPCS) experiments at the Advanced Photon Source (APS) probe nanoscale dynamics by measuring temporal fluctuations in scattered X-ray intensity, producing g₂(τ) correlation curves that encode information about diffusion, relaxation and aging processes. To reduce noise, scientists perform hundreds to thousands of repeat measurements and manually aggregate the valid g₂ curves while discarding those with anomalies such as detector glitches or misalignments — a workflow that is largely post hoc and reliant on manual judgment, limiting the ability to interact with data during beamtime.

IDEAS will address this bottleneck through real-time data streaming from APS to the Argonne Leadership Computing Facility, combined with progressive homomorphic modeling that enables on-the-fly curve analysis. The assistant will let users query, aggregate and visualize g₂ curves in natural language, automatically filter outliers based on metadata and statistical properties, and maintain full experiment context through integrated provenance tracking — turning a tedious post-processing chore into a dialogue that can steer a beamtime.
