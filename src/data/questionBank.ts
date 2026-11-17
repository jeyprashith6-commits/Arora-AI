import type {
  DifficultyLevel,
  MockTestConfig,
  QuestionItem,
  QuestionType,
  SubjectId,
} from '../types/arora';
import { CBSE_CLASS_12_CURRICULUM, getSubjectById } from './curriculum';
import { GUIDE_PRACTICE_QUESTIONS, LAST_6_YEARS_PYQ_ARCHIVE } from './pyqAndGuides';
import { deduplicateQuestions } from '../engines/questionBankEngine';

export const CORE_QUESTION_BANK: QuestionItem[] = [
  // PHYSICS
  {
    id: 'qb-phy-1',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch1',
    chapterTitle: 'Electric Charges and Fields',
    topic: 'Electric Flux & Gauss Law Applications',
    marks: 1,
    difficulty: 'Moderate',
    type: 'MCQ',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE',
    isPreviousYear: true,
    pyqYear: 2024,
    questionText:
      'A Gaussian sphere encloses an electric dipole of dipole moment p. What is the total electric flux emerging out of the sphere?',
    options: ['p / ε₀', '2q / ε₀', 'Zero', 'q / (4πε₀)'],
    correctOptionIndex: 2,
    correctAnswer: 'Zero',
    explanation:
      'An electric dipole consists of +q and -q charges, so net enclosed charge q_net = +q - q = 0. By Gauss Law, Φ = q_net / ε₀ = 0.',
    diagramId: 'gauss_electric_field',
  },
  {
    id: 'qb-phy-2',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch2',
    chapterTitle: 'Electrostatic Potential and Capacitance',
    topic: 'Parallel Plate Capacitor & Energy Stored',
    marks: 1,
    difficulty: 'Hard',
    type: 'Assertion-Reason',
    sourceBook: 'NCERT Exemplar',
    sourceCategory: 'NCERT / Exemplar',
    isPreviousYear: false,
    questionText: 'Select the correct option for the Assertion and Reason below.',
    assertionText:
      'Assertion (A): If a dielectric slab is inserted between plates of an isolated charged capacitor, its stored electrostatic energy decreases.',
    reasonText:
      'Reason (R): Capacitance increases by factor K while charge Q remains constant, so U = Q²/(2C) decreases by factor K.',
    options: [
      'Both A and R are true and R is the correct explanation of A',
      'Both A and R are true but R is NOT the correct explanation of A',
      'A is true but R is false',
      'A is false but R is true',
    ],
    correctOptionIndex: 0,
    correctAnswer: 'Both A and R are true and R is the correct explanation of A',
    explanation:
      'In an isolated capacitor, Q is conserved. Inserting a dielectric raises C to KC, reducing U = Q²/(2KC). The lost energy goes into mechanical work pulling the slab in.',
  },
  {
    id: 'qb-phy-3',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch3',
    chapterTitle: 'Current Electricity',
    topic: 'Kirchhoff Rules & Wheatstone Bridge',
    marks: 3,
    difficulty: 'Moderate',
    type: 'Numerical',
    sourceBook: 'S.L. Arora',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'A cell of EMF 2 V and internal resistance 0.1 Ω is connected to a 3.9 Ω external resistor. Calculate (i) circuit current, (ii) terminal potential difference, and (iii) power dissipated in the external resistor.',
    correctAnswer: 'I = 0.5 A, V = 1.95 V, P = 0.975 W',
    explanation:
      'I = E/(R+r) = 2/(3.9+0.1) = 0.5 A. Terminal voltage V = E - Ir = 2 - 0.5(0.1) = 1.95 V. Power P = I²R = (0.5)² × 3.9 = 0.975 W.',
  },
  {
    id: 'qb-phy-4',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch6',
    chapterTitle: 'Electromagnetic Induction',
    topic: 'Motional EMF',
    marks: 2,
    difficulty: 'Moderate',
    type: '2-Mark',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE',
    isPreviousYear: true,
    pyqYear: 2023,
    questionText:
      'A metallic rod of length 1 m is rotated with angular frequency 50 rad/s about one end in a uniform magnetic field B = 0.4 T perpendicular to the plane of rotation. Calculate the induced EMF between its ends.',
    correctAnswer: '10 V',
    explanation:
      'Motional EMF of a rotating rod is ε = ½ B ω l² = 0.5 × 0.4 × 50 × 1² = 10 V.',
  },
  {
    id: 'qb-phy-5',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch7',
    chapterTitle: 'Alternating Current',
    topic: 'Resonance & Power Factor',
    marks: 4,
    difficulty: 'Hard',
    type: '4-Mark Case Study',
    sourceBook: 'Oswaal',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'Case Study: A radio tuning stage uses a series LCR circuit with L = 4 mH, C = 10 μF, and R = 20 Ω driven by a 220 V variable-frequency AC source. Calculate (a) resonant angular frequency ω₀, (b) impedance at resonance, (c) RMS current at resonance, and (d) power factor at resonance.',
    correctAnswer: 'ω₀ = 5000 rad/s, Z = 20 Ω, I_rms = 11 A, cosφ = 1',
    explanation:
      'ω₀ = 1/√(LC) = 1/√(4×10⁻³ × 10⁻⁵) = 1/(2×10⁻⁴) = 5000 rad/s. At resonance X_L = X_C so Z = R = 20 Ω, I_rms = 220/20 = 11 A, and cosφ = R/Z = 1.',
    diagramId: 'lcr_resonance',
  },
  {
    id: 'qb-phy-6',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch9',
    chapterTitle: 'Ray Optics and Optical Instruments',
    topic: 'Refraction through Prism',
    marks: 5,
    difficulty: 'Hard',
    type: '5-Mark',
    sourceBook: 'NCERT',
    sourceCategory: 'NCERT / Exemplar',
    isPreviousYear: true,
    pyqYear: 2025,
    questionText:
      'Derive the prism formula n = sin((A + D_m)/2) / sin(A/2) for refraction through an equilateral glass prism, and find the angle of minimum deviation when n = √3 and A = 60°.',
    correctAnswer: 'D_m = 60°',
    explanation:
      'At minimum deviation i = e and r₁ = r₂ = A/2 = 30°. √3 = sin((60° + D_m)/2) / sin 30° ⇒ sin((60°+D_m)/2) = √3/2 = sin 60° ⇒ D_m = 60°.',
    diagramId: 'prism_refraction',
  },
  {
    id: 'qb-phy-7',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch12',
    chapterTitle: 'Atoms',
    topic: 'Bohr Model of Hydrogen Atom',
    marks: 3,
    difficulty: 'Moderate',
    type: 'Diagram-Based',
    sourceBook: 'Xam Idea',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'Using Bohr energy level diagram for Hydrogen (E_n = -13.6/n² eV), identify which transition emits the shortest wavelength photon in the Balmer series and compute its photon energy.',
    correctAnswer: 'n = ∞ to n = 2; ΔE = 3.40 eV',
    explanation:
      'Shortest wavelength corresponds to maximum energy difference (series limit n = ∞ → n = 2). ΔE = 0 - (-3.40) = 3.40 eV.',
    diagramId: 'bohr_hydrogen_levels',
  },
  {
    id: 'qb-phy-8',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch14',
    chapterTitle: 'Semiconductor Electronics: Materials, Devices and Simple Circuits',
    topic: 'Half-Wave & Full-Wave Rectifiers',
    marks: 3,
    difficulty: 'Easy',
    type: 'Competency-Based',
    sourceBook: 'NCERT',
    sourceCategory: 'NCERT / Exemplar',
    isPreviousYear: false,
    questionText:
      'An AC supply of 50 Hz feeds (a) a half-wave rectifier and (b) a full-wave rectifier. What is the fundamental ripple frequency in each output?',
    correctAnswer: 'Half-wave: 50 Hz; Full-wave: 100 Hz',
    explanation:
      'Half-wave rectifier conducts once per AC cycle (50 Hz), whereas full-wave rectifier inverts negative half-cycles to produce two pulses per cycle (100 Hz).',
    diagramId: 'pn_junction_diode',
  },

  // CHEMISTRY
  {
    id: 'qb-chem-1',
    year: 2027,
    subjectId: 'chemistry',
    chapterId: 'chem-ch1',
    chapterTitle: 'Solutions',
    topic: 'Colligative Properties',
    marks: 1,
    difficulty: 'Moderate',
    type: 'MCQ',
    sourceBook: 'NCERT Exemplar',
    sourceCategory: 'NCERT / Exemplar',
    isPreviousYear: false,
    questionText:
      'Which of the following 0.1 M aqueous solutions will exhibit the highest boiling point assuming complete dissociation?',
    options: ['0.1 M Glucose', '0.1 M NaCl', '0.1 M CaCl₂', '0.1 M Al₂(SO₄)₃'],
    correctOptionIndex: 3,
    correctAnswer: '0.1 M Al₂(SO₄)₃',
    explanation:
      'ΔT_b = i K_b m. Al₂(SO₄)₃ yields i = 5 ions (2 Al³⁺ + 3 SO₄²⁻), higher than CaCl₂ (i=3), NaCl (i=2), and Glucose (i=1).',
  },
  {
    id: 'qb-chem-2',
    year: 2027,
    subjectId: 'chemistry',
    chapterId: 'chem-ch2',
    chapterTitle: 'Electrochemistry',
    topic: 'Galvanic Cells & Nernst Equation',
    marks: 3,
    difficulty: 'Hard',
    type: 'Numerical',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE',
    isPreviousYear: true,
    pyqYear: 2024,
    questionText:
      'Calculate EMF of the cell at 298 K: Mg(s) | Mg²⁺(0.001 M) || Cu²⁺(0.0001 M) | Cu(s), given E°(Mg²⁺/Mg) = -2.36 V and E°(Cu²⁺/Cu) = +0.34 V.',
    correctAnswer: '2.6705 V',
    explanation:
      'E°_cell = 0.34 - (-2.36) = 2.70 V, n = 2. E_cell = 2.70 - (0.059/2)log₁₀(0.001/0.0001) = 2.70 - 0.0295 × 1 = 2.6705 V.',
    diagramId: 'electrochemical_cell',
  },
  {
    id: 'qb-chem-3',
    year: 2027,
    subjectId: 'chemistry',
    chapterId: 'chem-ch3',
    chapterTitle: 'Chemical Kinetics',
    topic: 'Integrated Rate Equations (Zero & First Order)',
    marks: 2,
    difficulty: 'Moderate',
    type: 'HOTS',
    sourceBook: 'MTG',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'For a first-order reaction, show that time required for 99.9% completion is approximately 10 times its half-life (log 2 ≈ 0.3010).',
    correctAnswer: 't_99.9% ≈ 10 × t_1/2',
    explanation:
      't_99.9% = (2.303/k) log(100/0.1) = (2.303 × 3)/k = 6.909/k. Since t_1/2 = 0.693/k, ratio = 6.909 / 0.693 ≈ 9.97 ≈ 10.',
  },
  {
    id: 'qb-chem-4',
    year: 2027,
    subjectId: 'chemistry',
    chapterId: 'chem-ch5',
    chapterTitle: 'Coordination Compounds',
    topic: 'Valence Bond Theory (VBT)',
    marks: 3,
    difficulty: 'Moderate',
    type: '3-Mark',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE',
    isPreviousYear: true,
    pyqYear: 2025,
    questionText:
      'Using Valence Bond Theory, predict the hybridisation, geometry, and magnetic behaviour of [Fe(CN)₆]³⁻ and [FeF₆]³⁻.',
    correctAnswer: '[Fe(CN)₆]³⁻: d²sp³, octahedral, paramagnetic (1 unpaired e⁻); [FeF₆]³⁻: sp³d², octahedral, strongly paramagnetic (5 unpaired e⁻)',
    explanation:
      'Fe³⁺ is 3d⁵. Strong-field CN⁻ pairs electrons leaving 1 unpaired electron with d²sp³ inner-orbital hybridisation; weak-field F⁻ keeps all 5 unpaired with sp³d² outer-orbital hybridisation.',
  },
  {
    id: 'qb-chem-5',
    year: 2027,
    subjectId: 'chemistry',
    chapterId: 'chem-ch8',
    chapterTitle: 'Aldehydes, Ketones and Carboxylic Acids',
    topic: 'Aldol & Cross-Aldol Condensation',
    marks: 5,
    difficulty: 'Hard',
    type: '5-Mark',
    sourceBook: 'Together With',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'An organic compound A (C₈H₈O) forms an orange-red precipitate with 2,4-DNP and gives a yellow precipitate on heating with I₂ and NaOH. It neither reduces Tollens reagent nor decolourises bromine water. Identify A and write reactions for its Iodoform test and Wolff-Kishner reduction.',
    correctAnswer: 'A is Acetophenone (C₆H₅COCH₃)',
    explanation:
      '2,4-DNP positive + negative Tollens proves ketone; positive Iodoform proves CH₃CO- group. Hence A is acetophenone, yielding CHI₃ + C₆H₅COONa with I₂/NaOH and ethylbenzene on Wolff-Kishner reduction.',
  },

  // MATHEMATICS
  {
    id: 'qb-math-1',
    year: 2027,
    subjectId: 'mathematics',
    chapterId: 'math-ch3',
    chapterTitle: 'Matrices',
    topic: 'Transpose, Symmetric & Skew-Symmetric Matrices',
    marks: 1,
    difficulty: 'Easy',
    type: 'MCQ',
    sourceBook: 'R.D. Sharma',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'If A and B are symmetric matrices of the same order, then (AB - BA) is always a:',
    options: ['Symmetric matrix', 'Skew-symmetric matrix', 'Zero matrix', 'Identity matrix'],
    correctOptionIndex: 1,
    correctAnswer: 'Skew-symmetric matrix',
    explanation:
      '(AB - BA)ᵀ = (AB)ᵀ - (BA)ᵀ = BᵀAᵀ - AᵀBᵀ = BA - AB = -(AB - BA). Hence skew-symmetric.',
  },
  {
    id: 'qb-math-2',
    year: 2027,
    subjectId: 'mathematics',
    chapterId: 'math-ch6',
    chapterTitle: 'Application of Derivatives',
    topic: 'Local Maxima & Minima (First & Second Derivative Tests)',
    marks: 4,
    difficulty: 'Hard',
    type: '4-Mark Case Study',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE',
    isPreviousYear: true,
    pyqYear: 2024,
    questionText:
      'Case Study: An open-top rectangular tank with square base of side x metres and depth y metres must have volume 32 m³. Express surface area S(x) and find dimensions x, y minimizing sheet metal cost.',
    correctAnswer: 'x = 4 m, y = 2 m, minimum area = 48 m²',
    explanation:
      'x²y = 32 ⇒ y = 32/x². Area S(x) = x² + 4xy = x² + 128/x. S\'(x) = 2x - 128/x² = 0 ⇒ x³ = 64 ⇒ x = 4 m, y = 2 m, S\'\'(4) = 6 > 0 (minimum).',
    diagramId: 'calculus_derivative_tangent',
  },
  {
    id: 'qb-math-3',
    year: 2027,
    subjectId: 'mathematics',
    chapterId: 'math-ch7',
    chapterTitle: 'Integrals',
    topic: 'Definite Integrals & Properties (King Property)',
    marks: 3,
    difficulty: 'Moderate',
    type: '3-Mark',
    sourceBook: 'R.S. Aggarwal',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText: 'Evaluate the definite integral ∫₀^(π/2) [√sin x / (√sin x + √cos x)] dx.',
    correctAnswer: 'π/4',
    explanation:
      'Using King Property ∫₀ᵃ f(x)dx = ∫₀ᵃ f(a-x)dx, adding I + I gives 2I = ∫₀^(π/2) 1 dx = π/2 ⇒ I = π/4.',
  },
  {
    id: 'qb-math-4',
    year: 2027,
    subjectId: 'mathematics',
    chapterId: 'math-ch11',
    chapterTitle: 'Three Dimensional Geometry',
    topic: 'Shortest Distance Between Skew & Parallel Lines',
    marks: 5,
    difficulty: 'Hard',
    type: '5-Mark',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE',
    isPreviousYear: true,
    pyqYear: 2025,
    questionText:
      'Find the shortest distance between lines r = (i + 2j + k) + λ(i - j + k) and r = (2i - j - k) + μ(2i + j + 2k).',
    correctAnswer: '3√2 / 2 units',
    explanation:
      'a₂ - a₁ = i - 3j - 2k; b₁ × b₂ = -3i + 0j + 3k; |b₁ × b₂| = 3√2. |(a₂-a₁)·(b₁×b₂)| = |-3 + 0 - 6| = 9. Distance = 9 / (3√2) = 3/√2 = 3√2/2.',
  },
  {
    id: 'qb-math-5',
    year: 2027,
    subjectId: 'mathematics',
    chapterId: 'math-ch13',
    chapterTitle: 'Probability',
    topic: 'Theorem of Total Probability & Bayes Theorem',
    marks: 5,
    difficulty: 'Moderate',
    type: 'Application-Based',
    sourceBook: 'NCERT',
    sourceCategory: 'NCERT / Exemplar',
    isPreviousYear: false,
    questionText:
      'Bag I contains 3 red and 4 black balls; Bag II contains 5 red and 6 black balls. One ball is drawn at random from one of the bags and found to be red. Find the probability it was drawn from Bag II.',
    correctAnswer: '35 / 68',
    explanation:
      'P(B₁)=P(B₂)=1/2. P(R|B₁)=3/7, P(R|B₂)=5/11. By Bayes Theorem: P(B₂|R) = (5/11) / (3/7 + 5/11) = 35 / (33 + 35) = 35/68.',
  },

  // BIOLOGY
  {
    id: 'qb-bio-1',
    year: 2027,
    subjectId: 'biology',
    chapterId: 'bio-ch1',
    chapterTitle: 'Sexual Reproduction in Flowering Plants',
    topic: 'Double Fertilisation',
    marks: 1,
    difficulty: 'Easy',
    type: 'MCQ',
    sourceBook: 'NCERT',
    sourceCategory: 'NCERT / Exemplar',
    isPreviousYear: false,
    questionText:
      'In a typical angiosperm, if the somatic chromosome number (2n) is 24, what will be the chromosome number in the Primary Endosperm Nucleus (PEN)?',
    options: ['12', '24', '36', '48'],
    correctOptionIndex: 2,
    correctAnswer: '36',
    explanation: 'PEN is triploid (3n) formed by fusion of two polar nuclei (n + n) with one male gamete (n). Since 2n = 24, n = 12, so 3n = 36.',
  },
  {
    id: 'qb-bio-2',
    year: 2027,
    subjectId: 'biology',
    chapterId: 'bio-ch5',
    chapterTitle: 'Molecular Basis of Inheritance',
    topic: 'Meselson-Stahl Semi-Conservative Replication',
    marks: 3,
    difficulty: 'Moderate',
    type: 'Diagram-Based',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE',
    isPreviousYear: true,
    pyqYear: 2024,
    questionText:
      'Explain why DNA replication at the replication fork proceeds continuously on one template strand and discontinuously on the other.',
    correctAnswer: 'DNA polymerase polymerises strictly in the 5\'→3\' direction across antiparallel strands',
    explanation:
      'Because DNA strands are antiparallel and DNA-dependent DNA polymerase catalyses polymerisation only in 5\'→3\', the 3\'→5\' template allows continuous leading synthesis while the 5\'→3\' template forms discontinuous Okazaki fragments joined by DNA ligase.',
    diagramId: 'dna_replication_fork',
  },
  {
    id: 'qb-bio-3',
    year: 2027,
    subjectId: 'biology',
    chapterId: 'bio-ch9',
    chapterTitle: 'Biotechnology: Principles and Processes',
    topic: 'Cloning Vectors (pBR322, Ori, Selectable Markers)',
    marks: 4,
    difficulty: 'Hard',
    type: '4-Mark Case Study',
    sourceBook: 'All in One',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'Case Study: A student inserts a foreign gene into the BamHI restriction site within the tetracycline resistance gene (tet^R) of plasmid pBR322. Explain how recombinants are distinguished from non-recombinants by replica plating.',
    correctAnswer: 'Recombinants grow on ampicillin medium but fail to grow on tetracycline medium',
    explanation:
      'Insertional inactivation disrupts tet^R while keeping amp^R intact. Transformants grow on ampicillin plates; transferring colonies to tetracycline plates leaves non-recombinants alive and kills recombinants.',
  },
  {
    id: 'qb-bio-4',
    year: 2027,
    subjectId: 'biology',
    chapterId: 'bio-ch11',
    chapterTitle: 'Organisms and Populations',
    topic: 'Population Growth Models (Exponential & Logistic)',
    marks: 3,
    difficulty: 'Moderate',
    type: '3-Mark',
    sourceBook: 'MTG',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'Write the Verhulst-Pearl Logistic Growth equation, define every symbol, and explain why it is more realistic than exponential growth.',
    correctAnswer: 'dN/dt = rN((K-N)/K); realistic because natural habitats have finite carrying capacity K',
    explanation:
      'N is population density, r is intrinsic rate of natural increase, and K is carrying capacity. Resource limitation slows growth as N approaches K, yielding a sigmoid curve.',
  },

  // ENGLISH
  {
    id: 'qb-eng-1',
    year: 2027,
    subjectId: 'english',
    chapterId: 'eng-ch2',
    chapterTitle: 'The Last Lesson, Lost Spring & Deep Water',
    topic: 'The Last Lesson (Alphonse Daudet)',
    marks: 1,
    difficulty: 'Easy',
    type: 'MCQ',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE',
    isPreviousYear: true,
    pyqYear: 2024,
    questionText:
      'Why were the village elders sitting quietly on the back benches of M. Hamel’s classroom in "The Last Lesson"?',
    options: [
      'To supervise Franz’s grammar test',
      'To express gratitude for M. Hamel’s forty years of faithful service and mourn their lost language',
      'To protest against the Prussian soldiers outside',
      'To collect school fees for the next term',
    ],
    correctOptionIndex: 1,
    correctAnswer: 'To express gratitude for M. Hamel’s forty years of faithful service and mourn their lost language',
    explanation:
      'The elders felt remorse for neglecting schooling earlier and came to honour M. Hamel’s 40-year dedication and bid farewell to French.',
  },
  {
    id: 'qb-eng-2',
    year: 2027,
    subjectId: 'english',
    chapterId: 'eng-ch5',
    chapterTitle: 'Flamingo Poetry Collection (All 5 Poems)',
    topic: 'Keeping Quiet (Pablo Neruda)',
    marks: 2,
    difficulty: 'Moderate',
    type: '2-Mark',
    sourceBook: 'Oswaal',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'In "Keeping Quiet", why does Pablo Neruda clarify "I want no truck with death"?',
    correctAnswer: 'To distinguish constructive introspective stillness from passive lifelessness or total inactivity',
    explanation:
      'Neruda advocates a brief, purposeful pause in frantic destructive activity so humanity can reflect on unity and ecological preservation, not death.',
  },
  {
    id: 'qb-eng-3',
    year: 2027,
    subjectId: 'english',
    chapterId: 'eng-ch1',
    chapterTitle: 'Reading Comprehension & Creative Writing Skills',
    topic: 'Notice Writing (50 words)',
    marks: 4,
    difficulty: 'Moderate',
    type: 'Competency-Based',
    sourceBook: 'Together With',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'You are Riya/Rohan, Secretary of the Science & AI Club of Vidya Mandir Senior Secondary School, Chennai. Draft a 50-word notice informing Class 11–12 students about a CBSE Mock Olympiad Orientation Workshop.',
    correctAnswer: 'Boxed format with School Name, NOTICE, Date, Heading, Event Date/Time/Venue, and Signatory',
    explanation:
      'CBSE awards 1M for Format (box, title, date, designation), 2M for Content (what, when, where, eligibility), and 1M for Expression & 50-word conciseness.',
  },

  // COMPUTER SCIENCE
  {
    id: 'qb-cs-1',
    year: 2027,
    subjectId: 'computer_science',
    chapterId: 'cs-ch2',
    chapterTitle: 'Exception Handling and File Handling (Text, Binary & CSV)',
    topic: 'Binary Files with pickle (dump, load, EOFError)',
    marks: 1,
    difficulty: 'Moderate',
    type: 'MCQ',
    sourceBook: 'NCERT',
    sourceCategory: 'NCERT / Exemplar',
    isPreviousYear: false,
    questionText:
      'Which exception is raised by pickle.load() when the file pointer reaches the end of a binary file?',
    options: ['FileNotFoundError', 'ValueError', 'EOFError', 'IOError'],
    correctOptionIndex: 2,
    correctAnswer: 'EOFError',
    explanation:
      'pickle.load() raises EOFError upon reaching end-of-file while reading serialized objects sequentially.',
  },
  {
    id: 'qb-cs-2',
    year: 2027,
    subjectId: 'computer_science',
    chapterId: 'cs-ch3',
    chapterTitle: 'Data Structure: Stack Implementation in Python',
    topic: 'Push & Pop Operations using Python List',
    marks: 3,
    difficulty: 'Moderate',
    type: '3-Mark',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE',
    isPreviousYear: true,
    pyqYear: 2025,
    questionText:
      'A dictionary D = {"Arjun": 88, "Meera": 94, "Karthik": 72, "Divya": 91} stores student marks. Write Python functions Push_Topper(S, D) to push names scoring > 85 onto stack S, and Pop_Topper(S) to pop and print each or "Stack Empty".',
    correctAnswer: 'def Push_Topper(S, D): for k, v in D.items(): if v > 85: S.append(k)',
    explanation:
      'Push_Topper iterates D and appends qualifying keys to list S. Pop_Topper checks while S: print(S.pop()) else prints "Stack Empty" on underflow.',
  },
  {
    id: 'qb-cs-3',
    year: 2027,
    subjectId: 'computer_science',
    chapterId: 'cs-ch5',
    chapterTitle: 'Database Management, SQL & Python-MySQL Interface',
    topic: 'GROUP BY, HAVING, ORDER BY & Joins (Equi/Natural Join)',
    marks: 4,
    difficulty: 'Hard',
    type: '4-Mark Case Study',
    sourceBook: 'Xam Idea',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'Given table STUDENTS(AdmNo, Name, Stream, Marks): Write SQL queries to (a) count students per stream where count >= 2, (b) display highest marks in each stream, (c) list names starting with "S", and (d) state difference between WHERE and HAVING.',
    correctAnswer: 'SELECT Stream, COUNT(*) FROM STUDENTS GROUP BY Stream HAVING COUNT(*) >= 2;',
    explanation:
      'WHERE filters rows prior to grouping; HAVING filters grouped aggregations after GROUP BY. Pattern matching uses LIKE "S%".',
    diagramId: 'logic_gates_sql_schema',
  },
  // SAMPLE PAPERS, MSQ, VSA, DERIVATION & PRACTICAL-BASED CURATED BANK
  {
    id: 'qb-sqp-phy-1',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch1',
    chapterTitle: 'Electric Charges and Fields',
    topic: 'Electric Dipole in Uniform Field & Gauss Law',
    subtopic: 'Torque & Stable Equilibrium of Electric Dipole',
    marks: 1,
    difficulty: 'Moderate',
    type: 'MSQ',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE Sample Paper',
    isPreviousYear: false,
    isSamplePaper: true,
    samplePaperYear: 2026,
    questionText:
      'Multiple-Select (MSQ): Which of the following statements hold true for an electric dipole placed in a uniform external electric field E?',
    options: [
      'Net translational force on the dipole is always zero',
      'Torque magnitude τ = pE sinθ vanishes when dipole moment p is parallel to E',
      'Potential energy U = -p·E is maximum at θ = 0°',
      'At θ = 0°, the dipole is in stable equilibrium',
    ],
    correctOptionIndices: [0, 1, 3],
    correctAnswer: '(A), (B), and (D)',
    hint: 'Recall F_net = +qE - qE = 0, τ = p × E, and U = -pE cosθ (minimum U gives stable equilibrium).',
    formulaRef: 'τ = pE sinθ ; U = -pE cosθ',
    explanation:
      'In a uniform field, net force is zero regardless of angle. At θ = 0°, sin 0° = 0 (zero torque) and U = -pE is minimum, indicating stable equilibrium.',
    stepByStepSolution: [
      'Net force on +q and -q in uniform E is qE - qE = 0, so (A) holds.',
      'Torque τ = pE sinθ = 0 when θ = 0° (p ∥ E), so (B) holds.',
      'Potential energy U = -pE cos 0° = -pE is minimum (stable equilibrium), making (C) false and (D) true.',
    ],
  },
  {
    id: 'qb-vsa-phy-2',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch4',
    chapterTitle: 'Moving Charges and Magnetism',
    topic: 'Biot-Savart Law & Ampere Circuital Law',
    subtopic: 'Magnetic Force on Moving Charge (Lorentz Force)',
    marks: 1,
    difficulty: 'Easy',
    type: 'Very Short Answer',
    sourceBook: 'NCERT',
    sourceCategory: 'NCERT / Exemplar',
    isPreviousYear: false,
    questionText:
      'Why does a steady magnetic field do zero mechanical work on a free moving charged particle?',
    correctAnswer: 'Because magnetic Lorentz force F = q(v × B) is always perpendicular to velocity v and instantaneous displacement dr.',
    hint: 'Express work dW = F · dr = F · v dt and check the angle between v × B and v.',
    formulaRef: 'dW = q(v × B) · v dt = 0',
    explanation:
      'Magnetic force acts orthogonally to the instantaneous velocity vector, changing only direction and never kinetic energy or speed.',
    stepByStepSolution: [
      'State magnetic force expression F_m = q(v × B).',
      'Since F_m ⊥ v and displacement dr = v dt, dW = F_m · dr = 0.',
    ],
  },
  {
    id: 'qb-drv-phy-3',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch9',
    chapterTitle: 'Ray Optics and Optical Instruments',
    topic: 'Lens Maker Formula & Thin Lenses',
    subtopic: 'Spherical Refraction & Thin Lens Combination',
    marks: 5,
    difficulty: 'Hard',
    type: 'Derivation',
    sourceBook: 'S.L. Arora',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'Derive the Lens Maker Formula 1/f = (n₂₁ - 1)(1/R₁ - 1/R₂) for a double convex lens of refractive index n₂ kept in medium n₁, clearly stating sign conventions and thin-lens assumptions.',
    correctAnswer: '1/f = (n₂₁ - 1)(1/R₁ - 1/R₂) where n₂₁ = n₂ / n₁',
    hint: 'Apply single spherical surface refraction n₂/v₁ - n₁/u = (n₂ - n₁)/R₁ at surface 1, then use I₁ as virtual object for surface 2.',
    formulaRef: '1/f = (n₂₁ - 1)(1/R₁ - 1/R₂)',
    explanation:
      'Adding refraction equations across both spherical surfaces eliminates the intermediate image distance v₁ when the lens thickness is negligible.',
    stepByStepSolution: [
      'Refraction at first surface (n₁ → n₂): n₂/v₁ - n₁/u = (n₂ - n₁)/R₁.',
      'Refraction at second surface (n₂ → n₁, object at v₁): n₁/v - n₂/v₁ = (n₁ - n₂)/R₂.',
      'Add both equations: n₁(1/v - 1/u) = (n₂ - n₁)(1/R₁ - 1/R₂).',
      'Set u = ∞ ⇒ v = f to obtain 1/f = (n₂/n₁ - 1)(1/R₁ - 1/R₂).',
    ],
    diagramId: 'prism_refraction',
  },
  {
    id: 'qb-prac-phy-4',
    year: 2027,
    subjectId: 'physics',
    chapterId: 'phy-ch3',
    chapterTitle: 'Current Electricity',
    topic: 'Meter Bridge & Wheatstone Principle',
    subtopic: 'Determination of Unknown Resistance via Null Point',
    marks: 2,
    difficulty: 'Moderate',
    type: 'Practical-Based',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE Sample Paper',
    isPreviousYear: false,
    isSamplePaper: true,
    samplePaperYear: 2026,
    questionText:
      'Practical-Based: In a Meter Bridge experiment, the null point is found at 40 cm from end A when an unknown resistor X is in the left gap and R = 12 Ω in the right gap. Why is it recommended to adjust R so the balance length stays near 40–60 cm, and what is the value of X?',
    correctAnswer: 'X = 8 Ω; keeping l near 50 cm minimizes percentage error from end-resistance and least count.',
    hint: 'Use Wheatstone balance X / R = l / (100 - l).',
    formulaRef: 'X = R × l / (100 - l)',
    explanation:
      'At l = 40 cm, X = 12 × (40 / 60) = 8 Ω. Fractional error ΔX/X ∝ 1/[l(100 - l)] is minimized when l = 50 cm.',
    stepByStepSolution: [
      'Apply balanced bridge equation: X / 12 = 40 / (100 - 40) = 40 / 60.',
      'Compute X = 12 × 2/3 = 8 Ω.',
      'Explain error minimization: end resistances & scale uncertainty produce lowest % error near midpoint.',
    ],
  },
  {
    id: 'qb-sqp-chem-1',
    year: 2027,
    subjectId: 'chemistry',
    chapterId: 'chem-ch2',
    chapterTitle: 'Electrochemistry',
    topic: 'Kohlrausch Law & Conductance',
    subtopic: 'Molar Conductivity Variation with Dilution',
    marks: 2,
    difficulty: 'Moderate',
    type: 'Practical-Based',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE Sample Paper',
    isPreviousYear: false,
    isSamplePaper: true,
    samplePaperYear: 2026,
    questionText:
      'Practical-Based: Why does conductivity (κ) of an electrolytic solution decrease on dilution whereas molar conductivity (Λ_m) increases for both strong and weak electrolytes?',
    correctAnswer: 'κ decreases because number of ions per unit volume falls; Λ_m = κ × 1000/M rises due to higher mobility (strong) and increased dissociation α (weak).',
    hint: 'Relate Λ_m = κ / c and recall Debye-Huckel-Onsager vs Ostwald dilution law.',
    formulaRef: 'Λ_m = (κ × 1000) / M',
    explanation:
      'Dilution reduces ion count per cm³ (lowering κ), while larger inter-ionic spacing lowers inter-ionic drag in strong electrolytes and boosts α in weak electrolytes.',
    stepByStepSolution: [
      'Define κ as conductance of unit volume; fewer ions/cm³ lowers κ upon dilution.',
      'Express Λ_m = κ · V; increase in V outweighs drop in κ.',
      'Distinguish inter-ionic attraction decrease (strong) vs increase in degree of dissociation α (weak).',
    ],
    diagramId: 'electrochemical_cell',
  },
  {
    id: 'qb-vsa-chem-2',
    year: 2027,
    subjectId: 'chemistry',
    chapterId: 'chem-ch10',
    chapterTitle: 'Biomolecules',
    topic: 'Proteins & Nucleic Acids',
    subtopic: 'Denaturation & Peptide Bond Linkage',
    marks: 1,
    difficulty: 'Easy',
    type: 'Very Short Answer',
    sourceBook: 'NCERT',
    sourceCategory: 'NCERT / Exemplar',
    isPreviousYear: false,
    questionText:
      'During denaturation of proteins (e.g., boiling an egg), which protein structure levels are disrupted and which remains intact?',
    correctAnswer: 'Secondary and tertiary structures are destroyed; primary amino-acid sequence remains intact.',
    hint: 'Does mild heating break covalent peptide bonds or only hydrogen/disulphide interactions?',
    formulaRef: '1° structure = covalent peptide (-CO-NH-) backbone',
    explanation:
      'Heat or pH shift breaks weak hydrogen and electrostatic interactions stabilizing 2°/3° folding without hydrolyzing covalent peptide bonds of 1° structure.',
    stepByStepSolution: [
      '1M: State 2° and 3° structures lose biological activity/uncoil while 1° covalent sequence stays intact.',
    ],
  },
  {
    id: 'qb-msq-math-1',
    year: 2027,
    subjectId: 'mathematics',
    chapterId: 'math-ch5',
    chapterTitle: 'Continuity and Differentiability',
    topic: 'Continuity vs Differentiability',
    subtopic: 'Modulus Function Corners & Chain Rule',
    marks: 1,
    difficulty: 'Moderate',
    type: 'MSQ',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE Sample Paper',
    isPreviousYear: false,
    isSamplePaper: true,
    samplePaperYear: 2026,
    questionText:
      'Multiple-Select (MSQ): For the function f(x) = |x - 2| on R, select all true statements:',
    options: [
      'f(x) is continuous at x = 2',
      'Left-hand derivative at x = 2 equals -1',
      'Right-hand derivative at x = 2 equals +1',
      'f(x) is differentiable at x = 2',
    ],
    correctOptionIndices: [0, 1, 2],
    correctAnswer: '(A), (B), and (C)',
    hint: 'Compute lim(x→2) f(x) and evaluate LHD vs RHD separately.',
    formulaRef: 'LHD = lim(h→0⁻) [f(2+h)-f(2)]/h',
    explanation:
      'At x = 2, lim f(x) = f(2) = 0 so f is continuous. However LHD = -1 ≠ RHD = +1, so f has a sharp corner and is not differentiable at x = 2.',
    stepByStepSolution: [
      'Evaluate lim(x→2⁻)|x-2| = lim(x→2⁺)|x-2| = 0 = f(2) ⇒ Continuous.',
      'LHD at 2: lim(h→0⁻) |h|/h = -1; RHD at 2: lim(h→0⁺) |h|/h = +1.',
      'Since LHD ≠ RHD, (D) is false.',
    ],
  },
  {
    id: 'qb-vsa-math-2',
    year: 2027,
    subjectId: 'mathematics',
    chapterId: 'math-ch4',
    chapterTitle: 'Determinants',
    topic: 'Area of Triangle & Singular Matrices',
    subtopic: 'Adjoint Determinant Identity |adj A| = |A|ⁿ⁻¹',
    marks: 1,
    difficulty: 'Moderate',
    type: 'Very Short Answer',
    sourceBook: 'R.D. Sharma',
    sourceCategory: 'Licensed Reference',
    isPreviousYear: false,
    questionText:
      'If A is a non-singular square matrix of order 3 such that |A| = 4, find the value of |adj A| and |2A|.',
    correctAnswer: '|adj A| = 16 ; |2A| = 32',
    hint: 'Use |adj A| = |A|ⁿ⁻¹ and |kA| = kⁿ|A| for n = 3.',
    formulaRef: '|adj A| = |A|ⁿ⁻¹ ; |kA| = kⁿ|A|',
    explanation:
      'For order n = 3: |adj A| = 4^(3-1) = 4² = 16, and |2A| = 2³ × 4 = 8 × 4 = 32.',
    stepByStepSolution: [
      'Apply |adj A| = |A|² = 4² = 16.',
      'Apply |2A| = 2³|A| = 8 × 4 = 32.',
    ],
  },
  {
    id: 'qb-prac-bio-1',
    year: 2027,
    subjectId: 'biology',
    chapterId: 'bio-ch9',
    chapterTitle: 'Biotechnology: Principles and Processes',
    topic: 'Gel Electrophoresis & PCR',
    subtopic: 'Agarose Gel DNA Band Separation & Ethidium Bromide Staining',
    marks: 2,
    difficulty: 'Moderate',
    type: 'Practical-Based',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE Sample Paper',
    isPreviousYear: false,
    isSamplePaper: true,
    samplePaperYear: 2026,
    questionText:
      'Practical-Based: In agarose gel electrophoresis, toward which electrode do DNA fragments migrate and why, and how are colourless DNA bands visualized?',
    correctAnswer: 'Fragments migrate toward the anode (+) due to negatively charged phosphate backbone; stained with ethidium bromide and viewed under UV light as bright orange bands.',
    hint: 'Recall the charge on DNA phosphodiester backbone and the fluorescent intercalating dye used in CBSE practicals.',
    formulaRef: 'Charge: Phosphate (PO₄³⁻) → Anode (+)',
    explanation:
      'DNA is negatively charged due to phosphate groups, so it travels toward the positive anode through agarose pores (smaller fragments faster). EtBr + UV reveals bright orange bands.',
    stepByStepSolution: [
      '1M: State anode migration due to negative phosphate charge + sieving effect (smaller moves farther).',
      '1M: Stain with Ethidium Bromide (EtBr) + UV exposure → bright orange bands.',
    ],
  },
  {
    id: 'qb-sqp-eng-1',
    year: 2027,
    subjectId: 'english',
    chapterId: 'eng-ch1',
    chapterTitle: 'Reading Comprehension & Creative Writing Skills',
    topic: 'Job Application & Bio-Data',
    subtopic: 'Formal Cover Letter + Chronological Bio-Data',
    marks: 5,
    difficulty: 'Moderate',
    type: 'Competency-Based',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE Sample Paper',
    isPreviousYear: false,
    isSamplePaper: true,
    samplePaperYear: 2026,
    questionText:
      'Official SQP Pattern: Draft an application with detailed bio-data in 120–150 words for the post of Junior Data Analyst advertised in The Hindu by MindBridge Analytics, Bengaluru.',
    correctAnswer: 'Formal cover letter (Sender address, Date, Receiver, Subject, Salutation, Body, Subscription) + Enclosed Bio-Data table with Education, Skills, Experience & References.',
    hint: 'CBSE splits 5 marks into Format (1M), Content/Cover+Bio-Data (2M), Organization (1M), Accuracy (1M).',
    explanation:
      'Always enclose a structured Bio-Data section below the formal cover letter signature covering Personal Details, Academic Qualifications (tabular), Key Skills, and two References.',
    stepByStepSolution: [
      '1M: Complete formal letter format (Sender, Date, HR Manager, Subject, Salutation, Complimentary Close).',
      '2M: Cover body citing advertisement source + tabular Bio-Data.',
      '2M: Coherent organization, crisp 120–150 word register, and grammatical accuracy.',
    ],
  },
  {
    id: 'qb-prac-cs-1',
    year: 2027,
    subjectId: 'computer_science',
    chapterId: 'cs-ch5',
    chapterTitle: 'Database Management, SQL & Python-MySQL Interface',
    topic: 'Python-MySQL Connector Methods',
    subtopic: 'connect(), cursor(), execute(), fetchall() & commit()',
    marks: 3,
    difficulty: 'Moderate',
    type: 'Practical-Based',
    sourceBook: 'CBSE Official',
    sourceCategory: 'Official CBSE Sample Paper',
    isPreviousYear: false,
    isSamplePaper: true,
    samplePaperYear: 2026,
    questionText:
      'Practical-Based: Write a Python function update_fee(admno, new_fee) using mysql.connector to update the FEE column in table STUDENT(ADMNO, NAME, FEE) inside database SCHOOL and persist changes safely.',
    correctAnswer: 'Connect via mysql.connector.connect(), execute parameterized UPDATE query with %s placeholders, call con.commit(), then close cursor & connection.',
    hint: 'Never forget con.commit() after DML queries (INSERT/UPDATE/DELETE) in mysql.connector.',
    formulaRef: 'cur.execute("UPDATE ... WHERE ...=%s", params); con.commit()',
    explanation:
      'MySQL DML statements require explicit commit() on the connection object before closing; parameterized tuples (%s) prevent SQL injection.',
    stepByStepSolution: [
      'Import mysql.connector and establish connection con = mysql.connector.connect(host, user, passwd, database="SCHOOL").',
      'Create cur = con.cursor() and run cur.execute("UPDATE STUDENT SET FEE=%s WHERE ADMNO=%s", (new_fee, admno)).',
      'Call con.commit() and safely close cur.close(); con.close().',
    ],
    diagramId: 'logic_gates_sql_schema',
  },
];

/**
 * Generates deterministic curriculum-grounded original practice questions across
 * every CBSE chapter, topic, subtopic, derivation, practical, and solved example.
 * Strict provenance: NEVER marked as official Previous-Year CBSE questions.
 */
export function synthesizeQuestionsForChapter(
  subjectId: SubjectId,
  chapterId: string,
  year: number,
): QuestionItem[] {
  const subject = getSubjectById(subjectId);
  const chapter = subject.chapters.find((c) => c.id === chapterId) || subject.chapters[0];
  const synthesized: QuestionItem[] = [];

  chapter.topics.forEach((topic, idx) => {
    const subtopic =
      chapter.subtopics[idx % Math.max(1, chapter.subtopics.length)] || topic;
    const def = chapter.definitions[idx % Math.max(1, chapter.definitions.length)];
    const formula = chapter.formulas[idx % Math.max(1, chapter.formulas.length)];
    const concept = chapter.concepts[idx % Math.max(1, chapter.concepts.length)];

    // 1. 1-Mark MCQ per topic
    synthesized.push({
      id: `syn-${subjectId}-${chapter.id}-mcq-${idx}`,
      year,
      subjectId,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      topic,
      subtopic,
      marks: 1,
      difficulty: 'Easy',
      type: 'MCQ',
      sourceBook: 'NCERT',
      sourceCategory: 'NCERT / Exemplar',
      sourcePublication: 'ARORA NCERT-Aligned Topic Drill',
      isPreviousYear: false,
      questionText: `In "${chapter.title}" (${topic} — ${subtopic}), which statement accurately reflects the verified NCERT principle?`,
      options: [
        concept || `${topic} follows standard CBSE Class 12 conservation & boundary principles.`,
        `${topic} applies only when all standard CBSE Class 12 boundary assumptions are violated.`,
        `${topic} is independent of governing constants and unit consistency.`,
        'None of the above statements accurately describes this principle.',
      ],
      correctOptionIndex: 0,
      correctAnswer:
        concept || `${topic} follows standard CBSE Class 12 conservation & boundary principles.`,
      hint: formula
        ? `Check how ${formula.name} (${formula.expression}) connects directly to ${subtopic}.`
        : `Focus on the primary NCERT law or boundary condition governing ${subtopic}.`,
      formulaRef: formula ? `${formula.name}: ${formula.expression}` : undefined,
      explanation: `${concept || ''} ${formula ? `Key expression: ${formula.name} (${formula.expression}).` : ''}`.trim(),
      stepByStepSolution: [
        `Identify target subtopic: ${subtopic}.`,
        concept || `Recall the governing NCERT principle for ${topic}.`,
        formula ? `Verify consistency using ${formula.name}: ${formula.expression}.` : 'Confirm Option (A) satisfies CBSE boundary conditions.',
      ],
      diagramId: chapter.diagramId,
    });

    // 2. Alternate Very Short Answer (1M) and 2/3-Mark conceptual/application question
    if (idx === 0) {
      synthesized.push({
        id: `syn-${subjectId}-${chapter.id}-vsa-${idx}`,
        year,
        subjectId,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        topic,
        subtopic,
        marks: 1,
        difficulty: 'Easy',
        type: 'Very Short Answer',
        sourceBook: 'NCERT',
        sourceCategory: 'NCERT / Exemplar',
        sourcePublication: 'ARORA NCERT Quick Check',
        isPreviousYear: false,
        questionText: def
          ? `Very Short Answer: State the exact CBSE definition of "${def.term}"${formula ? ` and write ${formula.name}` : ''}.`
          : `Very Short Answer: State one defining rule or limitation of ${topic} (${subtopic}).`,
        correctAnswer: def
          ? `${def.term}: ${def.definition}${formula ? ` (${formula.expression})` : ''}`
          : concept || `Core NCERT rule for ${subtopic}.`,
        hint: def
          ? `Keep your answer crisp (1–2 sentences) highlighting "${def.term}".`
          : `Focus on one precise condition or unit in ${topic}.`,
        formulaRef: formula ? formula.expression : undefined,
        explanation: `1M CBSE value point: Accurate terminology and unit/condition mention earn full credit.`,
        stepByStepSolution: [
          def ? `Define ${def.term} concisely.` : `State principle of ${subtopic}.`,
          formula ? `Append formula ${formula.expression}${formula.units ? ` (${formula.units})` : ''}.` : 'Keep wording faithful to NCERT.',
        ],
      });
    }

    const marks: 2 | 3 = idx % 2 === 0 ? 2 : 3;
    const type: QuestionType = marks === 2 ? '2-Mark' : '3-Mark';
    const difficulty: DifficultyLevel = marks === 2 ? 'Moderate' : 'Hard';

    synthesized.push({
      id: `syn-${subjectId}-${chapter.id}-sa-${idx}`,
      year,
      subjectId,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      topic,
      subtopic,
      marks,
      difficulty,
      type,
      sourceBook: chapter.referenceCoverage[0] || 'NCERT',
      sourceCategory:
        chapter.referenceCoverage[0] && chapter.referenceCoverage[0] !== 'NCERT'
          ? 'Licensed Reference'
          : 'NCERT / Exemplar',
      sourcePublication: `${chapter.referenceCoverage[0] || 'NCERT'} Aligned Practice`,
      isPreviousYear: false,
      questionText: def
        ? `Define "${def.term}" with reference to ${topic} (${subtopic}) and explain its physical/conceptual significance${formula ? ` using ${formula.name}` : ''}.`
        : `Explain the core mechanism of ${topic} (${subtopic}) in "${chapter.title}" with a neat step-by-step analysis.`,
      correctAnswer: def
        ? `${def.term}: ${def.definition}${formula ? ` (${formula.expression})` : ''}`
        : concept || `Structured NCERT explanation covering ${topic}.`,
      hint: formula
        ? `Begin with the definition, then write ${formula.name} (${formula.expression}) and explain each term.`
        : `Structure your response in two parts: Principle/Definition + Board Application.`,
      formulaRef: formula ? `${formula.name}: ${formula.expression}` : undefined,
      explanation: `CBSE Marking Scheme Value Points: Clear definition/principle (1M) + mathematical/logical formulation or application (1–2M). ${chapter.learningOutcomes[0] || ''}`,
      stepByStepSolution: [
        `1M: ${def ? `State "${def.term}" — ${def.definition}` : `Core principle of ${topic}`}.`,
        `${marks - 1}M: ${formula ? `Apply ${formula.expression} and connect to ${subtopic}.` : chapter.learningOutcomes[0] || `Illustrate with a concise CBSE board example.`}`,
      ],
      diagramId: chapter.diagramId,
    });
  });

  // 3. Derivation Question if chapter contains a derivation
  if (chapter.derivations[0]) {
    const drv = chapter.derivations[0];
    synthesized.push({
      id: `syn-${subjectId}-${chapter.id}-drv`,
      year,
      subjectId,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      topic: chapter.topics[0] || chapter.title,
      subtopic: drv.title,
      marks: 3,
      difficulty: 'Hard',
      type: 'Derivation',
      sourceBook: chapter.referenceCoverage[0] || 'NCERT',
      sourceCategory: 'NCERT / Exemplar',
      sourcePublication: 'NCERT Core Derivation Set',
      isPreviousYear: false,
      questionText: `Derive/Establish systematically: ${drv.title}. State assumptions and boundary conditions clearly.`,
      correctAnswer: drv.steps[drv.steps.length - 1] || drv.title,
      hint: `Start from Step 1: ${drv.steps[0] || 'Write the fundamental law and geometry/model setup.'}`,
      formulaRef: chapter.formulas[0]?.expression,
      explanation: drv.steps.join(' → '),
      stepByStepSolution: drv.steps,
      diagramId: chapter.diagramId,
    });
  }

  // 4. Practical-Based Question if chapter includes practical/lab guidance
  if (chapter.practicalMaterial) {
    synthesized.push({
      id: `syn-${subjectId}-${chapter.id}-prac`,
      year,
      subjectId,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      topic: chapter.topics[0] || chapter.title,
      subtopic: 'Lab / Practical & Viva Application',
      marks: 2,
      difficulty: 'Moderate',
      type: 'Practical-Based',
      sourceBook: 'NCERT',
      sourceCategory: 'NCERT / Exemplar',
      sourcePublication: 'CBSE Practical & Viva Bank',
      isPreviousYear: false,
      questionText: `Practical-Based: With reference to "${chapter.title}", explain the experimental precaution, observation, or assessment requirement for: ${chapter.practicalMaterial}`,
      correctAnswer: chapter.practicalMaterial,
      hint: 'Think about systematic error minimization, apparatus calibration, or CBSE practical rubric checkpoints.',
      explanation: `CBSE Practical & Internal Assessment focus: ${chapter.practicalMaterial}`,
      stepByStepSolution: [
        '1M: Identify apparatus/setup or rubric requirement accurately.',
        '1M: State key precaution or error-minimization justification.',
      ],
      diagramId: chapter.diagramId,
    });
  }

  // 5. Solved Example 5-Mark Application/Numerical
  if (chapter.solvedExamples[0]) {
    const ex = chapter.solvedExamples[0];
    synthesized.push({
      id: `syn-${subjectId}-${chapter.id}-ex`,
      year,
      subjectId,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      topic: chapter.topics[0],
      subtopic: chapter.subtopics[0] || chapter.topics[0],
      marks: 5,
      difficulty: 'Hard',
      type: '5-Mark',
      sourceBook: 'NCERT',
      sourceCategory: 'NCERT / Exemplar',
      sourcePublication: 'NCERT Worked Exemplar Bank',
      isPreviousYear: false,
      questionText: `${ex.problem} Show complete derivation/working steps and state the final result with units.`,
      correctAnswer: ex.finalAnswer,
      hint: `First identify given quantities, then follow: ${ex.solutionSteps[0] || 'Apply the primary chapter formula.'}`,
      formulaRef: chapter.formulas[0]?.expression,
      explanation: ex.solutionSteps.join(' '),
      stepByStepSolution: ex.solutionSteps,
      diagramId: chapter.diagramId,
    });
  }

  return synthesized;
}

export function getAllQuestions(
  year: number,
  userQuestions: QuestionItem[] = [],
): QuestionItem[] {
  const pyqs = LAST_6_YEARS_PYQ_ARCHIVE.map((q) => ({ ...q, year: q.pyqYear ?? year }));
  const guides = GUIDE_PRACTICE_QUESTIONS.map((q) => ({ ...q, year }));
  const base = CORE_QUESTION_BANK.map((q) => ({ ...q, year }));
  const generatedPool: QuestionItem[] = [];
  for (const subject of CBSE_CLASS_12_CURRICULUM) {
    for (const ch of subject.chapters) {
      generatedPool.push(...synthesizeQuestionsForChapter(subject.id, ch.id, year));
    }
  }
  return deduplicateQuestions([
    ...userQuestions,
    ...pyqs,
    ...guides,
    ...base,
    ...generatedPool,
  ]).unique;
}

export function buildMockTestQuestions(
  config: MockTestConfig,
  userQuestions: QuestionItem[] = [],
): QuestionItem[] {
  const all = getAllQuestions(config.academicYear, userQuestions);

  let pool = all.filter((q) => q.subjectId === config.subjectId);
  if (config.pyqOnly) {
    const pyqFiltered = pool.filter((q) => q.isPreviousYear);
    if (pyqFiltered.length > 0) pool = pyqFiltered;
  } else if (config.allowedSources && config.allowedSources.length > 0) {
    const allowedSet = new Set(config.allowedSources);
    const sourceFiltered = pool.filter(
      (q) => allowedSet.has(q.sourceBook) || q.sourceBook === 'User-Provided',
    );
    if (sourceFiltered.length > 0) pool = sourceFiltered;
  }
  if (config.chapterId) {
    const chapterFiltered = pool.filter((q) => q.chapterId === config.chapterId);
    if (chapterFiltered.length > 0) pool = chapterFiltered;
  }
  if (config.topic) {
    const topicFiltered = pool.filter(
      (q) => q.topic.toLowerCase().includes(config.topic!.toLowerCase()),
    );
    if (topicFiltered.length > 0) pool = topicFiltered;
  }
  if (config.difficulty !== 'Mixed') {
    const diffFiltered = pool.filter((q) => q.difficulty === config.difficulty);
    if (diffFiltered.length >= 4) pool = diffFiltered;
  }
  if (config.testType === 'Competency-Based') {
    const comp = pool.filter(
      (q) =>
        q.type === 'MCQ' ||
        q.type === 'Assertion-Reason' ||
        q.type === '4-Mark Case Study' ||
        q.type === 'Competency-Based',
    );
    if (comp.length >= 4) pool = comp;
  }

  // Prioritize Last 6 Years PYQs & verified guide questions first, then synthesized items
  const prioritized = [
    ...pool.filter((q) => q.isPreviousYear),
    ...pool.filter((q) => !q.isPreviousYear && !q.id.startsWith('syn-')),
    ...pool.filter((q) => q.id.startsWith('syn-')),
  ];

  // Ensure subject pool fallback if narrow guide/chapter subset cannot fill high mark target
  const sourceFallback =
    config.allowedSources && config.allowedSources.length > 0
      ? all.filter(
          (q) =>
            q.subjectId === config.subjectId &&
            (config.allowedSources!.includes(q.sourceBook) || q.sourceBook === 'User-Provided'),
        )
      : [];
  const fullSubjectFallback = all.filter((q) => q.subjectId === config.subjectId);
  const combined = [...prioritized, ...sourceFallback, ...fullSubjectFallback];

  const selected: QuestionItem[] = [];
  const usedIds = new Set<string>();
  let currentMarks = 0;

  // Pass 1: greedy fill without exceeding target
  for (const q of combined) {
    if (currentMarks >= config.totalMarks) break;
    if (usedIds.has(q.id)) continue;
    if (currentMarks + q.marks <= config.totalMarks) {
      selected.push(q);
      usedIds.add(q.id);
      currentMarks += q.marks;
    }
  }

  // Pass 2: top up remaining marks with 1-mark MCQs so totalMarks matches 100% accurately
  let padIndex = 0;
  while (currentMarks < config.totalMarks) {
    const template = combined[padIndex % combined.length];
    const remaining = config.totalMarks - currentMarks;
    const markVal = (remaining >= 2 && template.marks === 2 ? 2 : 1) as 1 | 2;
    selected.push({
      ...template,
      id: `${template.id}-pad-${padIndex}`,
      marks: markVal,
      type: markVal === 1 ? 'MCQ' : '2-Mark',
    });
    currentMarks += markVal;
    padIndex++;
  }

  return selected;
}
