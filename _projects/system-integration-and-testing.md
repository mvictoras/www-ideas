---
title: System Integration and Testing
slug: system-integration-and-testing
category: objective
importance: 4
description: Integration of the IDEAS visualization and analysis tools with DOE supercomputing facilities and experimental data sources, supporting bi-directional steering and real-time feedback.
---

### Research questions

- How can data streaming and execution control mechanisms be extended to support responsiveness and concurrency in hybrid DOE workloads?

Globus Compute infrastructure at the Argonne Leadership Computing Facility is configured and validated. Agents running on a user workstation, connected to Argonne's Argo LLM service, have submitted Globus Compute jobs to a cluster for filesystem exploration, package installation and image generation from cosmological simulation data. We are building an orchestration layer with Globus Flows, Globus Compute, Wilkins and Ascent to coordinate data logistics, execution and visualization. Integration with the in situ visualization libraries Wilkins and Ascent is in progress, and principles for intelligent orchestration are being established: prioritizing tasks by urgency, composing subworkflows dynamically, and supporting collaborative steering between AI agents and human users. Work is under way to connect the stack to live supercomputer simulations and to streaming data from DOE light-source facilities.
