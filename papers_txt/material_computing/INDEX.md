# Material Computing — Paper Index

Full summaries for 3 papers in this collection.

---

## Collapse of Gels in an Electric Field
**File:** `Collapse_of_Gels_in_an.txt`
**Subjects:** Material computing, Exhibiting Memory
**URL:** https://www.science.org/doi/10.1126/science.218.4571.467

Tanaka et al. (1982) show that polyelectrolyte hydrogels (partially hydrolysed polyacrylamide) undergo discrete, reversible volume-phase transitions when placed in an electric field. The gel collapses toward the positive electrode, with a sharp volume change dependent on ion concentration and solvent composition (acetone-water mixtures). Mean-field theory explains the transition as an interplay between osmotic pressure from counterion confinement, rubber-elastic restoring forces, and polymer-solvent mixing entropy. The transition can be tuned between continuous and discontinuous by adjusting ionisation degree or solvent quality. Key relevance: foundational paper establishing electric-field-driven phase transitions in gels — the physical basis for the memory and actuation exploited in EAP computing papers above.

---

## Electro-active polymer hydrogels exhibit emergent memory when embodied in a simulated game environment
**File:** `Electro-active_polymer_hydrogels_exhibit_emergent.txt`
**Subjects:** Teaching Brains, Exhibiting Memory
**URL:** https://www.sciencedirect.com/science/article/pii/S2666386424004363?ref=pdf_download&fr=RR-2&rr=969eef79d9c98f9c#cebib0010

Extends the EAP-gel computing framework into a closed-loop task by embodying a polyacrylamide hydrogel in the game Pong via a custom multi-electrode array (MEA). Ball position is encoded as localised electric stimulation (2×3 grid); ion-concentration-dependent conductivity at sensing electrodes is read out and converted to paddle position. Across 21 runs (3500 s each), the hydrogel-controlled paddle showed a statistically significant improvement in rally length over time, with the middle-region hit rate rising from 50% to 60%. Control experiments (remapped sensing, remapped stimulation, severed stimulation) confirmed the improvement depends on accurate environmental feedback. The memory mechanism is attributed to slow ion diffusion creating a hysteresis in conductivity that persists between stimulations, analogous to synaptic plasticity in biological neural networks. Key relevance: first demonstration of emergent game-playing performance from an abiotic material's inherent memory, inspired by DishBrain BNN studies.

---

## Electroactive polymer gels as probabilistic reservoir automata for computation
**File:** `Electroactive_polymer_gels_as_probabilistic.txt`
**Subjects:** Material computing, Exhibiting Memory
**URL:** https://www.cell.com/iscience/fulltext/S2589-0042(22)01830-2?_returnURL=https%3A%2F%2Flinkinghub.elsevier.com%2Fretrieve%2Fpii%2FS2589004222018302%3Fshowall%3Dtrue

Models ionic EAP hydrogels as probabilistic Moore automata for reservoir computing. The gel's ion migration under electric stimulation encodes input history, producing state-dependent conductivity responses that serve as memory. The paper formalises this memory as a state transition function where stimulations move the system through a set of internal states with probabilistic outputs. Experimental measurements of conductivity after repeated stimulation cycles demonstrate that the gel "remembers" previous stimuli. The framework connects morphological computation, embodied cognition and active-matter physics, positioning EAP gels as a candidate physical reservoir. Key relevance: formal computational model (automata theory) for gel-based memory.

---
