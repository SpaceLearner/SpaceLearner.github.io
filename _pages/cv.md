---
layout: archive
title: "About Me"
permalink: /
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

I am currently a Research Engineer at Alibaba DAMO Academy. I received my Ph.D. from Peking University (PKU) in 2024 and my B.S. in Computer Science from Beijing Institute of Technology (BIT) in 2019.

My research interests include Multi-modal AI Agent, Embodied AI, and Reinforcement Learning.

Education
======
* **Ph.D. in Intelligence Science and Technology, Peking University**, 2019.09 - 2024.07
  * Research: Large Language Models, Multi-modal LLMs, Graph Learning & Applications, Generative Models
  * Honors: Doctoral National Scholarship
* **B.S. in Computer Science and Technology, Beijing Institute of Technology**, 2015.09 - 2019.07
  * Honors: Outstanding Graduates of Beijing, Outstanding Student Pacemaker of BIT

Work Experience
======
* **Research Engineer, Alibaba DAMO Academy**, 2024.07 - Present
  * Focus: Multi-modal AI Agent, Embodied AI, LLM Agents (e.g., AIGB, ZeroSearch).
* **Algorithm Engineer Intern, Alibaba Group (Alimama)**, 2023.07 - 2024.04
  * Developed generative auto-bidding algorithms (AIGB project).
* **Research Intern, Microsoft Research Asia (DKI Group)**, 2022.06 - 2023.06
  * Supervisor: Lun Du
  * Developed graph algorithms for heterogeneous graphs and recommender systems.
* **Visiting Student, The Hong Kong University of Science and Technology (HKUST)**, 2022.03 - 2022.06
  * Supervisor: Prof. Sunghun Kim
  * Worked on recommender system algorithms.
* **Algorithm Engineer Intern, Meituan**, 2021.09 - 2022.03
  * Leader: Zhiwei Liu
  * Developed re-ranking models for multi-stage advertisement system.
* **Research Intern, Microsoft Research Asia (SIG Group)**, 2020.09 - 2021.09
  * Supervisor: Yaming Yang
  * Contributed to graph-based projects and pull request integration.

Honors & Awards
======
* National Scholarship (Doctoral), Peking University, 2023
* Pacemaker to Merit Student, Peking University, 2023
* Microsoft Research Asia 'Stars of Tomorrow' Internship Program Excellence Award (Top 10%), 2023
* Global Vision - Peking University Graduate Student Academic Exchange Fund Sponsorship, 2023
* First Prize, Peking University Challenge Cup May 4th Academic Competition, 2023
* Outstanding Communist Party Member, School of Intelligence Science, Peking University, 2022
* Merit Student, Peking University, 2020
* Outstanding Graduates of Beijing, 2019
* Outstanding Graduates of Beijing Institute of Technology, 2019
* KDD Cup 2023 Task 2, Top 3%
* RecSys Challenge 2022, Top 5%

Selected Publications
======
<p><small><sup>*</sup>Equal contribution. <sup>✉</sup>Corresponding author.</small></p>
<ul>
  {% assign sorted_publications = site.publications | sort: "date" | reverse %}
  {% for post in sorted_publications %}
    {% include archive-single-cv.html %}
  {% endfor %}
</ul>

<!--   
Talks
======
  <ul>{% for post in site.talks %}
    {% include archive-single-talk-cv.html %}
  {% endfor %}</ul>
  
Teaching
======
  <ul>{% for post in site.teaching %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul> -->
  
Academic Service
======
* Tutorial Speaker: "Causal Discovery from Temporal Data", SIGKDD 2023
* Reviewer/Program Committee Member for: NeurIPS, ICLR, AISTATS, SIGKDD, WWW, IJCAI, EMNLP, COLING, ICME, ICASSP, COLM, TKDE, TNNLS, CIKM, ICDM, VLDB
