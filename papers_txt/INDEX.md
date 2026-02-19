# Paper Index

Quick-reference index for the AI lab assistant. When a literature question arises,
scan the summaries below to decide which full paper(s) to load from this folder.

---

<!-- New entries are appended below by sync_bibliography.py and the AI assistant -->

## Bioelectronic Imaging Array Based on Bacteriorhodopsin Film
**File:** `Bioelectronic_Imaging_Array_Based_on.txt`
**Subjects:** Synthetic Retinas
**URL:** https://ieeexplore.ieee.org/document/4769372

Demonstrates a 4×4 bioelectronic imaging array using bacteriorhodopsin (bR) thin films deposited on a flexible Kapton substrate. Each pixel consists of a pair of ITO electrodes sandwiching a dried bR/polyvinyl-alcohol film. The photocurrent from bR's M412 photocycle intermediate is amplified by custom transimpedance circuits to produce a differential (ON/OFF) response that inherently encodes temporal changes, enabling motion detection without frame subtraction. Spatial resolution was tested at ~1 mm feature sizes, and the flexible substrate allows wrapping onto curved surfaces for non-planar imaging. Key relevance: proof-of-concept for biologically derived photoreceptor arrays with built-in temporal differentiation.

---

## Artificial retina with adjustable dynamic vision perception using carbon nanotubes and bacteriorhodopsin
**File:** `Artificial_retina_with_adjustable_dynamic.txt`
**Subjects:** Synthetic Retinas
**URL:** https://www.cell.com/device/fulltext/S2666-9986(25)00063-8?_returnURL=https%3A%2F%2Flinkinghub.elsevier.com%2Fretrieve%2Fpii%2FS2666998625000638%3Fshowall%3Dtrue

Presents a CNT/bR hybrid artificial retina capable of adjustable dynamic vision through tuning of "photocurrent duration time" (PDT). The device employs bacteriorhodopsin interfaced with carbon nanotube electrodes to generate transient photocurrents. By varying the PDT window, the system switches between difference perception (short PDT, capturing only scene changes) and visual persistence (long PDT, capturing full frames with motion trails). This enables adaptive frame extraction and trajectory capture analogous to biological retinal adaptation. Demonstrated applications include moving-object detection, trajectory tracking, and edge-enhanced imaging. Key relevance: tunable temporal filtering for bio-hybrid vision sensors.

---

## Electroactive polymer gels as probabilistic reservoir automata for computation
**File:** `Electroactive_polymer_gels_as_probabilistic.txt`
**Subjects:** Material computing, Exhibiting Memory
**URL:** https://www.cell.com/iscience/fulltext/S2589-0042(22)01830-2?_returnURL=https%3A%2F%2Flinkinghub.elsevier.com%2Fretrieve%2Fpii%2FS2589004222018302%3Fshowall%3Dtrue

Models ionic EAP hydrogels as probabilistic Moore automata for reservoir computing. The gel's ion migration under electric stimulation encodes input history, producing state-dependent conductivity responses that serve as memory. The paper formalises this memory as a state transition function where stimulations move the system through a set of internal states with probabilistic outputs. Experimental measurements of conductivity after repeated stimulation cycles demonstrate that the gel "remembers" previous stimuli. The framework connects morphological computation, embodied cognition and active-matter physics, positioning EAP gels as a candidate physical reservoir. Key relevance: formal computational model (automata theory) for gel-based memory.

---

## Electro-active polymer hydrogels exhibit emergent memory when embodied in a simulated game environment
**File:** `Electro-active_polymer_hydrogels_exhibit_emergent.txt`
**Subjects:** Teaching Brains, Exhibiting Memory
**URL:** https://www.sciencedirect.com/science/article/pii/S2666386424004363?ref=pdf_download&fr=RR-2&rr=969eef79d9c98f9c#cebib0010

Extends the EAP-gel computing framework into a closed-loop task by embodying a polyacrylamide hydrogel in the game Pong via a custom multi-electrode array (MEA). Ball position is encoded as localised electric stimulation (2×3 grid); ion-concentration-dependent conductivity at sensing electrodes is read out and converted to paddle position. Across 21 runs (3500 s each), the hydrogel-controlled paddle showed a statistically significant improvement in rally length over time, with the middle-region hit rate rising from 50% to 60%. Control experiments (remapped sensing, remapped stimulation, severed stimulation) confirmed the improvement depends on accurate environmental feedback. The memory mechanism is attributed to slow ion diffusion creating a hysteresis in conductivity that persists between stimulations, analogous to synaptic plasticity in biological neural networks. Key relevance: first demonstration of emergent game-playing performance from an abiotic material's inherent memory, inspired by DishBrain BNN studies.

---

## Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia
**File:** `Sensorimotor_control_of_robots_mediated.txt`
**Subjects:** Mycelium
**URL:** https://www.science.org/doi/10.1126/scirobotics.adk8019

Introduces *Pleurotus eryngii* (king oyster) fungal mycelia as a living component in biohybrid robots. A 3D-printed scaffold houses the mycelium with extracellular electrodes that record spontaneous action-potential-like voltage spikes (mean ~135 µV, frequency ~0.12 Hz, up to 1868 µV peaks). These spiking trains are processed in real time and translated into CPG-like digital control signals driving: (1) a tethered 5-legged pneumatic soft robot via valve control, and (2) an untethered 4-wheel-drive hard robot via motor PWM. UV light stimulation (particularly wavelengths near blue/UV) evokes amplified spiking responses (3–10× baseline), enabling environmental sensing and gait modulation. A vibration-isolation and Faraday-cage system ensures noise-free mobile operation. Recorded over 30+ days with stable signals. Key relevance: robust, low-maintenance living controller for biohybrid robots; demonstrates fungal electrophysiology as a practical alternative to animal-cell biohybrids.

---

## Collapse of Gels in an Electric Field
**File:** `Collapse_of_Gels_in_an.txt`
**Subjects:** Material computing, Exhibiting Memory
**URL:** https://www.science.org/doi/10.1126/science.218.4571.467

Tanaka et al. (1982) show that polyelectrolyte hydrogels (partially hydrolysed polyacrylamide) undergo discrete, reversible volume-phase transitions when placed in an electric field. The gel collapses toward the positive electrode, with a sharp volume change dependent on ion concentration and solvent composition (acetone-water mixtures). Mean-field theory explains the transition as an interplay between osmotic pressure from counterion confinement, rubber-elastic restoring forces, and polymer-solvent mixing entropy. The transition can be tuned between continuous and discontinuous by adjusting ionisation degree or solvent quality. Key relevance: foundational paper establishing electric-field-driven phase transitions in gels — the physical basis for the memory and actuation exploited in EAP computing papers above.

---

## Spatiotemporal control of engineered bacteria to express interferon-γ by focused ultrasound for tumor immunotherapy
**File:** `Spatiotemporal_control_of_engineered_bacteria.txt`
**Subjects:** Focused Ultrasound
**URL:** https://www.nature.com/articles/s41467-022-31932-x?fromPaywallRec=false

Chen et al. (2022, *Nature Communications*) engineer an ultrasound-responsive bacterium (URB) by inserting murine IFN-γ (with OmpA secretion signal) into E. coli MG1655 under the pR-pL tandem promoter controlled by the thermolabile cI857 repressor. At body temperature (37 °C) the gene is silenced; focused ultrasound raises the local temperature to 45 °C (3 s ON / 5 s OFF pulsing at 4.93 MPa), de-repressing IFN-γ expression. The bacteria preferentially colonise hypoxic tumour cores after i.v. injection. In 4T1 breast cancer and orthotopic H22 liver tumour models, URB + US treatment induced M2→M1 macrophage polarisation, increased CD4+/CD8+ T-cell infiltration, and produced significant tumour growth suppression, including an abscopal effect on distant tumours and reduced lung metastases. Median survival increased from 42 to 60 days. Key relevance: demonstrates acoustic remote control of therapeutic gene circuits in tumour-homing bacteria using a thermal genetic switch.

---

## Ultrasound-controllable engineered bacteria for cancer immunotherapy
**File:** `Ultrasound-controllable_engineered_bacteria_for_cancer.txt`
**Subjects:** Focused Ultrasound
**URL:** https://www.nature.com/articles/s41467-022-29065-2

Abedi et al. (2022, *Nature Communications*) develop FUS-activated therapeutic bacteria using the probiotic E. coli Nissle 1917 (EcN). The key innovation is a temperature-actuated genetic **state switch**: the TcI42 thermosensitive repressor gates expression of the Bxb1 serine integrase, which upon thermal de-repression at 42 °C permanently inverts a promoter cassette, producing sustained therapeutic output even after the temperature returns to 37 °C. Through high-throughput library screening (~10⁷ variants of RBS, start codon, and ssrA degradation tag) plus rational design (copy-number tuning, temperature-responsive transcriptional terminator), the circuit achieved >100-fold ON/OFF ratio. The therapeutic payload is αCTLA-4 + αPD-L1 nanobodies (immune checkpoint inhibitors) secreted via PelB leader peptide, stabilised by an Axe-Txe toxin-antitoxin cassette. In A20 tumour-bearing BALB/c mice, a single 1-hour pulsed FUS treatment (5 min at 43 °C / 5 min at 37 °C) activated the bacteria specifically within tumours, with sustained activity for ≥2 weeks and marked tumour growth suppression comparable to systemic antibody checkpoint therapy. Key relevance: permanent genetic state switch (vs. transient expression) addresses the need for prolonged therapy from a single acoustic activation; directly comparable to the Chen 2022 URB paper above, which uses transient cI857-based de-repression in MG1655.

---
