---
layout: page
title: Research
permalink: /research/
nav_order: 2
description: The four IDEAS research objectives
nav: true
---

IDEAS (Intelligent Data Exploration Assistant for Science) builds an AI-powered scientific assistant that helps researchers explore massive datasets. It starts from compact, computation-ready data representations, renders directly from them, puts them in front of scientists through human-centered assistants, and binds the whole stack into DOE supercomputing and experimental facilities. Its work is organized around four interconnected objectives, each matched to a priority research direction from the DOE Visualization for Scientific Discovery, Decision-Making, and Communication Workshop.

<figure class="research-figure">
  <img src="{{ 'assets/img/research/ideas-overview.png' | relative_url }}" alt="Diagram of IDEAS: scientific data becomes homomorphic representations, which feed AI-driven rendering and an LLM-powered assistant for interactive exploration.">
  <figcaption>Overview of IDEAS: scientific data from simulations and experiments are transformed into homomorphic representations, enabling advanced rendering, real-time exploration, and workflow orchestration via intelligent assistants. Credit: IDEAS team, Argonne Base proposal (2025).</figcaption>
</figure>

{% assign objectives = site.projects | where: "category", "objective" | sort: "importance" %}
{% for objective in objectives %}
<section class="objective" id="{{ objective.slug }}">
  <h2>{{ objective.title }}</h2>
  <p class="objective-summary">{{ objective.description }}</p>
  {{ objective.content | markdownify }}
  {% if objective.figure %}
  <figure class="research-figure">
    <img src="{{ objective.figure.src | relative_url }}" alt="{{ objective.figure.alt }}">
    <figcaption>{{ objective.figure.caption }} Credit: IDEAS team, Argonne Base proposal (2025).</figcaption>
  </figure>
  {% endif %}
</section>
{% endfor %}
