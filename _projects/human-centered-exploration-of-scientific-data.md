---
title: Human-Centered Exploration of Scientific Data
slug: human-centered-exploration-of-scientific-data
category: objective
importance: 3
description: Natural interaction with scientific data, in which LLM-based assistants understand scientific intent, interpret visualizations, adapt to each user's expertise and keep a provenance record of every interaction.
---

### Research questions

- How can contextual cues from scientific visualizations be encoded and injected into LLM prompts to enhance relevance and utility?
- How can task decomposition among specialized agents improve the accuracy and reliability of responses?
- How can transparent, provenance-aware interaction logging enable explainable and reproducible scientific discovery?

### Year-1 progress

- **Visualization-focused AI assistant.** We are prototyping an assistant for one scientific domain. The planned design has a visualization context engine that captures data state, user focus and exploration history, a modular multiagent architecture for data querying, visualization control and anomaly detection, and a provenance system that logs assistant and user interactions.
- **Natural-language visualization benchmark.** We developed and publicly released NL2SciVis, a benchmark that evaluates LLM agents on generating ParaView code from natural-language requests across 15 atomic visualization operations, with deterministic two-gate validation.
- **Cosmology support.** ChatVis now handles HACC cosmology simulation data, using domain-specific skill files to generate spatial slices and galaxy-distribution visualizations.
- **Self-directed analysis.** SASAV, a self-directed agent that profiles scientific data, retrieves domain context, suggests transfer functions and plans views through parallel multimodal LLM inference, has been applied to scientific data exploration tasks.
