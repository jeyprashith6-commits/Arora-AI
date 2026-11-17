import type {
  AdaptiveResponseStyle,
  IntelligenceThinkingDepth,
} from '../types/arora';

export type ProblemDomain =
  | 'physics'
  | 'chemistry'
  | 'mathematics'
  | 'biology'
  | 'computer_science'
  | 'english'
  | 'logical_reasoning'
  | 'general_knowledge';

export interface QueryIntelligenceProfile {
  responseStyle: Exclude<AdaptiveResponseStyle, 'auto'>;
  thinkingDepth: IntelligenceThinkingDepth;
  primaryDomain: ProblemDomain;
  crossSubjectBridge?: string;
  isCodingRequest: boolean;
  isFollowUpOrFragment: boolean;
  hasMissingDataRisk: boolean;
  hasMisconceptionRisk: boolean;
  requiresStepByStep: boolean;
  styleInstruction: string;
}

const DOMAIN_SIGNALS: { domain: ProblemDomain; regex: RegExp }[] = [
  {
    domain: 'computer_science',
    regex:
      /\b(python|sql|mysql|rdbms|stack|queue|algorithm|recursion|file handling|csv|binary file|debug|syntax error|traceback|time complexity|code|program|script|html|css|javascript|typescript|java|c\+\+|loop|array|function|database|join|group by)\b/i,
  },
  {
    domain: 'mathematics',
    regex:
      /\b(integral|integration|differentiation|derivative|dy\/dx|matrix|matrices|determinant|vector|3d geometry|linear programming|probability|bayes|differential equation|relation|function|inverse trig|calculus|theorem|prove that|solve for x|eigen|quadratic)\b/i,
  },
  {
    domain: 'physics',
    regex:
      /\b(gauss|coulomb|electric field|potential|capacitor|capacitance|kirchhoff|ohm|wheatstone|biot|savart|ampere|faraday|lenz|lcr|impedance|transformer|em wave|ray optics|lens|prism|microscope|telescope|young|double slit|diffraction|photoelectric|bohr|nuclear|binding energy|p-n junction|rectifier|semiconductor|flux|tesla|henry|newton|acceleration|velocity|torque|emf)\b/i,
  },
  {
    domain: 'chemistry',
    regex:
      /\b(raoult|nernst|nernst equation|electrode|electrode potential|cell potential|electrochem|kohlrausch|rate constant|arrhenius|half life|kinetics|lanthanoid|coordination|iupac|ligand|crystal field|haloalkane|sn1|sn2|alcohol|phenol|ether|aldehyde|ketone|aldol|cannizzaro|carboxylic|amine|diazonium|biomolecule|molarity|molality|ph|gibbs|enthalpy|entropy|mole|reaction|reagent|298\s*k)\b/i,
  },
  {
    domain: 'biology',
    regex:
      /\b(spermatogenesis|oogenesis|fertilization|endosperm|mendel|linkage|dna|rna|transcription|translation|lac operon|hardy|weinberg|immunity|antibody|microbes|biogas|recombinant|pcr|plasmid|ecori|bt cotton|ecology|ecosystem|biodiversity|mitochondria|photosynthesis|chromosome)\b/i,
  },
  {
    domain: 'english',
    regex:
      /\b(flamingo|vistas|poem|poet|stanza|metaphor|simile|alliteration|grammar|tense|passive voice|reported speech|notice writing|letter to editor|article writing|invitation|reply|precis|literary|character sketch|theme of)\b/i,
  },
  {
    domain: 'logical_reasoning',
    regex:
      /\b(syllogism|assertion|reason|puzzle|deduce|paradox|contradiction|if all|therefore|logic|riddle|pattern|series|fallacy|compare|contrast|tradeoff|why is it false)\b/i,
  },
];

function detectPrimaryDomain(text: string): ProblemDomain {
  let bestDomain: ProblemDomain = 'general_knowledge';
  let bestScore = 0;

  for (const entry of DOMAIN_SIGNALS) {
    const globalRegex = new RegExp(entry.regex.source, 'gi');
    const matches = text.match(globalRegex);
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestDomain = entry.domain;
    }
  }
  return bestDomain;
}

function detectCrossSubjectBridge(
  text: string,
  domain: ProblemDomain,
): string | undefined {
  const lower = text.toLowerCase();
  if (
    (domain === 'chemistry' && /(nernst|gibbs|kinetics|half[- ]life|arrhenius|rate)/.test(lower)) ||
    (domain === 'physics' && /(decay|flux|rc circuit|lcr|ac|calculus|integral|differenti)/.test(lower))
  ) {
    return 'Connect core physical/chemical principles clearly with the underlying logarithmic or calculus reasoning.';
  }
  if (
    domain === 'biology' &&
    /(dna|rna|hydrogen bond|pcr|enzyme|ph|denaturation|gel electrophoresis)/.test(lower)
  ) {
    return 'Connect the biological process with chemical bonding, charge/polarity, or thermal principles where insightful.';
  }
  if (
    domain === 'computer_science' &&
    /(recursion|complexity|fibonacci|factorial|logic gate|boolean)/.test(lower)
  ) {
    return 'Link algorithmic logic cleanly to mathematical induction or Boolean laws when useful.';
  }
  if (
    domain === 'physics' &&
    /(semiconductor|diode|photoelectric|band gap|bohr)/.test(lower)
  ) {
    return 'Link quantum/atomic energy levels cleanly to electronic circuit behaviour.';
  }
  return undefined;
}

const STYLE_INSTRUCTIONS: Record<
  Exclude<AdaptiveResponseStyle, 'auto'>,
  string
> = {
  quick_answer:
    'STYLE: Quick Answer. Lead with the exact core answer, rule, or formula in 2–4 crisp sentences (under ~120 words) unless the problem strictly requires brief calculation checks.',
  simple_explanation:
    'STYLE: Simple Explanation. Use everyday intuition, a relatable Indian daily-life or classroom analogy, and clear plain language—zero intimidating jargon until the core idea clicks.',
  detailed_explanation:
    'STYLE: Detailed Explanation. Explain why and how from first principles with clean structure, definitions, intuition, a concrete worked example, and key edge cases.',
  deep_conceptual:
    'STYLE: Deep Conceptual Analysis. Probe underlying physical/mathematical causes, assumptions, boundary conditions, counter-examples, and cross-subject connections.',
  step_by_step:
    'STYLE: Step-by-Step Solution. Organize rigorously: (1) Given data & units / problem statement, (2) Applicable law/formula/algorithm, (3) Step-by-step substitution or logical proof, (4) Verified final answer with proper SI units & sanity check.',
  board_exam:
    'STYLE: CBSE Board Exam Answer. Format strictly to maximize CBSE marking-scheme credit: crisp opening statement/law, neat labelled steps or formula with SI units, underlined/highlighted key terms, and concluding takeaway.',
  real_world_application:
    'STYLE: Real-World Application. Explain the core principle concisely, then illustrate how it operates in real engineering, medicine, technology, or everyday Indian scenarios.',
  interactive_questioning:
    'STYLE: Interactive Questioning. Give a concise scaffolded explanation/hint without dumping the final answer prematurely, then ask one focused check question to guide thinking.',
};

export function analyzeQueryIntelligence(params: {
  message: string;
  mode?: string;
  historyLength?: number;
  attachmentCount?: number;
  interactiveActive?: boolean;
}): QueryIntelligenceProfile {
  const msg = params.message.trim();
  const lower = msg.toLowerCase();
  const wordCount = msg ? msg.split(/\s+/).length : 0;
  const historyLen = params.historyLength ?? 0;
  const attachmentCount = params.attachmentCount ?? 0;
  const mode = params.mode || 'Auto (Smart)';

  const isCodingRequest =
    mode === 'Coding' ||
    /\b(code|python|sql|program|script|algorithm|debug|traceback|syntax error|stack|queue|function|html|css|javascript|typescript|java|c\+\+|binary file|csv file)\b/i.test(
      msg,
    );

  const primaryDomain = detectPrimaryDomain(msg);
  const crossSubjectBridge = detectCrossSubjectBridge(msg, primaryDomain);

  const isFollowUpOrFragment =
    historyLen > 0 &&
    (wordCount <= 6 ||
      /^(why|how|what if|and |but |so |then |explain (that|more|step|again)|simplify|in short|example|what about|athu|eppadi|yen|ithu|step \d+)/i.test(
        lower,
      ));

  const explicitQuick =
    /\b(in short|briefly|tl;?dr|one line|1 line|short answer|quickly|simply state|just tell|short-a|surukkama)\b/i.test(
      lower,
    );
  const explicitSimple =
    /\b(simple words|simply explain|like i'?m \d+|beginner|basic idea|layman|easy way|simple-a|puriyura mathiri|eliyama)\b/i.test(
      lower,
    );
  const explicitBoardExam =
    /\b(board exam|cbse answer|marking scheme|3 mark|5 mark|2 mark|how to write in exam|full marks|board pattern)\b/i.test(
      lower,
    );
  const explicitStepByStep =
    /\b(solve|derive|derivation|calculate|find the|evaluate|integrate|differentiate|prove that|step by step|numerical|balance the equation|mechanism|debug|trace)\b/i.test(
      lower,
    ) ||
    /[=+\-*/^∫∑√]/.test(msg);
  const explicitDeepWhy =
    /\b(why does|why is|how does .* work|first principles|intuition|underlying|deep dive|conceptual|compare|contrast|difference between)\b/i.test(
      lower,
    );
  const explicitRealWorld =
    /\b(real[- ]life|real[- ]world|practical application|everyday life|used in industry|where is .* used)\b/i.test(
      lower,
    );
  const explicitQuiz =
    /\b(quiz me|ask me a question|test me|give me a practice question|check my understanding)\b/i.test(
      lower,
    );

  let responseStyle: Exclude<AdaptiveResponseStyle, 'auto'> = 'detailed_explanation';

  if (params.interactiveActive || explicitQuiz) {
    responseStyle = explicitStepByStep ? 'step_by_step' : 'interactive_questioning';
  } else if (explicitQuick) {
    responseStyle = 'quick_answer';
  } else if (explicitSimple) {
    responseStyle = 'simple_explanation';
  } else if (explicitBoardExam || mode === 'Board Exam') {
    responseStyle = 'board_exam';
  } else if (explicitStepByStep || mode === 'Problem Solving' || mode === 'Coding') {
    responseStyle = 'step_by_step';
  } else if (explicitRealWorld) {
    responseStyle = 'real_world_application';
  } else if (explicitDeepWhy || mode === 'Research') {
    responseStyle = 'deep_conceptual';
  } else if (mode === 'Quick Answer') {
    responseStyle = 'quick_answer';
  } else if (mode === 'Study') {
    responseStyle = 'board_exam';
  } else if (mode === 'Creative') {
    responseStyle = 'simple_explanation';
  } else if (mode === 'Deep Explanation') {
    responseStyle = 'detailed_explanation';
  } else {
    // Auto (Smart) inference when user has not constrained a specific mode
    if (wordCount <= 5 && /^(hi|hello|hey|vanakkam|thanks|thank you|ok|okay)\b/i.test(lower)) {
      responseStyle = 'quick_answer';
    } else if (/^what is (the )?(si unit|formula|value|definition) of\b/i.test(lower)) {
      responseStyle = 'quick_answer';
    } else if (/\bwhy\b|\bhow\b/i.test(lower)) {
      responseStyle = 'deep_conceptual';
    } else {
      responseStyle = 'detailed_explanation';
    }
  }

  const isGreetingOrTrivial =
    wordCount <= 5 &&
    /^(hi|hello|hey|good (morning|afternoon|evening)|vanakkam|thanks|thank you|bye|ok|okay|yes|no)\b[!?. ]*$/i.test(
      lower,
    );

  const isComplexReasoningQuery =
    attachmentCount > 0 ||
    mode === 'Research' ||
    /\b(derive|derivation|proof|prove that|multi[- ]step|nernst|wheatstone|kirchhoff|lcr|bayes|differential equation|integral|integration|sn1|sn2|aldol|cannizzaro|debug|fix this code|time complexity|case study|assertion|reason|compare .* and|why does|paradox)\b/i.test(
      lower,
    ) ||
    wordCount >= 28;

  const isUltraDeepQuery =
    attachmentCount > 0 ||
    (mode === 'Research' && wordCount >= 12) ||
    /\b(derive|prove that|complete derivation|step-by-step numerical|debug .* error|find the mistake|analyze .* mechanism|compare and contrast .* in detail)\b/i.test(
      lower,
    );

  let thinkingDepth: IntelligenceThinkingDepth = 'MEDIUM';
  if (isGreetingOrTrivial || (responseStyle === 'quick_answer' && !isComplexReasoningQuery)) {
    thinkingDepth = 'LOW';
  } else if (isUltraDeepQuery) {
    thinkingDepth = 'XHIGH';
  } else if (
    isComplexReasoningQuery ||
    responseStyle === 'step_by_step' ||
    responseStyle === 'deep_conceptual' ||
    primaryDomain === 'mathematics' ||
    primaryDomain === 'physics' ||
    primaryDomain === 'computer_science'
  ) {
    thinkingDepth = 'HIGH';
  } else {
    thinkingDepth = 'MEDIUM';
  }

  // Quantitative prompt missing parameters / units heuristic to trigger clarification guard
  const mentionsCalculation = /\b(calculate|find the|determine the|compute|what is the (value|force|current|voltage|emf|velocity|acceleration|rate|ph|mass))\b/i.test(
    lower,
  );
  const hasNumbers = /\d/.test(msg);
  const hasMissingDataRisk =
    mentionsCalculation && !hasNumbers && historyLen === 0 && !/\b(formula|expression|derivation)\b/i.test(lower);

  // Common STEM trap / question-error risk cues so ARORA checks premises instead of blindly agreeing
  const hasMisconceptionRisk =
    /\b(is it true|always|never|perpetual|100% efficient|faster than light|electric current is a vector|mass changes with gravity|acid has ph above 7|zero resistance at room|prove 1\s*=\s*2|divide by zero)\b/i.test(
      lower,
    ) || isFollowUpOrFragment;

  return {
    responseStyle,
    thinkingDepth,
    primaryDomain,
    crossSubjectBridge,
    isCodingRequest,
    isFollowUpOrFragment,
    hasMissingDataRisk,
    hasMisconceptionRisk,
    requiresStepByStep:
      responseStyle === 'step_by_step' ||
      explicitStepByStep ||
      primaryDomain === 'mathematics',
    styleInstruction: STYLE_INSTRUCTIONS[responseStyle],
  };
}
