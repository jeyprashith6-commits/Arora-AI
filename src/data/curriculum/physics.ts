import type { SubjectCurriculum } from '../../types/arora';

export const PHYSICS_CURRICULUM: SubjectCurriculum = {
  id: 'physics',
  name: 'Physics',
  code: '042',
  theoryMarks: 70,
  practicalMarks: 30,
  description:
    '100% complete NCERT CBSE Class 12 Physics (Code 042) curriculum covering all 9 Units (14 Chapters) across Electrostatics, Current Electricity, Magnetism, EMI & AC, EM Waves, Optics, Modern Physics, and Electronic Devices.',
  fullSyllabusOverview:
    'CBSE Class 12 Physics (Code 042) allocates 70 Marks to Theory (3 Hours, 33 questions across Sections A–E) and 30 Marks to Practical Examination (Two Experiments 7+7M, Practical Record 5M, One Activity 3M, Investigatory Project 3M, Viva Voce 5M). Rationalized NCERT deletes Chapter 15 (Communication Systems) and isolated outdated devices while emphasizing conceptual derivations, ray/wave optics diagrams, and numericals.',
  unitWiseWeightage: [
    { unit: 'Unit I & II: Electrostatics & Current Electricity', chapters: 'Ch 1 Electric Charges & Fields, Ch 2 Potential & Capacitance, Ch 3 Current Electricity', marks: 16 },
    { unit: 'Unit III & IV: Magnetic Effects, Magnetism, EMI & AC', chapters: 'Ch 4 Moving Charges, Ch 5 Magnetism & Matter, Ch 6 EMI, Ch 7 Alternating Current', marks: 17 },
    { unit: 'Unit V & VI: Electromagnetic Waves & Optics', chapters: 'Ch 8 EM Waves, Ch 9 Ray Optics & Instruments, Ch 10 Wave Optics', marks: 18 },
    { unit: 'Unit VII & VIII: Dual Nature, Atoms & Nuclei', chapters: 'Ch 11 Dual Nature, Ch 12 Atoms, Ch 13 Nuclei', marks: 12 },
    { unit: 'Unit IX: Electronic Devices', chapters: 'Ch 14 Semiconductor Electronics: Materials, Devices & Simple Circuits', marks: 7 },
  ],
  trustedWebResources: [
    {
      title: 'CBSE Academic Physics Curriculum (Code 042)',
      domain: 'cbseacademic.nic.in',
      url: 'https://cbseacademic.nic.in',
      focus: 'Official 042 Syllabus, Blueprint & Sample Papers',
      summary: 'Authoritative CBSE circular with unit marks, deleted portions, practical list, and Sample Question Papers.',
    },
    {
      title: 'NCERT Physics Part I & II Official Textbooks & Exemplar',
      domain: 'ncert.nic.in',
      url: 'https://ncert.nic.in/textbook.php',
      focus: 'Complete NCERT Derivations & Back Exercises',
      summary: 'Direct access to Class 12 Physics Part I & II PDFs and NCERT Exemplar HOTS problem sets.',
    },
    {
      title: 'Khan Academy Class 12 Physics (India CBSE)',
      domain: 'khanacademy.org',
      url: 'https://www.khanacademy.org/science/in-in-class-12th-physics-india',
      focus: 'Visual Concept Videos & Interactive Practice',
      summary: 'Mapped chapter-for-chapter to CBSE Class 12 Physics with visual intuition on Gauss Law, LCR phasors, Optics, and Quantum Physics.',
    },
    {
      title: 'ePathshala & DIKSHA Virtual Lab / E-Books',
      domain: 'epathshala.ncert.gov.in',
      url: 'https://epathshala.ncert.gov.in',
      focus: 'Flipbooks, OLabs Practicals & Concept Modules',
      summary: 'Ministry of Education portal hosting Class 12 Physics interactive e-resources and experiment simulations.',
    },
    {
      title: 'LearnCBSE Class 12 Physics Notes & Derivations',
      domain: 'learncbse.in',
      url: 'https://www.learncbse.in/cbse-class-12-physics-notes/',
      focus: 'Quick Formula Sheets & Step-by-Step Derivations',
      summary: 'Board-oriented chapter notes, solved numericals, and practical viva question banks.',
    },
  ],
  deletedChapters: [
    {
      title: 'Communication Systems (Chapter 15)',
      reason: 'Removed from rationalized NCERT & CBSE Class 12 Board syllabus.',
    },
  ],
  practicals: [
    'Section A Exp 1: Determine resistivity of two/three wires by plotting a graph for potential difference versus current (Ohm Law).',
    'Section A Exp 2: Find resistance of a given wire/standard resistor using a metre bridge.',
    'Section A Exp 3: Verify the laws of combination (series & parallel) of resistances using a metre bridge.',
    'Section A Exp 4: Determine resistance of a galvanometer by half-deflection method and find its figure of merit.',
    'Section A Exp 5: Find frequency of AC mains with a sonometer (or convert galvanometer into ammeter/voltmeter of given range).',
    'Section B Exp 1: Find value of v for different values of u in case of a concave mirror and find the focal length.',
    'Section B Exp 2: Find the focal length of a convex lens by plotting graphs between u and v or between 1/u and 1/v.',
    'Section B Exp 3: Determine angle of minimum deviation for a given prism by plotting graph between angle of incidence and deviation.',
    'Section B Exp 4: Determine refractive index of a glass slab using a travelling microscope.',
    'Section B Exp 5: Draw the I-V characteristic curve for a p-n junction diode in forward and reverse bias.',
    'Evaluation Split (30M): Two Experiments (7+7M) + Practical Record (5M) + One Activity (3M) + Investigatory Project (3M) + Viva Voce (5M).',
  ],
  chapters: [
    {
      id: 'phy-ch1',
      number: 1,
      title: 'Electric Charges and Fields',
      unit: 'Unit I: Electrostatics',
      weightageMarks: 8,
      topics: [
        'Electric Charges & Conservation of Charge',
        'Coulomb Law & Superposition Principle',
        'Electric Field & Electric Field Lines',
        'Electric Dipole & Torque in Uniform Field',
        'Electric Flux & Gauss Law Applications',
      ],
      subtopics: [
        'Quantization of charge q = ne',
        'Vector form of Coulomb force',
        'Electric field due to infinite line charge and plane sheet',
      ],
      deletedTopics: ['Uniformly charged spherical shell internal field derivation (retained qualitatively; historical 2019–20 derivations pruned in rationalized text)'],
      definitions: [
        { term: 'Electric Flux', definition: 'Total number of electric field lines passing normally through a surface area element: Φ = ∫ E · dA.' },
        { term: 'Electric Dipole Moment', definition: 'Product of either charge magnitude and separation vector directed from -q to +q: p = q(2a).' },
      ],
      concepts: [
        'Charge is quantized in integral multiples of e = 1.6 × 10^-19 C and conserved in isolated systems.',
        'Gauss Law states total electric flux through any closed surface equals 1/ε₀ times enclosed net charge.',
      ],
      formulas: [
        { name: 'Coulomb Force', expression: 'F = (1 / 4πε₀) · (q₁q₂ / r²)', units: 'N' },
        { name: 'Dipole Axial Field', expression: 'E_axial = (1 / 4πε₀) · (2p / r³)', units: 'N/C' },
        { name: 'Torque on Dipole', expression: 'τ = p × E = pE sinθ', units: 'N·m' },
        { name: 'Gauss Law', expression: '∮ E · dA = q_enclosed / ε₀', units: 'N·m²/C' },
      ],
      derivations: [
        {
          title: 'Electric Field Due to an Infinitely Long Straight Uniformly Charged Wire',
          steps: [
            'Consider a linear charge density λ = q/L along an infinite line.',
            'Construct a coaxial cylindrical Gaussian surface of radius r and length l.',
            'Flux through flat end caps is zero since E ⊥ dA; curved surface flux Φ = E(2πrl).',
            'By Gauss Law: E(2πrl) = λl / ε₀ ⇒ E = λ / (2πε₀r).',
          ],
        },
      ],
      diagramId: 'gauss_electric_field',
      diagramCaption: 'Interactive Gauss Law cylindrical flux surface around a charged wire.',
      solvedExamples: [
        {
          problem: 'Calculate the electric flux through a sphere of radius 10 cm enclosing a +8.854 μC charge.',
          solutionSteps: [
            'Given q = +8.854 × 10^-6 C, ε₀ = 8.854 × 10^-12 C²/N·m².',
            'Apply Gauss Law: Φ = q / ε₀ (independent of radius).',
            'Φ = (8.854 × 10^-6) / (8.854 × 10^-12) = 10^6 N·m²/C.',
          ],
          finalAnswer: '1.0 × 10^6 N·m²/C',
        },
      ],
      exercises: [
        'Explain why two electric field lines never intersect.',
        'Derive expression for electric field on the equatorial plane of an electric dipole.',
      ],
      practicalMaterial: 'Electroscope & Van de Graaff qualitative demonstration of charge induction.',
      detailedNotes: [
        'Continuous charge distributions use linear λ = dq/dl (C/m), surface σ = dq/dA (C/m²), and volume ρ = dq/dV (C/m³).',
        'Gaussian surface choice depends on symmetry: cylindrical for infinite line charge (E = λ / 2πε₀r), pillbox for infinite plane sheet (E = σ / 2ε₀ independent of distance), spherical shell (E = 0 inside; E = kq/r² outside).',
        'Electric dipole in uniform E experiences zero net force (F_net = 0) but torque τ = p × E, tending to align p along E.',
      ],
      boardExamTips: [
        'Always draw arrow directions for electric field vectors AND outward area vector dÂ in Gauss Law 3-mark derivations.',
      ],
      learningOutcomes: ['Apply Coulomb Law in vector form', 'Compute electric flux using Gauss Law symmetry'],
      referenceCoverage: ['NCERT', 'NCERT Exemplar', 'S.L. Arora', 'Oswaal', 'Xam Idea'],
    },
    {
      id: 'phy-ch2',
      number: 2,
      title: 'Electrostatic Potential and Capacitance',
      unit: 'Unit I: Electrostatics',
      weightageMarks: 8,
      topics: ['Electrostatic Potential', 'Equipotential Surfaces', 'Potential Energy of Charge System', 'Dielectrics & Polarisation', 'Parallel Plate Capacitor & Energy Stored'],
      subtopics: ['Relation E = -dV/dr', 'Effect of dielectric slab on capacitance', 'Series and parallel capacitor combinations'],
      deletedTopics: ['Van de Graaff Generator (removed from CBSE Board examination scope)'],
      definitions: [
        { term: 'Equipotential Surface', definition: 'Locus of points having identical electrostatic potential; electric field lines are always perpendicular to it.' },
        { term: 'Capacitance', definition: 'Ratio of charge stored on a conductor to its potential rise: C = Q / V (measured in Farad).' },
      ],
      concepts: [
        'Work done in moving a test charge between two points on an equipotential surface is strictly zero.',
        'Inserting a dielectric of constant K fills the gap and multiplies capacitance by K.',
      ],
      formulas: [
        { name: 'Point Charge Potential', expression: 'V = (1 / 4πε₀) · (q / r)', units: 'V' },
        { name: 'Parallel Plate Capacitance', expression: 'C = ε₀ A / d', units: 'F' },
        { name: 'Energy Stored in Capacitor', expression: 'U = ½ CV² = Q² / 2C', units: 'J' },
      ],
      derivations: [
        {
          title: 'Capacitance of Parallel Plate Capacitor with Dielectric Slab',
          steps: [
            'Plate separation d, dielectric slab of thickness t (< d) and constant K.',
            'Potential difference V = E₀(d - t) + (E₀/K)t = (σ/ε₀)[d - t + t/K].',
            'C = Q / V = ε₀A / (d - t + t/K).',
          ],
        },
      ],
      solvedExamples: [
        {
          problem: 'A 12 pF capacitor is connected to a 50 V battery. Find electrostatic energy stored.',
          solutionSteps: ['C = 12 × 10^-12 F, V = 50 V.', 'U = ½ CV² = 0.5 × 12 × 10^-12 × 2500 = 1.5 × 10^-8 J.'],
          finalAnswer: '1.5 × 10^-8 J',
        },
      ],
      exercises: ['Show that electric field is normal to an equipotential surface.', 'Compare energy stored when battery remains connected vs disconnected on dielectric insertion.'],
      learningOutcomes: ['Analyze potential energy of charge distributions', 'Calculate equivalent capacitance with dielectrics'],
      referenceCoverage: ['NCERT', 'NCERT Exemplar', 'S.L. Arora', 'MTG'],
    },
    {
      id: 'phy-ch3',
      number: 3,
      title: 'Current Electricity',
      unit: 'Unit II: Current Electricity',
      weightageMarks: 7,
      topics: ['Drift Velocity & Mobility', 'Ohm Law & Limitations', 'Temperature Dependence of Resistivity', 'Internal Resistance & Cell Combinations', 'Kirchhoff Rules & Wheatstone Bridge'],
      subtopics: ['I = n e A v_d', 'Kirchhoff Junction & Loop Rules', 'Balanced Wheatstone bridge condition'],
      deletedTopics: ['Carbon resistor colour coding', 'Meter Bridge & Potentiometer (removed from theory syllabus; Meter Bridge retained in Practicals)'],
      definitions: [
        { term: 'Drift Velocity', definition: 'Average velocity gained by free electrons opposite to applied electric field: v_d = (eE/m)τ.' },
        { term: 'EMF of a Cell', definition: 'Potential difference across cell terminals in an open circuit (zero current).' },
      ],
      concepts: [
        'Kirchhoff Junction Rule expresses conservation of charge; Loop Rule expresses conservation of energy.',
        'At balanced Wheatstone condition, P/Q = R/S and galvanometer current is zero.',
      ],
      formulas: [
        { name: 'Current & Drift Velocity', expression: 'I = n e A v_d', units: 'A' },
        { name: 'Terminal Voltage', expression: 'V = E - I r', units: 'V' },
        { name: 'Resistivity', expression: 'ρ = m / (n e² τ)', units: 'Ω·m' },
      ],
      derivations: [
        {
          title: 'Balanced Condition of Wheatstone Bridge using Kirchhoff Laws',
          steps: [
            'Set galvanometer current Ig = 0 for null deflection.',
            'Apply Loop rule to loop ABDA: I₁P - I₂R = 0 ⇒ I₁/I₂ = R/P.',
            'Apply Loop rule to loop BCDB: I₁Q - I₂S = 0 ⇒ I₁/I₂ = S/Q. Hence P/Q = R/S.',
          ],
        },
      ],
      solvedExamples: [
        {
          problem: 'A battery of EMF 10 V and internal resistance 3 Ω is connected to a resistor. Current is 0.5 A. Find resistor value and terminal voltage.',
          solutionSteps: ['I = E / (R + r) ⇒ 0.5 = 10 / (R + 3) ⇒ R + 3 = 20 ⇒ R = 17 Ω.', 'V = IR = 0.5 × 17 = 8.5 V.'],
          finalAnswer: 'R = 17 Ω, V = 8.5 V',
        },
      ],
      exercises: ['State why alloys like Manganin are used in standard resistors.', 'Apply Kirchhoff rules to solve a two-loop bridge circuit.'],
      practicalMaterial: 'Metre bridge verification of series and parallel resistance laws.',
      detailedNotes: [
        'Relation between current density J, conductivity σ, and E: J = σE (microscopic Ohm Law), where σ = ne²τ/m.',
        'For conductors, resistivity rises with temperature (positive α) due to higher collision frequency; for semiconductors, n rises exponentially with T so ρ decreases (negative α).',
        'Equivalent EMF of cells in parallel: E_eq = (E₁r₂ + E₂r₁)/(r₁ + r₂) and r_eq = (r₁r₂)/(r₁ + r₂).',
      ],
      boardExamTips: [
        'Sign convention check for Kirchhoff KVL: traversing battery from negative to positive adds +E; moving along assumed current through resistor adds -IR.',
      ],
      learningOutcomes: ['Solve multi-loop DC circuits using Kirchhoff rules', 'Relate microscopic drift speed to macroscopic resistance'],
      referenceCoverage: ['NCERT', 'S.L. Arora', 'Together With', 'Oswaal'],
    },
    {
      id: 'phy-ch4',
      number: 4,
      title: 'Moving Charges and Magnetism',
      unit: 'Unit III: Magnetic Effects of Current and Magnetism',
      weightageMarks: 8,
      topics: ['Biot-Savart Law', 'Ampere Circuital Law', 'Lorentz Force', 'Force Between Parallel Conductors', 'Moving Coil Galvanometer'],
      subtopics: ['Magnetic field on axis of circular current loop', 'Solenoid field B = μ₀nI', 'Conversion of galvanometer into ammeter and voltmeter'],
      deletedTopics: ['Cyclotron (removed from CBSE Board syllabus)', 'Toroid quantitative derivation (retained conceptually only)'],
      definitions: [
        { term: '1 Ampere', definition: 'Constant current which, maintained in two infinite parallel conductors 1 m apart in vacuum, produces force 2 × 10^-7 N/m.' },
        { term: 'Current Sensitivity', definition: 'Deflection per unit current in a moving coil galvanometer: θ/I = NBA/k.' },
      ],
      concepts: [
        'Magnetic force F = q(v × B) does zero work on a moving charge because force is perpendicular to velocity.',
        'Parallel currents in the same direction attract; opposite currents repel.',
      ],
      formulas: [
        { name: 'Biot-Savart Law', expression: 'dB = (μ₀ / 4π) · (I dl sinθ / r²)', units: 'T' },
        { name: 'Solenoid Magnetic Field', expression: 'B = μ₀ n I', units: 'T' },
        { name: 'Shunt Resistance for Ammeter', expression: 'S = (I_g · G) / (I - I_g)', units: 'Ω' },
      ],
      derivations: [
        {
          title: 'Magnetic Field on the Axis of a Circular Current Loop',
          steps: [
            'Consider loop of radius R carrying current I; point P at axial distance x.',
            'Distance from element dl to P is r = √(R² + x²).',
            'Vertical dB cosθ components cancel; axial dB sinθ components add up.',
            'Integrating over 2πR yields B = (μ₀ I R²) / [2(R² + x²)^(3/2)].',
          ],
        },
      ],
      solvedExamples: [
        {
          problem: 'A galvanometer of resistance 15 Ω gives full-scale deflection for 4 mA. How to convert it into an ammeter of range 0 to 6 A?',
          solutionSteps: ['S = (I_g G) / (I - I_g) = (0.004 × 15) / (6 - 0.004) = 0.06 / 5.996 ≈ 0.01 Ω in parallel.'],
          finalAnswer: 'Connect 0.01 Ω shunt in parallel',
        },
      ],
      exercises: ['Explain why a radial magnetic field is used in a moving coil galvanometer.'],
      learningOutcomes: ['Apply Biot-Savart and Ampere laws', 'Design ammeter and voltmeter conversions'],
      referenceCoverage: ['NCERT', 'NCERT Exemplar', 'S.L. Arora', 'Xam Idea'],
    },
    {
      id: 'phy-ch5',
      number: 5,
      title: 'Magnetism and Matter',
      unit: 'Unit III: Magnetic Effects of Current and Magnetism',
      weightageMarks: 4,
      topics: ['Bar Magnet as Equivalent Solenoid', 'Magnetic Field Lines', 'Gauss Law for Magnetism', 'Diamagnetic, Paramagnetic & Ferromagnetic Materials', 'Temperature Effect on Magnetisation'],
      subtopics: ['Torque on magnetic dipole', 'Curie Law qualitative behavior'],
      deletedTopics: ['Earth Magnetism (Declination, Dip, Horizontal Component)', 'Hysteresis loop & Electromagnets/Permanent magnets detailed treatment'],
      definitions: [
        { term: 'Gauss Law for Magnetism', definition: 'Net magnetic flux through any closed surface is zero (∮ B · dA = 0), proving magnetic monopoles do not exist.' },
      ],
      concepts: [
        'Diamagnetic substances are weakly repelled by magnetic fields; paramagnetic weakly attracted; ferromagnetic strongly attracted.',
      ],
      formulas: [
        { name: 'Magnetic Dipole Torque', expression: 'τ = m B sinθ', units: 'N·m' },
        { name: 'Potential Energy', expression: 'U = -m · B = -mB cosθ', units: 'J' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'A short bar magnet has magnetic moment 0.48 J/T. Find magnetic field at 10 cm on its axis.',
          solutionSteps: ['B = (μ₀/4π) · (2m / r³) = 10^-7 × (2 × 0.48) / (0.1)³ = 9.6 × 10^-5 T.'],
          finalAnswer: '9.6 × 10^-5 T',
        },
      ],
      exercises: ['Distinguish between diamagnetic and paramagnetic substances using susceptibility χ.'],
      learningOutcomes: ['Classify magnetic materials by susceptibility and permeability'],
      referenceCoverage: ['NCERT', 'All in One', 'Oswaal'],
    },
    {
      id: 'phy-ch6',
      number: 6,
      title: 'Electromagnetic Induction',
      unit: 'Unit IV: Electromagnetic Induction and Alternating Currents',
      weightageMarks: 8,
      topics: ['Faraday Laws of EMI', 'Lenz Law & Energy Conservation', 'Motional EMF', 'Self Inductance & Mutual Inductance', 'AC Generator Principle'],
      subtopics: ['ε = -dΦ/dt', 'Self-inductance of a long solenoid', 'Coaxial solenoids mutual inductance'],
      deletedTopics: ['Eddy Currents (removed from CBSE Board theory)'],
      definitions: [
        { term: 'Lenz Law', definition: 'Polarity of induced EMF tends to produce a current that opposes the change in magnetic flux that produced it.' },
      ],
      concepts: [
        'Lenz Law is a direct consequence of the law of conservation of energy.',
        'Motional EMF across a conductor rod of length l moving at speed v perpendicular to B is ε = B l v.',
      ],
      formulas: [
        { name: 'Faraday Law', expression: 'ε = -N (dΦ_B / dt)', units: 'V' },
        { name: 'Solenoid Self-Inductance', expression: 'L = μ₀ n² A l', units: 'H' },
        { name: 'Energy in Inductor', expression: 'U = ½ L I²', units: 'J' },
      ],
      derivations: [
        {
          title: 'Mutual Inductance of Two Long Coaxial Solenoids',
          steps: [
            'Pass current I₂ through outer solenoid S₂ producing B₂ = μ₀ n₂ I₂.',
            'Flux linked with inner solenoid S₁ (N₁ = n₁l, area A₁): Φ₁ = N₁ B₂ A₁ = μ₀ n₁ n₂ A₁ l I₂.',
            'Thus M₁₂ = μ₀ n₁ n₂ π r₁² l.',
          ],
        },
      ],
      solvedExamples: [
        {
          problem: 'Current in a coil falls from 5 A to 0 A in 0.1 s inducing 200 V. Find self-inductance.',
          solutionSteps: ['ε = L |ΔI / Δt| ⇒ 200 = L × (5 / 0.1) ⇒ L = 200 / 50 = 4 H.'],
          finalAnswer: '4 H',
        },
      ],
      exercises: ['Explain how Lenz law upholds conservation of energy when a bar magnet approaches a coil.'],
      learningOutcomes: ['Compute induced EMF and inductance of coaxial solenoids'],
      referenceCoverage: ['NCERT', 'NCERT Exemplar', 'S.L. Arora', 'MTG'],
    },
    {
      id: 'phy-ch7',
      number: 7,
      title: 'Alternating Current',
      unit: 'Unit IV: Electromagnetic Induction and Alternating Currents',
      weightageMarks: 8,
      topics: ['Peak & RMS Values of AC', 'AC through R, L, and C', 'Series LCR Circuit & Phasors', 'Resonance & Power Factor', 'Transformers'],
      subtopics: ['Impedance Z = √(R² + (X_L - X_C)²)', 'Resonant frequency ω₀ = 1/√(LC)', 'Step-up and step-down transformer energy losses'],
      deletedTopics: ['LC Oscillations (removed)', 'Quality factor Q-factor sharpness derivation (removed)'],
      definitions: [
        { term: 'Power Factor', definition: 'Cosine of phase angle φ between voltage and current: cosφ = R / Z.' },
        { term: 'Electrical Resonance', definition: 'Condition in series LCR circuit when X_L = X_C, making impedance minimum (Z = R) and current maximum.' },
      ],
      concepts: [
        'Pure inductor and pure capacitor consume zero average power over a complete AC cycle (wattless current).',
      ],
      formulas: [
        { name: 'RMS Current', expression: 'I_rms = I₀ / √2 ≈ 0.707 I₀', units: 'A' },
        { name: 'Series LCR Impedance', expression: 'Z = √(R² + (X_L - X_C)²)', units: 'Ω' },
        { name: 'Average Power', expression: 'P = V_rms I_rms cosφ', units: 'W' },
      ],
      derivations: [
        {
          title: 'Impedance and Phase Angle of Series LCR Circuit',
          steps: [
            'Draw phasor diagram: V_R along I, V_L leads I by 90°, V_C lags I by 90°.',
            'Net reactive voltage = V_L - V_C; resultant V = √(V_R² + (V_L - V_C)²).',
            'Divide by I: Z = √(R² + (X_L - X_C)²) and tanφ = (X_L - X_C) / R.',
          ],
        },
      ],
      diagramId: 'lcr_resonance',
      diagramCaption: 'Interactive Series LCR Impedance & Resonance Curve (vary L, C, R).',
      solvedExamples: [
        {
          problem: 'Find resonant frequency of a series LCR circuit with L = 2 H, C = 32 μF, R = 10 Ω.',
          solutionSteps: ['ω₀ = 1 / √(LC) = 1 / √(2 × 32 × 10^-6) = 1 / (8 × 10^-3) = 125 rad/s.'],
          finalAnswer: '125 rad/s (≈ 19.9 Hz)',
        },
      ],
      exercises: ['List four sources of energy loss in a real transformer and how they are minimized.'],
      detailedNotes: [
        'Four transformer losses: Copper loss (thick copper windings), Eddy current loss (laminated soft iron core), Hysteresis loss (low-retentivity soft iron core), and Flux leakage (wound coils over shared core).',
        'In series LCR circuit: at inductive resonance ω₀ = 1/√(LC), current amplitude is peak I_max = V₀/R and phase difference φ = 0.',
      ],
      boardExamTips: [
        'Do NOT study LC Oscillations or Q-factor sharpness derivations for board theory—both are omitted in the current rationalized syllabus.',
      ],
      learningOutcomes: ['Analyze AC phasors, resonance, and transformer efficiency'],
      referenceCoverage: ['NCERT', 'S.L. Arora', 'Oswaal', 'Xam Idea'],
    },
    {
      id: 'phy-ch8',
      number: 8,
      title: 'Electromagnetic Waves',
      unit: 'Unit V: Electromagnetic Waves',
      weightageMarks: 3,
      topics: ['Displacement Current', 'Characteristics of EM Waves', 'Transverse Nature', 'Electromagnetic Spectrum & Uses'],
      subtopics: ['I_d = ε₀ dΦ_E/dt', 'Radio, Microwave, IR, Visible, UV, X-rays, Gamma rays'],
      deletedTopics: ['None significant; displacement current kept concise'],
      definitions: [
        { term: 'Displacement Current', definition: 'Current arising from time-varying electric flux: I_d = ε₀ (dΦ_E / dt).' },
      ],
      concepts: ['In vacuum, c = 1/√(μ₀ε₀) = E₀/B₀ = 3 × 10^8 m/s, with E ⊥ B ⊥ propagation direction.'],
      formulas: [{ name: 'Speed of EM Wave', expression: 'c = 1 / √(μ₀ ε₀) = E₀ / B₀', units: 'm/s' }],
      derivations: [],
      solvedExamples: [
        {
          problem: 'An EM wave has peak magnetic field B₀ = 20 nT. Find peak electric field E₀.',
          solutionSteps: ['E₀ = c B₀ = 3 × 10^8 × 20 × 10^-9 = 6 V/m.'],
          finalAnswer: '6 V/m',
        },
      ],
      exercises: ['Name the EM waves used in radar systems and LASIK eye surgery.'],
      learningOutcomes: ['Identify EM spectrum bands by wavelength and practical applications'],
      referenceCoverage: ['NCERT', 'Together With', 'MTG'],
    },
    {
      id: 'phy-ch9',
      number: 9,
      title: 'Ray Optics and Optical Instruments',
      unit: 'Unit VI: Optics',
      weightageMarks: 9,
      topics: ['Spherical Mirrors & Mirror Formula', 'Refraction & Total Internal Reflection', 'Refraction at Spherical Surfaces & Lens Maker Formula', 'Refraction through Prism', 'Microscope & Astronomical Telescope'],
      subtopics: ['Optical fibres via TIR', 'Power of lens combination', 'Magnifying power of compound microscope and refracting/reflecting telescope'],
      deletedTopics: ['Scattering of light (blue sky/red sunset)', 'Human eye defects'],
      definitions: [
        { term: 'Total Internal Reflection', definition: 'Complete reflection of light back into a denser medium when angle of incidence exceeds critical angle i_c = sin^-1(1/n).' },
      ],
      concepts: ['Reflecting telescopes eliminate chromatic aberration and offer higher light-gathering power.'],
      formulas: [
        { name: 'Lens Maker Formula', expression: '1/f = (n - 1)(1/R₁ - 1/R₂)', units: 'm^-1' },
        { name: 'Prism Refractive Index', expression: 'n = sin((A + D_m)/2) / sin(A/2)', units: 'dimensionless' },
        { name: 'Telescope Magnification (Normal)', expression: 'M = f_o / f_e', units: 'dimensionless' },
      ],
      derivations: [
        {
          title: 'Refraction through a Triangular Glass Prism',
          steps: [
            'Angle of prism A = r₁ + r₂ and deviation δ = (i + e) - A.',
            'At minimum deviation D_m: i = e and r₁ = r₂ = r = A/2.',
            'From Snell Law: n = sin((A + D_m)/2) / sin(A/2).',
          ],
        },
      ],
      diagramId: 'prism_refraction',
      diagramCaption: 'Interactive Prism Ray Deviation Explorer (adjust apex angle A and refractive index n).',
      solvedExamples: [
        {
          problem: 'Find critical angle for diamond (n = 2.42) in air.',
          solutionSteps: ['sin(i_c) = 1 / 2.42 = 0.4132 ⇒ i_c ≈ 24.4°.'],
          finalAnswer: '24.4°',
        },
      ],
      exercises: ['Draw ray diagram of a compound microscope forming image at least distance of distinct vision.'],
      practicalMaterial: 'Focal length of convex lens and prism minimum deviation graph.',
      detailedNotes: [
        'Cartesian sign convention measures all distances from optical pole/centre along incident light (+ve) or opposite (-ve).',
        'Reflecting telescope (Cassegrain) avoids chromatic aberration, cuts spherical aberration via paraboloidal primary mirror, and needs lighter mechanical support.',
        'Thin lenses in contact: net power P = P₁ + P₂ and 1/f_eq = 1/f₁ + 1/f₂.',
      ],
      boardExamTips: [
        'Arrowheads on EVERY light ray and distinction between real inverted vs virtual final image in telescope/microscope diagrams carry 1–1.5 direct marks!',
      ],
      learningOutcomes: ['Derive Lens Maker and Prism formulas', 'Compute angular magnification of optical instruments'],
      referenceCoverage: ['NCERT', 'S.L. Arora', 'Oswaal', 'Xam Idea'],
    },
    {
      id: 'phy-ch10',
      number: 10,
      title: 'Wave Optics',
      unit: 'Unit VI: Optics',
      weightageMarks: 9,
      topics: ['Huygens Principle', 'Reflection & Refraction via Wavefronts', 'Coherent Interference & YDSE', 'Single Slit Diffraction'],
      subtopics: ['Fringe width β = λD/d', 'Path difference conditions for constructive/destructive interference', 'Central maximum width in diffraction'],
      deletedTopics: ['Polarisation, Brewster Law & Polaroids', 'Resolving power of microscope and telescope'],
      definitions: [
        { term: 'Wavefront', definition: 'Locus of all medium particles vibrating in the same phase at a given instant.' },
      ],
      concepts: ['Coherent sources maintain constant phase difference; interference redistributes energy without violating conservation.'],
      formulas: [
        { name: 'YDSE Fringe Width', expression: 'β = λ D / d', units: 'm' },
        { name: 'Resultant Intensity', expression: 'I = 4 I₀ cos²(φ/2)', units: 'W/m²' },
        { name: 'Diffraction First Minimum', expression: 'a sinθ = λ', units: 'rad' },
      ],
      derivations: [
        {
          title: 'Verification of Laws of Refraction using Huygens Principle',
          steps: [
            'Plane wavefront AB incident at angle i on interface separating media of speeds v₁ and v₂.',
            'Secondary wavelet from B reaches C in time t = BC/v₁ while A reaches E at radius v₂t.',
            'sin(i)/sin(r) = (v₁t/AC) / (v₂t/AC) = v₁/v₂ = n₂/n₁ (Snell Law).',
          ],
        },
      ],
      solvedExamples: [
        {
          problem: 'In YDSE, slit separation d = 1 mm, screen D = 1 m, λ = 500 nm. Find fringe width.',
          solutionSteps: ['β = λD/d = (500 × 10^-9 × 1) / 10^-3 = 5 × 10^-4 m = 0.5 mm.'],
          finalAnswer: '0.5 mm',
        },
      ],
      exercises: ['Compare intensity distribution of YDSE interference fringes with single-slit diffraction pattern.'],
      learningOutcomes: ['Prove Snell Law via Huygens wavelets', 'Calculate fringe width and diffraction minima'],
      referenceCoverage: ['NCERT', 'NCERT Exemplar', 'S.L. Arora', 'MTG'],
    },
    {
      id: 'phy-ch11',
      number: 11,
      title: 'Dual Nature of Radiation and Matter',
      unit: 'Unit VII: Dual Nature of Radiation and Matter',
      weightageMarks: 5,
      topics: ['Photoelectric Effect & Lenard Observations', 'Einstein Photoelectric Equation', 'Threshold Frequency & Work Function', 'de Broglie Matter Waves'],
      subtopics: ['Stopping potential vs frequency graph', 'de Broglie wavelength λ = h / √(2m eV)'],
      deletedTopics: ['Davisson-Germer Experiment (removed from CBSE Board theory)'],
      definitions: [
        { term: 'Work Function', definition: 'Minimum photon energy needed to eject an electron from a metal surface without kinetic energy: Φ₀ = hν₀.' },
      ],
      concepts: ['Wave theory failed to explain instantaneous emission and threshold frequency; Einstein photon model explained both.'],
      formulas: [
        { name: 'Einstein Equation', expression: 'hν = Φ₀ + K_max = hν₀ + e V₀', units: 'J' },
        { name: 'de Broglie Wavelength', expression: 'λ = h / p = h / √(2mK)', units: 'm' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Find de Broglie wavelength of an electron accelerated through 100 V.',
          solutionSteps: ['λ = 1.227 / √V nm = 1.227 / √100 = 0.1227 nm.'],
          finalAnswer: '0.1227 nm (1.227 Å)',
        },
      ],
      exercises: ['Plot stopping potential versus frequency for two metals and show slope equals h/e.'],
      learningOutcomes: ['Solve Einstein photoelectric problems and matter wave wavelengths'],
      referenceCoverage: ['NCERT', 'Oswaal', 'All in One'],
    },
    {
      id: 'phy-ch12',
      number: 12,
      title: 'Atoms',
      unit: 'Unit VIII: Atoms and Nuclei',
      weightageMarks: 6,
      topics: ['Alpha-Particle Scattering & Rutherford Model', 'Bohr Model of Hydrogen Atom', 'Energy Levels & Line Spectra', 'de Broglie Explanation of Bohr Quantisation'],
      subtopics: ['Distance of closest approach', 'Bohr radius & energy E_n = -13.6/n² eV', 'Lyman, Balmer, Paschen series'],
      deletedTopics: ['None significant'],
      definitions: [
        { term: 'Impact Parameter', definition: 'Perpendicular distance of initial velocity vector of alpha particle from the centre of nucleus.' },
      ],
      concepts: ['Standing matter waves on circular orbits require 2πr = nλ, directly yielding Bohr angular momentum quantisation mvr = nh/2π.'],
      formulas: [
        { name: 'Bohr Orbit Radius', expression: 'r_n = 0.529 × n² Å', units: 'Å' },
        { name: 'Hydrogen Energy Level', expression: 'E_n = -13.6 / n² eV', units: 'eV' },
      ],
      derivations: [
        {
          title: 'Total Energy of Electron in nth Bohr Orbit',
          steps: [
            'Centripetal force: mv²/r = ke²/r² ⇒ K = ke²/(2r).',
            'Potential energy U = -ke²/r.',
            'Total energy E = K + U = -ke²/(2r) = -13.6 / n² eV.',
          ],
        },
      ],
      diagramId: 'bohr_hydrogen_levels',
      diagramCaption: 'Interactive Hydrogen Atom Energy Level & Spectral Transition Visualizer.',
      solvedExamples: [
        {
          problem: 'Calculate energy emitted when H-atom transitions from n = 3 to n = 2.',
          solutionSteps: ['ΔE = E₃ - E₂ = (-1.51) - (-3.40) = 1.89 eV.'],
          finalAnswer: '1.89 eV (H-alpha Balmer line)',
        },
      ],
      exercises: ['Explain Bohr quantisation condition using de Broglie hypothesis.'],
      learningOutcomes: ['Compute transition wavelengths and energy levels in hydrogen-like atoms'],
      referenceCoverage: ['NCERT', 'S.L. Arora', 'Together With'],
    },
    {
      id: 'phy-ch13',
      number: 13,
      title: 'Nuclei',
      unit: 'Unit VIII: Atoms and Nuclei',
      weightageMarks: 6,
      topics: ['Nuclear Size & Density', 'Mass Defect & Binding Energy', 'Nuclear Fission & Fusion', 'Nuclear Force Properties'],
      subtopics: ['R = R₀ A^(1/3)', 'Binding energy per nucleon curve'],
      deletedTopics: ['Radioactivity (Alpha, Beta, Gamma decay laws, Half-life, Mean life)'],
      definitions: [
        { term: 'Mass Defect', definition: 'Difference between sum of nucleon masses and actual nuclear mass: Δm = [Z m_p + (A-Z)m_n] - M.' },
      ],
      concepts: ['Nuclear density is remarkably independent of mass number A.', 'Maximum stability occurs near Fe-56 (8.8 MeV/nucleon).'],
      formulas: [
        { name: 'Nuclear Radius', expression: 'R = R₀ A^(1/3), R₀ ≈ 1.2 fm', units: 'm' },
        { name: 'Binding Energy', expression: 'BE = Δm × 931.5 MeV', units: 'MeV' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Find ratio of nuclear radii of Gold (A=197) and Silver (A=107).',
          solutionSteps: ['R₁/R₂ = (197/107)^(1/3) ≈ (1.841)^(1/3) ≈ 1.226.'],
          finalAnswer: '1.23 : 1',
        },
      ],
      exercises: ['Draw binding energy per nucleon curve and explain energy release in both fission and fusion.'],
      learningOutcomes: ['Calculate binding energy and interpret nuclear stability'],
      referenceCoverage: ['NCERT', 'Xam Idea', 'Oswaal'],
    },
    {
      id: 'phy-ch14',
      number: 14,
      title: 'Semiconductor Electronics: Materials, Devices and Simple Circuits',
      unit: 'Unit IX: Electronic Devices',
      weightageMarks: 7,
      topics: ['Energy Bands in Conductors, Insulators & Semiconductors', 'Intrinsic & Extrinsic Semiconductors', 'p-n Junction Formation & Depletion Layer', 'Forward & Reverse Bias I-V Characteristics', 'Half-Wave & Full-Wave Rectifiers'],
      subtopics: ['n-type vs p-type doping', 'Barrier potential & drift vs diffusion current'],
      deletedTopics: ['Zener Diode, Photodiode, LED, Solar Cell (special purpose diodes)', 'Transistors & Digital Logic Gates (removed from Physics theory; Logic Gates studied in Computer Science)'],
      definitions: [
        { term: 'Depletion Region', definition: 'Space-charge region near the p-n junction depleted of mobile charge carriers containing immobile donor/acceptor ions.' },
      ],
      concepts: ['Full-wave rectifier utilizes both halves of input AC cycle using a centre-tapped transformer and two diodes.'],
      formulas: [
        { name: 'Mass Action Law', expression: 'n_e · n_h = n_i²', units: 'm^-6' },
      ],
      derivations: [],
      diagramId: 'pn_junction_diode',
      diagramCaption: 'Interactive p-n Junction Depletion Layer & Forward/Reverse Bias Characteristic Curve.',
      solvedExamples: [
        {
          problem: 'An intrinsic Si crystal has n_i = 1.5 × 10^16 m^-3. If doped with 5 × 10^22 m^-3 pentavalent atoms, find hole concentration.',
          solutionSteps: ['n_h = n_i² / n_e = (2.25 × 10^32) / (5 × 10^22) = 4.5 × 10^9 m^-3.'],
          finalAnswer: '4.5 × 10^9 m^-3',
        },
      ],
      exercises: ['Draw circuit diagram and input/output waveforms of a full-wave rectifier.'],
      practicalMaterial: 'I-V characteristics of p-n junction diode in forward and reverse bias.',
      learningOutcomes: ['Distinguish energy band diagrams and explain rectification'],
      referenceCoverage: ['NCERT', 'NCERT Exemplar', 'S.L. Arora', 'Oswaal'],
    },
  ],
};
