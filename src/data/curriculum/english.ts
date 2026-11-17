import type { SubjectCurriculum } from '../../types/arora';

export const ENGLISH_CURRICULUM: SubjectCurriculum = {
  id: 'english',
  name: 'English Core',
  code: '301',
  theoryMarks: 80,
  practicalMarks: 20,
  description:
    '100% complete CBSE Class 12 English Core (Code 301) curriculum covering Reading Skills (22M), Creative Writing Skills (18M), all 8 Flamingo Prose chapters, all 5 Flamingo Poems, and all 6 Vistas Supplementary chapters (40M).',
  fullSyllabusOverview:
    'CBSE Class 12 English Core (301) carries 80 Theory Marks (3 hours) + 20 Internal Assessment Marks (ALS & Project Work). Section A evaluates Reading Comprehension through two unseen passages (Factual/Descriptive/Literary + Case-Based with visual data). Section B evaluates Creative Writing Skills (Notices, Formal/Informal Invitations & Replies, Formal Letters to the Editor & Job Applications, Articles & Reports). Section C tests analytical appreciation, extract-based inference, and value extrapolation across NCERT Flamingo (8 Prose + 5 Poems) and Vistas (6 Chapters).',
  unitWiseWeightage: [
    {
      unit: 'Section A: Reading Skills',
      chapters: 'Unseen Factual/Descriptive/Literary Passage (12M) + Case-Based Passage (10M)',
      marks: 22,
    },
    {
      unit: 'Section B: Creative Writing Skills',
      chapters: 'Notice (4M) + Invitation/Reply (4M) + Letter to Editor/Job App (5M) + Article/Report (5M)',
      marks: 18,
    },
    {
      unit: 'Section C: Literature (Flamingo & Vistas)',
      chapters: 'Extracts (Poetry 6M, Vistas 4M, Flamingo Prose 6M) + Short & Long Answer Questions (24M)',
      marks: 40,
    },
  ],
  trustedWebResources: [
    {
      title: 'CBSE Academic Senior Secondary Curriculum (Code 301)',
      domain: 'cbseacademic.nic.in',
      url: 'https://cbseacademic.nic.in',
      focus: 'Official 301 Syllabus, Blueprint & Marking Scheme',
      summary: 'Primary board portal publishing official English Core syllabus PDFs, Sample Question Papers (SQP), and marking schemes.',
    },
    {
      title: 'NCERT Official Class 12 Flamingo & Vistas Textbooks',
      domain: 'ncert.nic.in',
      url: 'https://ncert.nic.in/textbook.php',
      focus: 'Authentic Chapter Texts & Glossary',
      summary: 'Download official chapter-by-chapter NCERT PDFs of Flamingo and Vistas directly for exact textual evidence.',
    },
    {
      title: 'ePathshala Digital Reader & Audio-Visual Texts',
      domain: 'epathshala.ncert.gov.in',
      url: 'https://epathshala.ncert.gov.in',
      focus: 'Interactive Flipbooks & Chapter Recitations',
      summary: 'Ministry of Education portal offering Class 12 English Core e-books and supplementary comprehension exercises.',
    },
    {
      title: 'LearnCBSE Class 12 English Chapter Summaries & Extracts',
      domain: 'learncbse.in',
      url: 'https://www.learncbse.in/cbse-class-12-english-notes/',
      focus: 'Writing Formats, Poetic Devices & Extra Q&A',
      summary: 'Comprehensive line-by-line poem explanations, character sketches, and solved CBSE writing format templates.',
    },
    {
      title: 'Vedantu Class 12 English Core Revision Notes',
      domain: 'vedantu.com',
      url: 'https://www.vedantu.com/cbse/cbse-class-12-english-core-syllabus',
      focus: 'Extract-Based MCQs & Extrapolative Long Answers',
      summary: 'Structured board-exam answer keys comparing character arcs across Flamingo and Vistas.',
    },
  ],
  deletedChapters: [
    {
      title: 'An Elementary School Classroom in a Slum (Flamingo Poetry)',
      reason: 'Deleted in rationalized CBSE Class 12 English Core syllabus.',
    },
    {
      title: 'Should Wizard Hit Mommy? (Vistas)',
      reason: 'Deleted in rationalized CBSE Class 12 English Core syllabus.',
    },
    {
      title: 'Evans Tries an O-Level (Vistas)',
      reason: 'Deleted in rationalized CBSE Class 12 English Core syllabus.',
    },
    {
      title: 'Note-Making, Summarizing, Posters & Classified Ads',
      reason: 'Excluded from Class 12 Board Paper; replaced by focused Notice, Invitation/Reply, Formal Letter, and Article/Report tasks.',
    },
  ],
  practicals: [
    'Listening Comprehension Assessment (5 Marks): Audio comprehension of talks, interviews, or documentaries with objective verification.',
    'Speaking Skills Assessment (5 Marks): Pair/individual interaction evaluating pronunciation, fluency, coherence, and vocabulary.',
    'Project Work & Viva Voce (10 Marks): Research portfolio, survey/interview report, action plan, statement of purpose, and reflective essay on a literary or socio-cultural theme.',
  ],
  chapters: [
    {
      id: 'eng-reading',
      number: 1,
      title: 'Section A: Reading Comprehension (Unseen & Case-Based Passages)',
      unit: 'Section A: Reading Skills',
      weightageMarks: 22,
      topics: [
        'Passage 1: Unseen Factual, Descriptive or Literary Passage (12 Marks)',
        'Passage 2: Unseen Case-Based Factual Passage with Visual Inputs / Charts (10 Marks)',
        'Literal, Inferential & Evaluative Comprehension',
        'Contextual Vocabulary, Synonyms, Antonyms & Title Justification',
        'Assertion-Reason & Tone/Attitude Identification',
      ],
      subtopics: [
        'Skimming and scanning within 15-minute reading window',
        'Evidence-backed 40-word short subjective responses',
        'Interpreting statistical tables, bar graphs, and survey data',
      ],
      deletedTopics: ['Note-making and abstraction/summary writing (shifted out of Class 12 paper)'],
      definitions: [
        {
          term: 'Inferential Comprehension',
          definition: 'Reading between the lines to deduce implied author attitude, irony, or cause-and-effect not stated verbatim.',
        },
        {
          term: 'Case-Based Factual Passage',
          definition: 'Informational passage paired with charts, survey metrics, or infographics testing quantitative and verbal synthesis.',
        },
      ],
      concepts: [
        'Always read the questions first during the 15-minute reading window so your eyes locate keywords and data points systematically.',
        'For 2-mark questions (30–40 words), paraphrase key ideas from the passage in your own crisp sentences rather than copying full paragraphs verbatim.',
      ],
      detailedNotes: [
        'Passage 1 (12 Marks) blends MCQ/objective items (1M each) with 2-mark short analytical questions testing comprehension, interpretation, and vocabulary.',
        'Passage 2 (10 Marks) combines 1M objective/fill-in-the-blank items and 2M interpretive responses anchored to factual trends or visual charts.',
        'Avoid bringing outside prior assumptions into unseen passages—every answer must be strictly justified from textual evidence.',
      ],
      boardExamTips: [
        'Never skip checking whether a vocabulary question asks for a synonym, antonym, or exact word from paragraph N.',
        'Allocate a strict maximum of 35–40 minutes for Section A in the 3-hour board examination.',
      ],
      formulas: [
        { name: 'Section A Weightage', expression: 'Passage 1 (12M) + Case-Based Passage 2 (10M) = 22 Marks', units: 'marks' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'How should you verify a "Suitability of Title" MCQ in an unseen literary passage?',
          solutionSteps: [
            'Eliminate options that capture only a minor detail or single paragraph.',
            'Select the title reflecting the central overarching thesis across introduction, body, and conclusion.',
          ],
          finalAnswer: 'Central holistic theme across all paragraphs',
        },
      ],
      exercises: [
        'Practice two full unseen comprehension sets (1 literary + 1 statistical case study) under a 35-minute timer.',
      ],
      learningOutcomes: [
        'Decode complex unseen prose and data infographics rapidly with pinpoint textual evidence',
      ],
      referenceCoverage: ['CBSE Official', 'Oswaal', 'Together With', 'Xam Idea'],
    },
    {
      id: 'eng-ch1',
      number: 2,
      title: 'Section B: Creative Writing Skills (Notice, Invitations, Letters, Article & Report)',
      unit: 'Section B: Creative Writing Skills',
      weightageMarks: 18,
      topics: [
        'Notice Writing (50 Words · 4 Marks)',
        'Formal & Informal Invitations and Replies — Acceptance & Refusal (50 Words · 4 Marks)',
        'Letter to the Editor (120–150 Words · 5 Marks)',
        'Application for a Job with Detailed Bio-Data / Resume (120–150 Words · 5 Marks)',
        'Article Writing & Newspaper/School Magazine Report Writing (120–150 Words · 5 Marks)',
      ],
      subtopics: [
        'Exact CBSE boxed layout for Notices and Formal Card Invitations',
        'Third-person vs First-person pronoun consistency in invitations',
        '3-paragraph Letter to Editor structure (concern, causes/impact, actionable solutions)',
        'By-line, headline, dateline, and passive past tense in Reports',
      ],
      deletedTopics: ['Posters, Commercial/Classified Advertisements, Debate & Speech Writing'],
      definitions: [
        {
          term: 'Job Application Bio-Data',
          definition: 'Formal annexure following a covering letter listing Name, DOB, Address, Educational Qualifications in tabular form, Experience, Skills, and References.',
        },
        {
          term: 'Formal Card Invitation',
          definition: 'Single-sentence third-person boxed invitation specifying host, occasion, chief guest, date, time, venue, and RSVP.',
        },
      ],
      concepts: [
        'Notice and Card Invitation MUST sit inside a neat single-line rectangular box drawn with pencil/pen and strictly stay within 50 words.',
        'Formal Letter to the Editor uses "Subject" line cleanly, addresses "The Editor", avoids complaining to the newspaper (since newspapers only raise awareness), and signs off "Yours sincerely / Yours truly".',
      ],
      detailedNotes: [
        'Q3 Notice (4M): Format (1M) + Content (2M) + Accuracy/Expression (1M). Include Issuing Institution, NOTICE, Date, Catchy Heading, 5Ws (What, When, Where, Who, Whom to contact), and Name + Designation.',
        'Q4 Invitation/Reply (4M): Printed formal cards use third person ("request the pleasure of your benign presence"). Personal/VIP chief guest letters & informal replies use letter format in first/second person.',
        'Q5 Letters (5M): Choose wisely between Letter to Editor and Job Application—Job Application scores very consistently when educational table and covering letter follow exact format.',
        'Q6 Article vs Report (5M): Articles are analytical/persuasive (present tense + catchy title + by-line); Reports are objective event journalism (Headline + By-line + Place/Date + Past Passive voice).',
      ],
      boardExamTips: [
        'Keep Notice and Invitation word count between 45 and 55 words; exceeding 65 words costs expression marks.',
        'In Job Applications, match qualification years realistically to the advertised post.',
      ],
      formulas: [
        { name: 'CBSE Writing Rubric', expression: 'Format (1M) + Organisation (1M) + Content (2M) + Accuracy (1M)', units: '5M tasks' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'What tense and person should be used in a Newspaper Report on a Science Exhibition?',
          solutionSteps: [
            'Newspaper reports chronicle completed events objectively in Third Person.',
            'Use Simple Past and Past Passive voice (e.g., "was inaugurated", "were displayed").',
          ],
          finalAnswer: 'Third Person + Simple Past / Past Passive',
        },
      ],
      exercises: [
        'Draft a 50-word notice inviting entries for an Inter-School Robotics Workshop.',
        'Write a formal acceptance reply to an invitation to judge a District Debate.',
        'Draft a Job Application with Bio-Data for the post of PGT Physics.',
      ],
      learningOutcomes: [
        'Produce zero-error CBSE notices, invitations, formal letters, bio-data, articles, and reports within word limits',
      ],
      referenceCoverage: ['CBSE Official', 'Oswaal', 'Together With', 'All in One'],
    },
    {
      id: 'eng-ch2',
      number: 3,
      title: 'Flamingo Prose 1: The Last Lesson (Alphonse Daudet)',
      unit: 'Flamingo Prose',
      weightageMarks: 3,
      topics: [
        'Franco-Prussian War Backdrop (Alsace & Lorraine)',
        'Franz’s Reluctance vs Transformation at School',
        'Unusual Sunday-Like Silence & Elders on Back Benches',
        'M. Hamel’s Poignant Last French Lesson & Patriotic Appeal',
        'Theme of Linguistic Chauvinism & Procrastination',
      ],
      subtopics: [
        'Symbolism of M. Hamel’s ceremonial green coat and frilled shirt',
        'Irony of "Will they make them sing in German, even the pigeons?"',
        'Role of parents, Franz, and teacher in neglecting mother tongue',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Linguistic Chauvinism',
          definition: 'Prideful imposition of one’s language on conquered people, stripping them of heritage and identity.',
        },
      ],
      concepts: [
        'M. Hamel states that when a people are enslaved, as long as they hold fast to their language, it is as if they have the key to their prison.',
        'Prussian Berlin order banning French in Alsace-Lorraine turns an ordinary school morning into an unforgettable awakening of patriotism.',
      ],
      detailedNotes: [
        'Franz initially dreads scolding over participles and prefers watching Prussian soldiers drill and chirping birds.',
        'At school, the absence of usual bustle, M. Hamel’s gentle patience, and village elders (Old Hauser, former mayor, former postmaster) seated at the back reveal the gravity of the final lesson.',
        'M. Hamel blames everyone—parents for sending children to farms/mills, himself for declaring holidays to go fishing, and students for putting off learning till tomorrow.',
      ],
      boardExamTips: [
        'Contrast Franz’s initial careless perception of books as a nuisance with his final realization of them as "old friends".',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Why did M. Hamel wear his special Sunday attire on the day of the last lesson?',
          solutionSteps: [
            'To honour his 40 years of faithful service to the school and show deep reverence for the French language being taught for the last time.',
          ],
          finalAnswer: 'As a mark of respect for his 40-year career and French heritage',
        },
      ],
      exercises: [
        'Explain the significance of M. Hamel writing "Vive La France!" on the blackboard before dismissing class.',
      ],
      learningOutcomes: [
        'Analyze how political annexation affects cultural identity, language preservation, and educational urgency',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'All in One'],
    },
    {
      id: 'eng-prose-2',
      number: 4,
      title: 'Flamingo Prose 2: Lost Spring — Stories of Stolen Childhood (Anees Jung)',
      unit: 'Flamingo Prose',
      weightageMarks: 3,
      topics: [
        'Part I: "Sometimes I find a rupee in the garbage" — Saheb-e-Alam & Seemapuri',
        'Migration from Dhaka Storms & Survival through Ragpicking',
        'Paradox of Name "Saheb-e-Alam" (Lord of the Universe)',
        'Part II: "I want to drive a car" — Mukesh & Firozabad Bangle Makers',
        'Vicious Web of Sahukars, Middlemen, Policemen & Politicians',
      ],
      subtopics: [
        'Why ragpickers explain barefoot walking as a "tradition" (excuse for perpetual poverty)',
        'Loss of freedom when Saheb takes up an ₹800 tea-stall job (steel canister heavier than plastic bag)',
        'Hazardous glass-furnace conditions causing early blindness in Firozabad',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Two Distinct Worlds (Firozabad)',
          definition: 'First world: families trapped in debt and caste stigma; Second world: exploitative nexus of moneylenders, police, bureaucrats, and politicians.',
        },
      ],
      concepts: [
        'For Seemapuri adults, garbage is daily bread and a roof; for children like Saheb, it is wrapped in wonder for hidden coins.',
        'Unlike Saheb who surrenders agency at a tea stall, Mukesh dares to dream of becoming a motor mechanic despite generational pressure.',
      ],
      detailedNotes: [
        'Seemapuri sits on the periphery of Delhi yet remains miles away metaphorically in basic sanitation, running water, and schooling.',
        'Mukesh’s grandmother calls bangle-making their "karam" (destiny), reflecting fatalism, whereas Mukesh insists "I will walk" to the distant garage.',
      ],
      boardExamTips: [
        'Compare Saheb’s plastic bag vs steel canister symbolism—it is a staple 2M and 5M board question.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Why was Saheb no longer his own master after joining the tea stall?',
          solutionSteps: [
            'The ragpicking plastic bag belonged to him and symbolized carefree hope; the steel milk canister belonged to the shop owner, binding Saheb to fixed labour.',
          ],
          finalAnswer: 'Loss of personal freedom for ₹800 and meals',
        },
      ],
      exercises: [
        'Why do Firozabad bangle makers fail to organise themselves into a cooperative?',
      ],
      learningOutcomes: [
        'Critically evaluate structural poverty, child labour laws, and contrasting dreams of Saheb and Mukesh',
      ],
      referenceCoverage: ['NCERT', 'Oswaal', 'Together With'],
    },
    {
      id: 'eng-prose-3',
      number: 5,
      title: 'Flamingo Prose 3: Deep Water (William Douglas)',
      unit: 'Flamingo Prose',
      weightageMarks: 3,
      topics: [
        'Childhood Wave Knockdown at California Beach (Age 3–4)',
        'YMCA Pool Misadventure — Thrown by 18-Year-Old Bruiser',
        'Three Terrifying Ascents & Paralysis Beneath Nine Feet of Water',
        'Systematic Training under Swimming Instructor',
        'Final Solo Swim in Lake Wentworth & Warm Lake Victory',
      ],
      subtopics: [
        'Physical & psychological panic sensations (yellow water, stark terror)',
        'Instructor piece-by-piece method (belt-pulley, breathing exhalation, kicking)',
        'Roosevelt quote: "All we have to fear is fear itself"',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Systematic Desensitisation',
          definition: 'Gradual, structured skill-building under guidance used by Douglas’s instructor to convert terror into confident mastery.',
        },
      ],
      concepts: [
        'Douglas realizes in death there is peace; only the fear of death creates terror.',
        'Persistence turns a lifelong phobia into personal liberation across New Hampshire lakes.',
      ],
      detailedNotes: [
        'Douglas plans to hit the tiled bottom and spring upward like a cork, but nine feet feels like ninety before his lungs ache and darkness sweeps over.',
        'Even after learning strokes in April, tiny vestiges of old terror return when swimming alone in Lake Wentworth—he laughs at fear ("Trying to scare me, eh?") and swims two miles across.',
      ],
      boardExamTips: [
        'Highlight the two-stage recovery: first technical mastery with the instructor, then psychological mastery alone at Lake Wentworth & Warm Lake.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'How did the instructor build a swimmer out of William Douglas bit by bit?',
          solutionSteps: [
            'Secured a rope belt to an overhead cable for 5 days a week, taught underwater exhalation/inhalation, trained leg kicks at pool side, and integrated strokes over seven months.',
          ],
          finalAnswer: 'Piece-by-piece methodical conditioning over 7 months',
        },
      ],
      exercises: [
        'Elaborate on Franklin D. Roosevelt’s remark as experienced by Douglas in Deep Water.',
      ],
      learningOutcomes: [
        'Interpret psychological trauma, resilience, and autobiographical introspection',
      ],
      referenceCoverage: ['NCERT', 'Xam Idea', 'All in One'],
    },
    {
      id: 'eng-prose-4',
      number: 6,
      title: 'Flamingo Prose 4: The Rattrap (Selma Lagerlöf)',
      unit: 'Flamingo Prose',
      weightageMarks: 3,
      topics: [
        'Philosophical Metaphor: World as a Giant Rattrap',
        'Crofter Hospitality & Theft of Thirty Kronor',
        'Maze of Forest & Refuge at Ramsjö Ironworks',
        'Ironmaster’s Mistaken Identity ("Nils Olof") vs Edla Willmansson’s Empathy',
        'Redemption & Final Gift Left as "Captain von Stahle"',
      ],
      subtopics: [
        'Contrast between crofter loneliness, ironmaster pride, and Edla’s genuine compassion',
        'Christmas Eve hospitality transforming cynic into honest guest',
        'Symbolism of the small rattrap holding thirty kronor and letter',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Rattrap Metaphor',
          definition: 'Worldly riches, joys, food, and shelter act like cheese and pork baiting humans into temptation and entrapment.',
        },
      ],
      concepts: [
        'While the Ironmaster shifts from cordiality to threat upon realizing the peddler is no regimental comrade, Edla insists on honouring their promise of Christmas peace.',
        'Unconditional kindness awakens dormant human dignity, prompting the peddler to clear his conscience.',
      ],
      detailedNotes: [
        'The peddler initially accepts Edla’s invitation only after noticing her compassionate manner, though he fears walking into a lion’s den with stolen money.',
        'On Christmas morning at church, Edla and her father learn the old crofter was robbed by a rattrap seller, yet return home to find nothing stolen and a tiny rattrap containing three wrinkled ten-kronor notes.',
      ],
      boardExamTips: [
        'Edla’s persuasive kindness and the peddler’s signature "Captain von Stahle" appear repeatedly in 5M character-study board questions.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Why did the peddler decline the ironmaster’s first invitation to the manor house?',
          solutionSteps: [
            'He carried thirty stolen kronor in his pocket and feared going to the manor house would feel like voluntarily entering a trap.',
          ],
          finalAnswer: 'Fear of discovery with stolen thirty kronor',
        },
      ],
      exercises: [
        'How does Selma Lagerlöf prove that essential goodness in a human being can be awakened through understanding and love?',
      ],
      learningOutcomes: [
        'Trace moral transformation, irony, and compassionate humanism in Scandinavian fiction',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal'],
    },
    {
      id: 'eng-ch3',
      number: 7,
      title: 'Flamingo Prose 5: Indigo (Louis Fischer)',
      unit: 'Flamingo Prose',
      weightageMarks: 3,
      topics: [
        'Rajkumar Shukla — Resolute Champaran Peasant',
        'Exploitative Tinkathia System (15% Indigo Sharecropping) & Synthetic Indigo Impact',
        'Motihari Courthouse Demonstration & Gandhi’s Civil Disobedience',
        'Official Commission Inquiry & Historic 25% Refund Settlement',
        'Social, Educational & Health Upliftment in Champaran Villages',
      ],
      subtopics: [
        'Prof. Malkani’s courage to harbour Gandhi; Rajendra Prasad’s house incident',
        'Lawyers agreeing to follow Gandhi to jail',
        'Refusal of Charles Freer Andrews as a crutch — lesson in self-reliance',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Tinkathia System',
          definition: 'Colonial arrangement compelling Champaran tenants to cultivate indigo on 3/20ths (15%) of land and surrender entire harvest as rent.',
        },
      ],
      concepts: [
        'Gandhi realized Champaran’s victory lay not in court arguments or 100% refunds, but in freeing terror-stricken peasants from fear.',
        'Self-reliance, Indian independence, and help to sharecroppers were bound together when Gandhi rejected C.F. Andrews staying back to aid them.',
      ],
      detailedNotes: [
        'When Germany developed synthetic indigo, British landlords realized indigo was no longer profitable and cunningly demanded compensation from peasants to release them from 15% agreements.',
        'Spontaneous throngs of thousands of peasants outside Motihari court proved British authority could be questioned non-violently ("their might, hitherto dreaded and unquestioned, could be challenged by Indians").',
        'Beyond politics, Gandhi brought Kasturba, Mahadev Desai, and Narhari Parikh to teach primary schooling, personal hygiene, and basic medicine (castor oil, quinine, sulphur ointment).',
      ],
      boardExamTips: [
        'Remember the three turning-point elements: 25% prestige victory, Motihari mass awakening, and rejection of C.F. Andrews.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Why did Gandhi oppose C.F. Andrews staying back in Champaran to help the lawyers?',
          solutionSteps: [
            'Gandhi argued relying on an Englishman showed weakness of heart; if their cause was just, Indians had to win through self-reliance alone.',
          ],
          finalAnswer: 'To instil self-reliance among Indians',
        },
      ],
      exercises: [
        'Trace the sequence of events leading from Lucknow 1916 to the Champaran Inquiry Commission.',
      ],
      learningOutcomes: [
        'Evaluate Mahatma Gandhi’s fusion of ethical civil disobedience, legal prudence, and grassroots village reform',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Together With', 'Xam Idea'],
    },
    {
      id: 'eng-prose-6',
      number: 8,
      title: 'Flamingo Prose 6: Poets and Pancakes (Asokamitran)',
      unit: 'Flamingo Prose',
      weightageMarks: 3,
      topics: [
        'Gemini Studios Makeup Department & "Pancake" Brand Satire',
        'National Integration in Makeup Room & Strict Hierarchy',
        'Asokamitran’s Paper-Cutting Job & Kothamangalam Subbu’s Genius',
        'Legal Adviser in Story Department & Frank Buchman’s MRA Visit',
        'Stephen Spender’s Mysterious Visit & "The God That Failed" Revelation',
      ],
      subtopics: [
        'Gentle wit and understatement in Asokamitran’s prose',
        'Contrast between Subbu’s sycophancy/versatility and the office boy’s frustration',
        'Anti-Communist atmosphere at Gemini Studios',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'The God That Failed',
          definition: 'Essay anthology edited by Richard Crossman featuring six disillusioned former Communists including poet Stephen Spender.',
        },
      ],
      concepts: [
        'Subbu is portrayed affectionately yet wryly as the indispensable creative powerhouse of Gemini Studios whose cheerful loyalty made enemies of frustrated peers.',
        'Years later, a cheap 50-paisa paperback outside Mount Road Post Office solves the puzzle of why English editor Stephen Spender once visited a Tamil film studio.',
      ],
      detailedNotes: [
        'Makeup department sat in what was believed to be Robert Clive’s stables, using truckloads of Pancake to turn decent-looking actors into hideous studio faces under scorching lights.',
        'The Legal Adviser inadvertently wrecked a promising actress’s career by recording her temperamental outburst on stage and replaying it before the shocked unit.',
      ],
      boardExamTips: [
        'Subbu’s character sketch and Stephen Spender’s "Encounter" connection are top recurring questions.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'How did the author finally discover the identity of the English poet who visited Gemini Studios?',
          solutionSteps: [
            'First seeing the name "Stephen Spender" as editor of The Encounter while checking a short-story contest notice at British Council Library, and later buying "The God That Failed" with Spender’s essay.',
          ],
          finalAnswer: 'Through The Encounter magazine and "The God That Failed"',
        },
      ],
      exercises: [
        'Why was the Moral Re-Armament (MRA) army welcomed warmly at Gemini Studios?',
      ],
      learningOutcomes: [
        'Appreciate gentle literary humour, mid-century Madras studio culture, and subtle political irony',
      ],
      referenceCoverage: ['NCERT', 'Oswaal', 'All in One'],
    },
    {
      id: 'eng-prose-7',
      number: 9,
      title: 'Flamingo Prose 7: The Interview — Parts I & II (Christopher Silvester & Umberto Eco)',
      unit: 'Flamingo Prose',
      weightageMarks: 3,
      topics: [
        'Part I: Evolution of the Interview as Journalism & Literary Form',
        'Polarised Celebrity Views (Kipling, Naipaul, Lewis Carroll, Bellow vs Denis Brian)',
        'Part II: Mukund Padmanabhan Interviews Scholar-Novelist Umberto Eco',
        'Eco’s Philosophy of "Interstices" & Narrative Scholarly Style',
        'Unplanned Phenomenal Success of "The Name of the Rose"',
      ],
      subtopics: [
        'Why celebrities call interviews an unwarranted intrusion or "thumbprints on windpipe"',
        'Why Eco considers himself a university professor who writes novels on Sundays',
        'Role of timing and mystery in The Name of the Rose selling 10–15 million copies',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Interstices',
          definition: 'Empty intervals between tasks (like waiting for an elevator) that Umberto Eco creatively utilized to write whole articles.',
        },
      ],
      concepts: [
        'Despite celebrity resistance (calling interviews assault or dimming part of the soul), Denis Brian declares the interview our most vivid impression of contemporaries.',
        'Eco explains his massive output not as superhuman multitasking, but pursuing identical philosophical and semiotics interests even in children’s books and medieval thrillers.',
      ],
      detailedNotes: [
        'Rudyard Kipling condemned interviews as immoral and a crime deserving punishment, yet ironically interviewed Mark Twain years earlier.',
        'Roland Barthes remained frustrated until death over being an essayist rather than novelist; Eco, by contrast, began fiction casually around age 50 without frustration.',
      ],
      boardExamTips: [
        'Distinguish clearly between Part I (critical perspectives on journalism) and Part II (Umberto Eco’s creative process and humility).',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'What did Umberto Eco mean by saying he "works in empty spaces"?',
          solutionSteps: [
            'He eliminated wasted micro-gaps of time—such as waiting 30 seconds for an elevator—turning those interstices into productive writing moments.',
          ],
          finalAnswer: 'Using micro-gaps (interstices) for creative writing',
        },
      ],
      exercises: [
        'Why did the American publisher expect "The Name of the Rose" to sell barely 3,000 copies?',
      ],
      learningOutcomes: [
        'Evaluate ethics of media interviewing and insights into scholarly storytelling',
      ],
      referenceCoverage: ['NCERT', 'Xam Idea', 'Together With'],
    },
    {
      id: 'eng-ch4',
      number: 10,
      title: 'Flamingo Prose 8: Going Places (A.R. Barton)',
      unit: 'Flamingo Prose',
      weightageMarks: 3,
      topics: [
        'Sophie’s Unrealistic Ambitions vs Working-Class Constraints',
        'Jansie’s Grounded Pragmatism (Biscuit Factory Future)',
        'Geoff’s World of Silence & Sophie’s Need for Acceptance',
        'Imaginary Encounter with Irish Football Star Danny Casey',
        'Poignant Canal-Side Wait & Disillusionment',
      ],
      subtopics: [
        'Family dynamics in the cramped steamy kitchen',
        'Hero-worship of teenage idol Danny Casey',
        'Distinguishing conscious fabrication from self-deception',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Adolescent Escapism',
          definition: 'Psychological retreat into glamorous fantasy worlds to evade monotonous working-class socio-economic limits.',
        },
      ],
      concepts: [
        'Sophie initially invents meeting Danny Casey outside Royce’s boutique to capture brother Geoff’s admiration, then becomes trapped inside her own illusion waiting by the canal.',
        'Jansie represents realistic friendship, worried that Sophie’s romantic notions will end in bitter disappointment.',
      ],
      detailedNotes: [
        'Sophie’s father immediately sees through her tall tales and warns her fantasies will land her in "a load of trouble", while her stooped mother sighs quietly.',
        'At the bench under the solitary elm by the canal, Sophie eventually senses the bitter pang of doubt—"I don’t think he’ll ever come"—yet clings to one last memory of Casey scoring at the stadium.',
      ],
      boardExamTips: [
        'Character contrast between Sophie and Jansie, and Sophie’s quiet bond with Geoff, form core 2M and 5M prompts.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Why was Sophie jealous of Geoff’s silence?',
          solutionSteps: [
            'Geoff spoke little, suggesting he inhabited mysterious exciting places and adult independence beyond her small cramped home where Sophie longed to belong.',
          ],
          finalAnswer: 'She imagined his silence hid a glamorous adult world she longed to enter',
        },
      ],
      exercises: [
        'Explain why it was natural for Sophie to weave a story around Danny Casey after visiting the stadium.',
      ],
      learningOutcomes: [
        'Analyze adolescent aspirations, sibling bonds, and socio-economic realism in modern British short fiction',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'All in One'],
    },
    {
      id: 'eng-poem-1',
      number: 11,
      title: 'Flamingo Poetry 1: My Mother at Sixty-Six (Kamala Das)',
      unit: 'Flamingo Poetry',
      weightageMarks: 3,
      topics: [
        'Airport Drive & Realisation of Mother’s Ageing',
        'Similes: "ashen like that of a corpse" & "late winter’s moon"',
        'Stark Contrast: Dozing Mother vs Young Trees Sprinting & Merry Children Spilling',
        'Airport Security Check & Returning Childhood Fear of Separation',
        'Brave Parting Words: "See you soon, Amma" & Triple Smile',
      ],
      subtopics: [
        'Single continuous sentence punctuation mirroring unbroken emotional dread',
        'Imagery of vitality vs decay',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Late Winter’s Moon',
          definition: 'Visual simile highlighting Mother’s wan, pale, dim, fading strength resembling a hazy winter moon.',
        },
      ],
      concepts: [
        'The poet turns away towards the car window to dispel painful mortality thoughts, yet the lively sprint of trees and children only sharpens contrast with her dozing mother.',
        'The repeated word "smile and smile and smile..." masks overwhelming helplessness behind reassuring warmth.',
      ],
      detailedNotes: [
        'Driving from parent’s home to Cochin Airport on a Friday morning captures an intimate, universally relatable filial moment.',
        'Key poetic devices: Simile ("like that of a corpse", "as a late winter’s moon"), Personification ("trees sprinting"), Imagery ("merry children spilling"), Repetition ("smile and smile and smile").',
      ],
      boardExamTips: [
        'Learn exact poetic device terms (Simile, Personification, Contrast, Repetition) for 1M extract MCQs.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Why did Kamala Das look at her mother again after the security check and smile repeatedly?',
          solutionSteps: [
            'To conceal her deep childhood fear of losing her ageing mother and bid farewell on an optimistic note.',
          ],
          finalAnswer: 'To hide sorrow and reassure her mother warmly',
        },
      ],
      exercises: [
        'Explain the contrast between the scene inside the car and the scene outside the car window.',
      ],
      learningOutcomes: [
        'Interpret lyrical free verse, visual similes, and bittersweet human vulnerability',
      ],
      referenceCoverage: ['NCERT', 'Oswaal', 'Together With'],
    },
    {
      id: 'eng-ch5',
      number: 12,
      title: 'Flamingo Poetry 2: Keeping Quiet (Pablo Neruda)',
      unit: 'Flamingo Poetry',
      weightageMarks: 3,
      topics: [
        'Counting to Twelve & Keeping Still Together',
        'Exotic Moment Without Rush or Engines',
        'Ecological Peace: Fishermen Harming No Whales & Salt Gatherer Inspecting Hurt Hands',
        'Anti-War Message: "Victory with no survivors" vs Putting on Clean Clothes',
        'Earth as Teacher: Apparent Stillness Alive Underneath',
      ],
      subtopics: [
        'Distinction between constructive stillness and "total inactivity" (death)',
        'Single-mindedness of frantic modern progress causing sadness of never understanding ourselves',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Exotic Moment',
          definition: 'Rare global second of suspended noise, machinery, and hostility fostering shared human brotherhood.',
        },
      ],
      concepts: [
        'Neruda clarifies "What I want should not be confused with total inactivity; Life is what it is about; I want no truck with death."',
        'Twelve symbolises clock hours and calendar months—meaning pause for harmony throughout time.',
      ],
      detailedNotes: [
        'Key poetic devices: Alliteration ("we will", "sudden strangeness", "hurt hands", "clean clothes"), Symbolism ("cold sea", "green wars"), Anaphora ("let’s not speak... let’s stop"), Pun ("arms" = limbs/weapons).',
        'Winter seems dead on the surface, yet spring proves seeds were quietly nourishing life underneath—similarly human silence rejuvenates empathy.',
      ],
      boardExamTips: [
        'Notice the double meaning (pun) in "not move our arms so much"—physical arms and military weapons.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'What lesson does the Earth teach humanity in Pablo Neruda’s "Keeping Quiet"?',
          solutionSteps: [
            'During winter everything appears lifeless, yet beneath apparent stillness seeds germinate and burst into spring—proving quiet pause breeds renewal rather than death.',
          ],
          finalAnswer: 'Apparent stillness nurtures hidden renewal and life',
        },
      ],
      exercises: [
        'What are the different kinds of wars mentioned by Neruda and what solution does he offer?',
      ],
      learningOutcomes: [
        'Analyze anti-war pacifism, ecological mindfulness, and symbolism in Neruda’s poetry',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'All in One'],
    },
    {
      id: 'eng-poem-3',
      number: 13,
      title: 'Flamingo Poetry 3: A Thing of Beauty (John Keats)',
      unit: 'Flamingo Poetry',
      weightageMarks: 3,
      topics: [
        'Romantic Manifesto: "A thing of beauty is a joy forever"',
        'Loveliness Increases & Never Passes into Nothingness',
        'Human Despondence, Noble Natures’ Dearth & Darkened Ways',
        'Catalogue of Natural Beauties (Sun, Moon, Old & Young Trees, Daffodils, Rills, Musk-Rose)',
        'Mighty Dead & "Endless Fountain of Immortal Drink"',
      ],
      subtopics: [
        'Metaphor of "flowery band" binding us to Earth',
        'Spiritual nourishment pouring from heaven’s brink',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Grandeur of the Dooms (Mighty Dead)',
          definition: 'Inspiring nobility and heroic tales of great martyrs and ancestors that elevate human imagination forever.',
        },
      ],
      concepts: [
        'Even though human life brings gloom, malice, and unhealthy trials, beauty moves away the dark pall from our spirits.',
        'Rhyming couplets (AABBCC...) reflect classical harmony from Keats’s epic "Endymion".',
      ],
      detailedNotes: [
        'Natural blessings cited: shady boon for simple sheep, clear cooling rills against hot summer, mid-forest brake glowing with wild musk-roses.',
        'Key poetic devices: Metaphor ("bower quiet", "flowery band", "immortal drink"), Alliteration ("noble natures", "cooling covert"), Antithesis ("old and young"), Imagery ("clear rills", "daffodils in green world").',
      ],
      boardExamTips: [
        'Explain BOTH nature’s physical beauty AND inspiring stories ("lovely tales") as twin sources of eternal joy.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'What does Keats mean by "wreathing a flowery band to bind us to the earth"?',
          solutionSteps: [
            'Every morning, appreciative attachment to serene natural beauty weaves an emotional garland keeping us joyfully anchored to life despite sorrow.',
          ],
          finalAnswer: 'Daily bond of joy anchoring humanity to life',
        },
      ],
      exercises: [
        'List four negative aspects of life mentioned by Keats and explain how beauty heals them.',
      ],
      learningOutcomes: [
        'Decode Romantic imagery, rhyming couplets, and Keatsian aesthetic philosophy',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'Together With'],
    },
    {
      id: 'eng-poem-4',
      number: 14,
      title: 'Flamingo Poetry 4: A Roadside Stand (Robert Frost)',
      unit: 'Flamingo Poetry',
      weightageMarks: 3,
      topics: [
        'Plight of Rural Farmer’s Makeshift Shed on Highway Edge',
        'Callous Indifference of "Polished Traffic" (City Folk)',
        'False Promises of "Greedy Good-Doers & Beneficent Beasts of Prey"',
        'Childish Longing at Open Window & Three Empty Car Stops',
        'Poet’s Momentary Wish for Painless Relief vs Sober Compassion',
      ],
      subtopics: [
        'Transferred epithets ("polished traffic", "selfish cars")',
        'Oxymorons ("greedy good-doers", "beneficent beasts of prey")',
        'Why city money never reaches rural pockets',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Transferred Epithet',
          definition: 'Adjective transferred from the insensitive rich commuters onto their vehicles ("polished traffic", "selfish cars").',
        },
      ],
      concepts: [
        'The farmer is NOT begging for charity ("dole of bread"), only yearning for fair urban cash flow to lift rural dignity.',
        'Planned welfare relocations actually numb rural agency ("destroy their sleeping at night the ancient way").',
      ],
      detailedNotes: [
        'Three cars stop only for selfish errands: turning around and ploughing up grass, asking road directions, or asking for a gallon of gas.',
        'Frost candidly admits an impulsive urge to end their unbearable misery at one stroke, before waking to sanity and wishing someone could gently ease his own helplessness too.',
      ],
      boardExamTips: [
        'Both Transferred Epithet and Oxymoron ("greedy good-doers") are flagship literary-device questions in CBSE Board exams.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Explain the irony behind the phrase "greedy good-doers" in A Roadside Stand.',
          solutionSteps: [
            'Politicians and developers pose as benevolent saviours relocating villagers near theatres and stores, yet covertly profit from exploiting them and robbing their independence.',
          ],
          finalAnswer: 'Self-serving exploiters disguised as social reformers',
        },
      ],
      exercises: [
        'Why did the roadside stand "pathetically plead"? What did city travellers complain about instead?',
      ],
      learningOutcomes: [
        'Critique rural-urban economic disparity and rhetorical devices in Frost’s social verse',
      ],
      referenceCoverage: ['NCERT', 'Xam Idea', 'Oswaal'],
    },
    {
      id: 'eng-poem-5',
      number: 15,
      title: 'Flamingo Poetry 5: Aunt Jennifer’s Tigers (Adrienne Rich)',
      unit: 'Flamingo Poetry',
      weightageMarks: 3,
      topics: [
        'Screen Tapestry of Fearless "Bright Topaz Denizens"',
        'Fluttering Fingers & Heavy Weight of "Uncle’s Wedding Band"',
        'Terrified Hands Ringed with Ordeals Even in Death',
        'Permanence of Art Outlasting Patriarchal Oppression',
      ],
      subtopics: [
        'Contrast between Aunt Jennifer’s timidity and the tigers’ "chivalric certainty"',
        'Visual symbolism of gold ring vs vibrant embroidered tigers',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Chivalric Certainty',
          definition: 'Majestic, fearless confidence displayed by Aunt Jennifer’s prancing tigers who "do not fear the men beneath the tree".',
        },
      ],
      concepts: [
        'Patriarchal marital oppression crushes Aunt Jennifer’s spirit so deeply that even an ivory needle feels hard to pull.',
        'While her mortal body remains "mastered by" lifelong ordeals even after death, her creative artwork stays eternally proud and unafraid.',
      ],
      detailedNotes: [
        'Key poetic devices: Metaphor ("bright topaz denizens", "ringed with ordeals"), Pun ("ringed" = wedding band + encircled by suffering), Alliteration ("fingers fluttering", "prancing proud"), Hyperbole ("massive weight of Uncle’s wedding band").',
      ],
      boardExamTips: [
        'Notice the sharp irony in Stanza 3: death frees neither her legacy nor her hands from the "wedding band", only her art achieves immortality.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'What do the tigers symbolize in relation to Aunt Jennifer’s inner desires?',
          solutionSteps: [
            'They embody her repressed yearning for freedom, fearlessness, dignity, and escape from domestic domination.',
          ],
          finalAnswer: 'Suppressed longing for freedom, courage, and self-expression',
        },
      ],
      exercises: [
        'Contrast the state of Aunt Jennifer’s hands in death with the future of her embroidered tigers.',
      ],
      learningOutcomes: [
        'Examine feminist symbolism, imagery contrast, and artistic permanence',
      ],
      referenceCoverage: ['NCERT', 'Oswaal', 'Together With'],
    },
    {
      id: 'eng-vistas-1',
      number: 16,
      title: 'Vistas 1: The Third Level (Jack Finney)',
      unit: 'Vistas Supplementary Reader',
      weightageMarks: 2,
      topics: [
        'Grand Central Station’s Two Official Levels vs Charley’s Third Level',
        'Sam Weiner’s Psychiatric Diagnosis: "A Waking-Dream Wish Fulfilment"',
        '1894 Galesburg, Illinois — Nostalgic Pre-War Utopia',
        'Details of 1894: Brass Spittoons, Gaslights, The World Newspaper (June 11, 1894)',
        'Old-Style Currency Exchange & Sam’s First-Day Cover Letter from 1894',
      ],
      subtopics: [
        'Stamp collecting as "temporary refuge from reality"',
        'Twist ending: Psychiatrist Sam himself bought 800 dollars of 1894 currency',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'First-Day Cover',
          definition: 'Envelope stamped and postmarked on a new stamp’s issue day, mailed blank to oneself as a collector’s keepsake.',
        },
      ],
      concepts: [
        'Modern insecurity, war, fear, and frantic worry drive Charley subconsciously toward quiet 1894 Galesburg before World Wars.',
        'The letter signed "Sam" blurs boundaries between psychological illusion and surreal time-travel.',
      ],
      detailedNotes: [
        'Charley turns down his hobby defense—pointing out even President Roosevelt collected stamps without running from reality.',
        'When Charley tries to buy two tickets to Galesburg, the ticket clerk eyeballs his modern bills and threatens jail for "trying to skin me", forcing Charley to flee and trade $300 for less than $200 old bills.',
      ],
      boardExamTips: [
        'Explore both rational psychological readings and fantasy/irony of psychiatrist Sam disappearing into 1894.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'What convinced Charley that he had actually walked into the year 1894 at the Third Level?',
          solutionSteps: [
            'Open-flame gaslights, brass spittoons, Currier & Ives locomotive, men with handlebar moustaches and pocket watches, plus "The World" newspaper dated June 11, 1894.',
          ],
          finalAnswer: '1894 dress, gaslights, currency, and "The World" dated June 11, 1894',
        },
      ],
      exercises: [
        'What does Sam’s letter inside Grandfather’s first-day cover reveal about modern anxiety?',
      ],
      learningOutcomes: [
        'Evaluate intersection of modern psychological stress, nostalgia, and speculative fiction',
      ],
      referenceCoverage: ['NCERT', 'Oswaal', 'All in One'],
    },
    {
      id: 'eng-vistas-2',
      number: 17,
      title: 'Vistas 2: The Tiger King (Kalki)',
      unit: 'Vistas Supplementary Reader',
      weightageMarks: 2,
      topics: [
        'Birth Prophecy by Royal Astrologers & 10-Day-Old Prince’s Challenge',
        'Warning About the Hundredth Tiger',
        'Maharaja’s Ten-Year Tiger Slaughter (70 in Pratibandapuram + 30 via Royal Marriage)',
        'Bribe of Diamond Rings to appease Duraisani & Save Throne',
        'Dramatic Irony of the Wooden Toy Tiger’s Sliver',
      ],
      subtopics: [
        'Satire on sycophantic courtiers, whimsical taxes, and British colonial arrogance',
        'Dewan’s frantic smuggling of an old circus tiger from People’s Park, Madras',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Dramatic Irony',
          definition: 'Audience sees the Maharaja triumphantly believing he killed his 100th tiger while hunters know the old tiger merely fainted—and a wooden toy ultimately claims his life.',
        },
      ],
      concepts: [
        'Kalki employs biting political satire to mock absolute rulers who squander state governance, taxes, and wildlife on petty ego.',
        'Three famous surgeons famously announce: "The operation was successful. The Maharaja is dead"—highlighting comic bureaucratic absurdity.',
      ],
      detailedNotes: [
        'When a high-ranking British officer wanted a photograph holding a gun beside a tiger carcass, the Maharaja risked losing his kingdom and spent ₹3 lakh gifting 50 diamond rings from Calcutta jewellers to the officer’s wife.',
        'For his son’s third birthday, the Maharaja bought a poorly carved wooden tiger for 2 annas and a quarter; a tiny sliver pierced his right hand, causing fatal infection.',
      ],
      boardExamTips: [
        'Connect Tiger King directly to modern wildlife conservation and arrogance of power.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'How did the hundredth tiger take its revenge on the Tiger King?',
          solutionSteps: [
            'The real 100th tiger only fainted from bullet shock; ironically, a cheap wooden toy tiger bought for his son pierced the Maharaja’s hand with a sliver, causing fatal septic infection.',
          ],
          finalAnswer: 'A wooden toy tiger caused fatal infection',
        },
      ],
      exercises: [
        'Describe how the Dewan averted the Maharaja’s fury when tiger population dwindled at 99.',
      ],
      learningOutcomes: [
        'Appreciate satirical devices, dramatic irony, and ecological caution in Indian English literature',
      ],
      referenceCoverage: ['NCERT', 'Xam Idea', 'Together With'],
    },
    {
      id: 'eng-vistas-3',
      number: 18,
      title: 'Vistas 3: Journey to the End of the Earth (Tishani Doshi)',
      unit: 'Vistas Supplementary Reader',
      weightageMarks: 2,
      topics: [
        '100-Hour Voyage Aboard Russian Vessel Akademik Shokalskiy',
        'Geological History: Supercontinent Gondwana (650 Million Years Ago)',
        'Antarctica as Earth’s Pristine Climate Archive (500,000-Year Ice Cores)',
        'Geoff Green’s "Students on Ice" Educational Initiative',
        'Microscopic Phytoplankton Parable & Weddell Sea Ice-Floe Walk',
      ],
      subtopics: [
        'Human 12,000-year "ruckus" vs deep geological time',
        'Why Antarctica has 90% of Earth’s total ice volume and zero permanent population',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Phytoplankton',
          definition: 'Single-celled microscopic sea plants sustaining the entire Southern Ocean food chain through photosynthesis; endangered by ozone depletion.',
        },
      ],
      concepts: [
        '"To study the Earth’s past, present, and future, Antarctica is the place to go"—its untouched ice layers preserve carbon records half a million years old.',
        'Taking high school students instead of retired celebrities sparks real urgency because students are future policymakers ready to absorb and act.',
      ],
      detailedNotes: [
        'Tishani Doshi walked on 1-metre-thick pack ice over 180 metres of living sea water alongside crabeater seals—an epiphany linking microscopic care to planetary survival.',
        '"Take care of the small things and the big things will take care of themselves" summarises ecological interdependence.',
      ],
      boardExamTips: [
        'Remember exact facts: Akademik Shokalskiy, 650 million years Gondwana, half-million-year carbon records, Phytoplankton lesson.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Why did Geoff Green shift from hosting celebrities to taking high school students to Antarctica?',
          solutionSteps: [
            'Retired rich celebrities could offer limited returns, whereas high school youth possess curiosity, energy, and decades ahead as future policymakers.',
          ],
          finalAnswer: 'Youth are receptive learners and future decision-makers',
        },
      ],
      exercises: [
        'How does the story of phytoplankton illustrate the fragility of Earth’s climate balance?',
      ],
      learningOutcomes: [
        'Synthesize climate science, geological deep time, and environmental responsibility',
      ],
      referenceCoverage: ['NCERT', 'Oswaal', 'All in One'],
    },
    {
      id: 'eng-vistas-4',
      number: 19,
      title: 'Vistas 4: The Enemy (Pearl S. Buck)',
      unit: 'Vistas Supplementary Reader',
      weightageMarks: 3,
      topics: [
        'Dr. Sadao Hoki’s American Education & Traditional Japanese Father',
        'Wounded American POW (Tom) Washed Ashore During WWII',
        'Moral Dilemma: Patriotism vs Hippocratic Medical Duty',
        'Servants’ Protest & Quiet Departure vs Hana’s Brave Assistance',
        'Old General’s Selfish Promise, Unsent Assassins & Boat Escape Plan',
      ],
      subtopics: [
        'Why Sadao was kept in Japan instead of sent to war front (General’s health)',
        'Why Sadao secretly wonders at the end why he could not kill Tom',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Medical Humanism',
          definition: 'Ethical conviction that saving an injured human life supersedes wartime enmity, prejudice, and nationalist hatred.',
        },
      ],
      concepts: [
        'Dr. Sadao navigates both duty and patriotism responsibly: he operates flawlessly to save Tom’s life, openly confesses to the General, waits three agonizing nights for assassins, and finally facilitates Tom’s safe escape.',
        'Both Sadao and Hana rise above prejudice; even Yumi’s refusal to wash a white enemy highlights how deeply ingrained nationalism is in common society.',
      ],
      detailedNotes: [
        'Sadao equips Tom with a stout boat, extra food, water, two quilts, and his own flashlight—instructing him to signal two flashes only if food runs out on the uninhabited island before boarding a Korean fishing boat.',
        'At the end, the General sheepishly admits he simply forgot his promise to send assassins because he was absorbed in his own illness—relieving Sadao of any treason.',
      ],
      boardExamTips: [
        'Prove Dr. Sadao was neither a traitor nor insensitive using the General’s confession and Sadao’s medical training.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'How did Dr. Sadao resolve his conflict between medical duty and loyalty to Japan?',
          solutionSteps: [
            'He upheld medical ethics by removing the bullet and nursing Tom back to health, reported the prisoner to the General, and only helped Tom escape after waiting three nights when no assassins arrived.',
          ],
          finalAnswer: 'Honoured both medical oath and state transparency before ensuring humanitarian release',
        },
      ],
      exercises: [
        'Comment on the character of Hana as an ideal partner during crisis in "The Enemy".',
      ],
      learningOutcomes: [
        'Evaluate wartime moral dilemmas, cross-cultural empathy, and character courage',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'Xam Idea'],
    },
    {
      id: 'eng-ch6',
      number: 20,
      title: 'Vistas 5: On the Face of It (Susan Hill)',
      unit: 'Vistas Supplementary Reader',
      weightageMarks: 3,
      topics: [
        'Derry’s Acid-Scarred Face & Defiant Alienation',
        'Mr. Lamb’s Tin Leg ("Lamey-Lamb"), Open Gate & Crab-Apple Garden',
        'Perspective Lesson: Weed vs Flower & Bees Buzzing vs Singing',
        'Contrast Between Derry’s Overprotective Mother & Mr. Lamb’s Empowerment',
        'Climactic Return & Tragic Ladder Fall',
      ],
      subtopics: [
        'Fable of the man who locked himself inside a room out of fear',
        'Harm of pity and whispers ("None will ever kiss him except his mother")',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Psychological Isolation',
          definition: 'Self-imposed withdrawal caused more by society’s stares, cruel pity, and internal bitterness than physical disability itself.',
        },
      ],
      concepts: [
        'Mr. Lamb explains that acid only burned Derry’s face outside, whereas bitterness and cynicism risk eating him away inside.',
        'Keeping no curtains and an open garden gate symbolises Mr. Lamb’s boundless openness to friendship.',
      ],
      detailedNotes: [
        'When Derry insists his mother won’t let him come back, Mr. Lamb refuses to order him, saying "If you choose—it’s your legs."',
        'Derry confronts his mother ("If I don’t go back there, I’ll never go anywhere in this world again") and sprints back to help Mr. Lamb pick crab-apples, finding his mentor fallen dead beneath the ladder—yet spiritually transformed forever.',
      ],
      boardExamTips: [
        'Explain why Derry returning at the end represents victory rather than defeat, despite Mr. Lamb’s tragic fall.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'What does Mr. Lamb mean by comparing weeds and flowers in his garden?',
          solutionSteps: [
            'Life grows everywhere equally; labels like "weed" or "flower" are subjective prejudices—just as people judge physical differences superficially.',
          ],
          finalAnswer: 'All living things hold equal value beyond superficial labels',
        },
      ],
      exercises: [
        'Compare the attitude of Derry’s mother and Mr. Lamb towards Derry’s burnt face.',
      ],
      learningOutcomes: [
        'Develop empathy towards disability inclusion, self-acceptance, and inner resilience',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'All in One'],
    },
    {
      id: 'eng-vistas-6',
      number: 21,
      title: 'Vistas 6: Memories of Childhood (Zitkala-Sa & Bama)',
      unit: 'Vistas Supplementary Reader',
      weightageMarks: 3,
      topics: [
        'Part I: "The Cutting of My Long Hair" (Zitkala-Sa / Gertrude Simmons Bonnin)',
        'Cultural Erasure at Carlisle Indian Industrial Boarding School',
        'Formula Eating by Bell & Trauma of Shingled Hair',
        'Part II: "We Too Are Human Beings" (Bama)',
        'Elder Carrying Vadais by String & Annan’s Counsel on Education as Empowerment',
      ],
      subtopics: [
        'Parallel oppression across continents: Racial assimilation in USA vs Caste discrimination in Tamil Nadu',
        'Meaning of shingled hair in Native American warrior culture (cowards/mourners)',
      ],
      deletedTopics: ['None'],
      definitions: [
        {
          term: 'Cultural Marginalisation',
          definition: 'Systematic silencing and humiliation of indigenous or lower-caste communities by dominant social hierarchies.',
        },
      ],
      concepts: [
        'While little Zitkala-Sa protests fiercely by kicking, scratching, and hiding under a bed until overpowered, Bama channels outrage constructively through academic excellence.',
        'Both autobiographical voices prove early childhood shocks forge lifelong fighters for human dignity.',
      ],
      detailedNotes: [
        'Bama initially giggled watching an elder hold a packet of vadais and bhajjis carefully by its string without touching it; her elder brother Annan explained the tragic reality of untouchability.',
        'Annan advised Bama: "Because we are born into this community, we are never given dignity... Study with care and learn all you can; people will come to you of their own accord." Bama stood first in class and earned many friends.',
      ],
      boardExamTips: [
        'Comparative 5M questions frequently ask how Zitkala-Sa and Bama reacted differently yet stood equally brave against injustice.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'How do both Zitkala-Sa and Bama share a common thread despite living on opposite sides of the globe?',
          solutionSteps: [
            'Both endured childhood humiliation due to prejudice (racial assimilation vs caste untouchability) and both resisted submission—fighting fiercely or excelling through education.',
          ],
          finalAnswer: 'Shared resistance against racial and caste marginalisation',
        },
      ],
      exercises: [
        'What cultural beliefs did Zitkala-Sa’s mother instil in her about cut hair, and why did she resist?',
      ],
      learningOutcomes: [
        'Compare global autobiographical narratives of social justice, equality, and educational empowerment',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'Together With'],
    },
  ],
};
