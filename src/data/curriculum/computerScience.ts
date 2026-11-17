import type { SubjectCurriculum } from '../../types/arora';

export const COMPUTER_SCIENCE_CURRICULUM: SubjectCurriculum = {
  id: 'computer_science',
  name: 'Computer Science',
  code: '083',
  theoryMarks: 70,
  practicalMarks: 30,
  description:
    '100% complete CBSE Class 12 Computer Science (Code 083) curriculum covering Python Revision Tour, Functions, Exception Handling, Text/Binary/CSV File Handling, Stack Data Structure, Computer Networks, Relational Databases, SQL Joins/Functions, and Python-MySQL Connectivity.',
  fullSyllabusOverview:
    'CBSE Class 12 Computer Science (Code 083) consists of 70 Marks Theory (3 Hours) + 30 Marks Practical Assessment. Unit I (Computational Thinking and Programming – 2) carries 40 Marks, Unit II (Computer Networks) carries 10 Marks, and Unit III (Database Management) carries 20 Marks. The Practical Exam evaluates a Python + SQL Lab Test (12M), Report File of minimum 15–20 Python programs & SQL queries (7M), Real-World Project (8M), and Viva Voce (3M).',
  unitWiseWeightage: [
    {
      unit: 'Unit I: Computational Thinking and Programming - 2',
      chapters: 'Python Revision Tour, Functions, Exception Handling, Text/Binary/CSV File Handling, Stack',
      marks: 40,
    },
    {
      unit: 'Unit II: Computer Networks',
      chapters: 'Networking Evolution, Switching, Transmission Media, Topologies, Devices, Protocols & Web Services',
      marks: 10,
    },
    {
      unit: 'Unit III: Database Management',
      chapters: 'Relational Data Model, DDL & DML SQL, Scalar/Aggregate Functions, GROUP BY/Joins, Python-MySQL Connectivity',
      marks: 20,
    },
  ],
  trustedWebResources: [
    {
      title: 'CBSE Academic Computer Science Syllabus (Code 083)',
      domain: 'cbseacademic.nic.in',
      url: 'https://cbseacademic.nic.in',
      focus: 'Official Theory & 30-Mark Practical Rubric',
      summary: 'Official CBSE Code 083 syllabus, Question Paper Design, and Sample Question Papers.',
    },
    {
      title: 'NCERT Class 12 Computer Science Textbook PDF',
      domain: 'ncert.nic.in',
      url: 'https://ncert.nic.in/textbook.php',
      focus: 'Prescribed Python, Stack, Networks & SQL Chapters',
      summary: 'Complete free official NCERT Computer Science Class XII chapters including solved labs and exercises.',
    },
    {
      title: 'GeeksforGeeks CBSE Class 12 Computer Science Hub',
      domain: 'geeksforgeeks.org',
      url: 'https://www.geeksforgeeks.org/cbse-class-12-computer-science-notes/',
      focus: 'Python File Scripts, Stack Code, SQL Queries & Connectivity',
      summary: 'Step-by-step executable Python programs, binary pickle tutorials, MySQL query examples, and output prediction quizzes.',
    },
    {
      title: 'ePathshala & DIKSHA Computer Science Resources',
      domain: 'epathshala.ncert.gov.in',
      url: 'https://epathshala.ncert.gov.in',
      focus: 'Interactive NCERT Reader & Digital Labs',
      summary: 'National digital portal hosting official Computer Science e-textbooks and practice exercises.',
    },
    {
      title: 'LearnCBSE Class 12 Computer Science Notes & PYQs',
      domain: 'learncbse.in',
      url: 'https://www.learncbse.in/cbse-notes-for-class-12-computer-science/',
      focus: 'Network Case Studies & Board SQL Solutions',
      summary: 'Topic-wise solved board case studies on campus networking, Python output tracing, and MySQL tables.',
    },
  ],
  deletedChapters: [
    {
      title: 'Queue Data Structure (FIFO, Circular Queue, Deque)',
      reason: 'Excluded from current CBSE Class 12 Board Theory exam (only Stack using Python list is assessed).',
    },
    {
      title: 'Recursion & Efficiency Analysis Chapter',
      reason: 'Removed from rationalized CBSE Class 12 CS Code 083 theory.',
    },
    {
      title: 'Django / Python Web Framework',
      reason: 'Not assessed in CBSE Class 12 Computer Science Board paper.',
    },
  ],
  practicals: [
    'Lab Test Part A — Python Program (8 Marks: 60% logic, 20% documentation, 20% code quality): File handling (text/binary/CSV), Menu-driven Stack, or Python-MySQL CRUD script.',
    'Lab Test Part B — SQL Queries (4 Marks): Writing and executing 4 SQL queries using SELECT, GROUP BY, HAVING, Aggregate functions, and Equi-join on two related tables.',
    'Report File (7 Marks): Minimum 15 Python programs (covering functions, file handling, stack, MySQL connectivity) + 5 sets of SQL queries with outputs.',
    'Project Work (8 Marks): Collaborative team application solving a real-world problem (School Library, Hospital, Inventory, Hostel) using Python + File Handling or MySQL.',
    'Viva Voce (3 Marks): Oral conceptual examination covering project logic, Python file/exception concepts, networking, and SQL queries.',
  ],
  chapters: [
    {
      id: 'cs-rev',
      number: 1,
      title: 'Python Revision Tour (Data Types, Control Flow, Strings, Lists, Tuples, Dictionaries & Random)',
      unit: 'Unit I: Computational Thinking and Programming - 2',
      weightageMarks: 6,
      topics: [
        'Mutable vs Immutable Core Data Types (int, str, tuple vs list, dict)',
        'Conditional Flow (if-elif-else), Loops (for/while, break/continue) & Slicing',
        'String, List, Tuple & Dictionary Built-in Methods',
        'Operator Precedence, Type Conversion & Error Identification',
        'random Module Output Prediction (randint, randrange, random)',
      ],
      subtopics: [
        'Negative step slicing [::-1] on strings, tuples, and lists',
        'Dictionary get(), items(), keys(), values(), update(), pop()',
        'Syntax vs Logical vs Runtime errors in "Find and underline corrections" questions',
      ],
      deletedTopics: ['Bitwise operator complex puzzles'],
      definitions: [
        {
          term: 'Mutable vs Immutable Types',
          definition: 'Mutable types (list, dict, set) allow in-place modification keeping same memory id(); immutable types (int, float, bool, str, tuple) create a new object on change.',
        },
        {
          term: 'random.randint(a, b) vs randrange(a, b)',
          definition: 'randint(a, b) includes BOTH endpoints a and b; randrange(a, b) excludes the upper bound b.',
        },
      ],
      concepts: [
        'Reassigning a list slice or appending to a list mutates in-place, whereas string methods like .upper() or .replace() return a new string without mutating the original.',
        'In CBSE output-prediction questions with random.randint(), determine minimum and maximum valid index ranges first to eliminate impossible options.',
      ],
      detailedNotes: [
        'Know exact difference between list.sort() (in-place, returns None) and sorted(iterable) (returns new sorted list).',
        'List aliasing (B = A) shares memory address; slicing (B = A[:]) or A.copy() creates an independent shallow copy.',
        'Tuple with single element requires trailing comma: t = (5,) otherwise Python treats (5) as an integer.',
      ],
      boardExamTips: [
        'Board exam Q1–Q10 features quick 1M and 2M Python Revision Tour MCQs, error correction snippets, and random-output tracing.',
      ],
      formulas: [
        { name: 'Random Bounds', expression: 'randint(1, 3) ∈ {1, 2, 3}; randrange(1, 3) ∈ {1, 2}', units: 'int' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Trace output: s = "ARORA2027"; print(s[1:6:2], s[::-2][:2])',
          solutionSteps: [
            's[1:6:2] picks indices 1, 3, 5 → "R", "R", "2" → "RR2".',
            's[::-2] steps from end backwards by 2: "7", "0", "A", "O", "A" → [:2] gives "70".',
          ],
          finalAnswer: 'RR2 70',
        },
      ],
      exercises: [
        'Write a Python snippet to swap adjacent elements in a list of even length without creating a new list.',
        'Predict min/max values for L = [15, 25, 35, 45]; i = random.randint(1, 2); j = random.randint(2, 3).',
      ],
      learningOutcomes: [
        'Trace complex Python slices, mutability side-effects, dictionary operations, and random outputs accurately',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'All in One'],
    },
    {
      id: 'cs-ch1',
      number: 2,
      title: 'Functions in Python (Arguments, Return Values, LEGB Scope & Modules)',
      unit: 'Unit I: Computational Thinking and Programming - 2',
      weightageMarks: 8,
      topics: [
        'Types of Functions: Built-in, Module Functions (math, random, statistics), User-Defined',
        'Flow of Execution, Parameters vs Arguments & Returning Multiple Values (Tuple)',
        'Positional, Default & Keyword Arguments',
        'Scope of Variables: Local vs Global (LEGB Rule) & global Keyword',
        'Passing Mutable (List/Dict) vs Immutable (Int/String) Objects to Functions',
      ],
      subtopics: [
        'Rule: Default arguments must follow all non-default parameters',
        'Keyword arguments can appear in any order after positional arguments',
        'statistics.mean(), median(), mode() and math.ceil(), floor(), fabs(), sqrt()',
      ],
      deletedTopics: ['Recursive Python functions (removed from Class 12 CS Board syllabus)'],
      definitions: [
        {
          term: 'LEGB Scope Resolution',
          definition: 'Order in which Python resolves variable names: Local → Enclosing → Global → Built-in.',
        },
        {
          term: 'Mutable Parameter Side Effect',
          definition: 'Appending/modifying elements of a list parameter inside a function alters the caller’s list directly unless reassigned locally.',
        },
      ],
      concepts: [
        'Assigning a new value to a global variable inside a function creates a new local variable unless `global varname` is declared at the top of the function.',
        'Default parameter expressions are evaluated only ONCE when `def` executes, not on each function call.',
      ],
      detailedNotes: [
        'A function without an explicit `return` statement implicitly returns `None`.',
        'When a function returns comma-separated values (`return a, b`), Python packs them into a tuple `(a, b)`.',
      ],
      boardExamTips: [
        'Watch carefully for `global x` vs modifying a global list `L.append(5)` (mutating a global list does NOT require `global L`!).',
      ],
      formulas: [
        { name: 'Syntax Order', expression: 'def fn(positional, *args, default=val):', units: 'Python 3' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Predict output: x = 10; def f(x=5): print(x, end=" "); f(); print(x)',
          solutionSteps: [
            'f() called with no args uses default parameter x=5 (local to f), printing 5.',
            'Outer global x remains unchanged at 10.',
          ],
          finalAnswer: '5 10',
        },
      ],
      exercises: [
        'Write a Python function ShiftZeroes(Lst) that moves all zeroes in a list to the end preserving order of non-zero elements.',
      ],
      learningOutcomes: [
        'Write modular Python functions using positional/default/keyword parameters and trace LEGB scope cleanly',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'Together With'],
    },
    {
      id: 'cs-exc',
      number: 3,
      title: 'Exception Handling in Python (Syntax vs Runtime Errors, try-except-else-finally & raise)',
      unit: 'Unit I: Computational Thinking and Programming - 2',
      weightageMarks: 4,
      topics: [
        'Syntax Errors vs Runtime Exceptions vs Logical Errors',
        'Built-in Exceptions (ZeroDivisionError, ValueError, TypeError, IndexError, KeyError, FileNotFoundError, EOFError)',
        'try ... except Multiple Clauses & Generic Handler',
        'try ... except ... else ... finally Execution Flow',
        'Raising Exceptions Explicitly with raise & assert',
      ],
      subtopics: [
        'Why else executes strictly when zero exceptions occur in try',
        'Why finally always executes even after return or uncaught error',
      ],
      deletedTopics: ['Custom Exception Class Inheritance (elementary raise only)'],
      definitions: [
        {
          term: 'finally Block',
          definition: 'Guaranteed cleanup block in try-except that executes unconditionally whether an exception is raised, caught, or absent.',
        },
        {
          term: 'raise Statement',
          definition: 'Explicitly triggers a specified exception (e.g., raise ValueError("Negative marks")) when domain rules fail.',
        },
      ],
      concepts: [
        'Ordered `except` clauses matter: place specific exceptions before a bare/general `except Exception:` clause.',
        'Always pair file or database operations with exception handling or `with` context managers to prevent resource leaks.',
      ],
      detailedNotes: [
        'Flow check: try (no error) → else → finally. Flow check: try (matching error) → except → finally.',
        'Calling int("abc") raises ValueError; accessing missing dict key raises KeyError; dividing by 0 raises ZeroDivisionError.',
      ],
      boardExamTips: [
        'CBSE frequently asks 2-mark output/match questions on the exact order of `try`, `except`, `else`, and `finally`.',
      ],
      formulas: [
        { name: 'Full Clause Order', expression: 'try → except → else → finally', units: 'control flow' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'What does this print? try: a = 10 // 0 except ZeroDivisionError: print("Z") else: print("E") finally: print("F")',
          solutionSteps: [
            '10 // 0 raises ZeroDivisionError → enters except printing "Z".',
            'else is skipped because an exception occurred.',
            'finally executes printing "F".',
          ],
          finalAnswer: 'Z followed by F',
        },
      ],
      exercises: [
        'Write a Python function SafeDivide(a, b) handling ZeroDivisionError and TypeError cleanly with a finally log.',
      ],
      learningOutcomes: [
        'Catch, raise, and trace Python exceptions deterministically using try-except-else-finally',
      ],
      referenceCoverage: ['NCERT', 'Xam Idea', 'Oswaal'],
    },
    {
      id: 'cs-ch2',
      number: 4,
      title: 'File Handling: Text, Binary (pickle) & CSV Files',
      unit: 'Unit I: Computational Thinking and Programming - 2',
      weightageMarks: 14,
      topics: [
        'Text vs Binary vs CSV File Types & Relative/Absolute Paths',
        'Opening/Closing Modes ("r", "w", "a", "r+", "rb", "wb", "ab", "rb+") & with open()',
        'Text File Methods: read(n), readline(), readlines(), write(), writelines(), split()',
        'File Pointer Control: seek(offset, whence) & tell()',
        'Binary Files via pickle.dump() / pickle.load() & EOFError Loops',
        'CSV Files via csv.reader() & csv.writer() (writerow, writerows, delimiter, newline="")',
      ],
      subtopics: [
        'Counting vowels, lines starting with specific letter, word lengths (<4 chars) in text files',
        'Searching, appending, updating, and deleting records in binary .dat files',
        'Skipping CSV header row with next(reader) and preventing blank rows via newline=""',
      ],
      deletedTopics: ['None significant'],
      definitions: [
        {
          term: 'Pickling & Unpickling',
          definition: 'Pickling (pickle.dump) serializes Python objects into byte streams in binary files; unpickling (pickle.load) reconstructs objects back.',
        },
        {
          term: 'seek() & tell()',
          definition: 'tell() returns current byte offset of file pointer; seek(offset, whence) repositions pointer (0=start, 1=current, 2=end).',
        },
      ],
      concepts: [
        'Mode "w" truncates an existing file to zero length or creates a new file; mode "a" appends at end of file; "r" raises FileNotFoundError if missing.',
        'Reading multiple records from a pickle binary file requires `while True:` wrapped in `try: rec = pickle.load(f) ... except EOFError: break`.',
      ],
      detailedNotes: [
        'Always remember text methods return strings (`read()`, `readline()`) or list of lines including `\\n` (`readlines()`).',
        'For Binary Record Update in place (`rb+`): save `pos = f.tell()` BEFORE calling `rec = pickle.load(f)`, then `f.seek(pos)` before `pickle.dump(rec, f)`.',
        'For CSV writing on Windows, pass `open("data.csv", "w", newline="")` so `csv.writer` does not insert blank lines.',
      ],
      boardExamTips: [
        'File handling alone carries 10–14 marks via one 3M Text file question, one 4M Binary/CSV file question, and objective MCQs.',
      ],
      formulas: [
        { name: 'Binary Read Loop', expression: 'while True: try: data = pickle.load(f) ... except EOFError: break', units: 'pattern' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Write a Python function CountMeMy() to count occurrences of words "Me" and "My" in "STORY.TXT".',
          solutionSteps: [
            'with open("STORY.TXT", "r") as f:',
            '    words = f.read().split()',
            '    count = sum(1 for w in words if w in ("Me", "My"))',
            '    print("Count =", count)',
          ],
          finalAnswer: 'Context manager + .read().split() word match',
        },
      ],
      exercises: [
        'Write Python functions AddBook() and SearchBook(author) using pickle on "BOOKS.DAT".',
        'Write Python code to write 5 student rows to "RESULT.CSV" and display records scoring > 90%.',
      ],
      learningOutcomes: [
        'Read, search, filter, and update persistent data across Text, Binary (pickle), and CSV files',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'Xam Idea'],
    },
    {
      id: 'cs-ch3',
      number: 5,
      title: 'Data Structures: Stack Operations (Push, Pop, Underflow & Postfix Evaluation)',
      unit: 'Unit I: Computational Thinking and Programming - 2',
      weightageMarks: 8,
      topics: [
        'Linear Data Structure Concept & Stack LIFO Principle',
        'Python List Implementation: append() as Push & pop() as Pop',
        'Stack Overflow, Stack Underflow & Peek/Display Operations',
        'Applications: Expression Conversion (Infix → Postfix), Postfix Evaluation, Function Call Stack, Undo/Redo',
      ],
      subtopics: [
        'Writing Push_Item(Stk, ...) & Pop_Item(Stk) based on dictionary/list filtering conditions',
        'Tracing stack contents step-by-step during postfix arithmetic',
      ],
      deletedTopics: ['Queue, Circular Queue, Deque (excluded from Class 12 Board theory)'],
      definitions: [
        {
          term: 'LIFO (Last-In, First-Out)',
          definition: 'Linear access discipline where insertion (Push) and deletion (Pop) occur exclusively at one end called TOP.',
        },
        {
          term: 'Stack Underflow',
          definition: 'Condition triggered when attempting to pop from an empty stack (if len(stack) == 0 or not stack).',
        },
      ],
      concepts: [
        'In Python, list method `stack.append(x)` pushes at the right end in O(1) amortized time, and `stack.pop()` removes and returns the last pushed element.',
        'Always check `if len(stack) == 0:` before calling `stack.pop()` in CBSE Board functions to print "Stack Empty / Underflow" cleanly.',
      ],
      detailedNotes: [
        'Operator precedence for Infix-to-Postfix: Parentheses () > Exponentiation ^ > Multiplication/Division *, / > Addition/Subtraction +, -.',
        'During Postfix evaluation: scan left-to-right; push operands onto stack; when operator `op` arrives, pop `op2` (first popped = right operand) and `op1` (second popped = left operand), compute `op1 op op2`, push result.',
      ],
      boardExamTips: [
        'Watch operand order during subtraction and division in postfix evaluation: second-popped MINUS/DIVIDED BY first-popped!',
      ],
      formulas: [
        { name: 'Stack Time Complexity', expression: 'Push: O(1) amortized, Pop: O(1), Peek: O(1)', units: 'Big-O' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Write Push_Even(S, NList) and Pop_Even(S) functions in Python.',
          solutionSteps: [
            'def Push_Even(S, NList):',
            '    for n in NList:',
            '        if n % 2 == 0: S.append(n)',
            'def Pop_Even(S):',
            '    while S: print(S.pop())',
            '    print("Stack Empty")',
          ],
          finalAnswer: 'LIFO Push using append() and Pop loop printing Stack Empty at underflow',
        },
      ],
      exercises: [
        'Evaluate postfix expression: 20 10 - 5 * 15 3 / + using a trace table.',
      ],
      learningOutcomes: [
        'Build conditional Push/Pop/Display Python stack functions and trace postfix evaluation',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'All in One'],
    },
    {
      id: 'cs-ch4',
      number: 6,
      title: 'Computer Networks I: Evolution, Switching & Transmission Media',
      unit: 'Unit II: Computer Networks',
      weightageMarks: 5,
      topics: [
        'Evolution of Networking: ARPANET, NSFNET, Internet & Data Communication Terminologies',
        'Bandwidth (Hz, bps, Mbps, Gbps), Data Transfer Rate & IP Address',
        'Switching Techniques: Circuit Switching vs Packet Switching (Message Switching idea)',
        'Wired Transmission Media: Twisted Pair (UTP/STP), Coaxial Cable, Optical Fibre Cable',
        'Wireless Media: Radio Waves, Microwaves, Infrared Waves & Satellite Communication',
      ],
      subtopics: [
        'Optical fibre immunity to electromagnetic interference (EMI) and high attenuation distance (>100m)',
        'Line-of-sight propagation requirement in Microwaves & Infrared',
      ],
      deletedTopics: ['Detailed cellular 2G/3G/4G/5G architecture schematics'],
      definitions: [
        {
          term: 'Packet Switching',
          definition: 'Message broken into fixed-size packets routed independently across shared network links and reassembled at destination.',
        },
        {
          term: 'Optical Fibre Cable',
          definition: 'Glass/plastic waveguide transmitting data as light pulses using Total Internal Reflection; highest speed and EMI immunity.',
        },
      ],
      concepts: [
        'Circuit switching establishes a dedicated physical end-to-end path before communication (classic telephone call), whereas packet switching shares links dynamically (Internet).',
        'Optical fibre suits long inter-building high-speed backbones (>100m); Cat6 Twisted Pair (Ethernet) suits low-cost short office LANs (<100m).',
      ],
      detailedNotes: [
        'Microwave links require clear line-of-sight between tall towers (~30–50 km), affected by bad weather; Satellite covers hilly/remote oceans/250+ km spans.',
        'Infrared works strictly short-range inside a room (TV remotes) and cannot penetrate walls.',
      ],
      boardExamTips: [
        'Campus networking 5-mark case studies ALWAYS ask which wired medium connects buildings >100m apart (Optical Fibre) and which connects remote hilly HQs (Satellite/Radio link).',
      ],
      formulas: [
        { name: 'Bandwidth Conversion', expression: '1 Gbps = 1000 Mbps = 10⁶ Kbps = 10⁹ bps', units: 'bps' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Which wired medium should connect two campus buildings 450 m apart requiring 10 Gbps EMI-free throughput?',
          solutionSteps: ['Distance exceeds 100 m limit of UTP Ethernet and requires high speed without interference → Optical Fibre Cable.'],
          finalAnswer: 'Optical Fibre Cable',
        },
      ],
      exercises: [
        'Compare Circuit Switching and Packet Switching on two parameters.',
      ],
      learningOutcomes: [
        'Select optimal switching and wired/wireless media for campus and WAN networking scenarios',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Together With', 'Oswaal'],
    },
    {
      id: 'cs-net2',
      number: 7,
      title: 'Computer Networks II: Topologies, Network Devices, Protocols & Web Services',
      unit: 'Unit II: Computer Networks',
      weightageMarks: 5,
      topics: [
        'Network Types: PAN, LAN, MAN, WAN',
        'Topologies: Bus, Star, Tree, Mesh (Pros, Cons & Cable Length Optimization)',
        'Network Devices: Modem, Ethernet Card (NIC), RJ45, Repeater, Hub, Switch, Router, Gateway, Wi-Fi Card',
        'Network Protocols: HTTP, HTTPS, FTP, PPP, SMTP, POP3, TCP/IP, TELNET, VoIP',
        'Web Services: WWW, HTML vs XML, Domain Names (DNS), URL, Web Server, Web Browser, Web Hosting',
      ],
      subtopics: [
        '80-20 Server Placement Rule (place server in building with maximum computers)',
        'Repeater placement wherever cable segment exceeds 70–100 m',
        'Hub (broadcasts to all ports) vs Switch (intelligent MAC-based unicast)',
      ],
      deletedTopics: ['Obsolete mobile protocols like WLL, CDMA technical stacks'],
      definitions: [
        {
          term: 'Gateway',
          definition: 'Network device acting as an entrance/translator connecting two dissimilar networks operating with different protocols.',
        },
        {
          term: 'SMTP vs POP3',
          definition: 'SMTP sends/pushes outgoing email to mail servers; POP3 downloads/retrieves incoming email to a client device.',
        },
      ],
      concepts: [
        'Switch reduces collisions and preserves bandwidth by sending frames only to the target port’s MAC address, unlike a dumb Hub.',
        'HTML defines presentation tags for displaying web pages; XML defines custom self-descriptive tags for storing and transporting structured data.',
      ],
      detailedNotes: [
        'VoIP (Voice over Internet Protocol) enables real-time voice calls over broadband IP networks.',
        'Telnet allows encrypted-less remote login terminal access; FTP transfers large files between client and server.',
      ],
      boardExamTips: [
        'Master the 5 golden rules of the CBSE 5M Network Case Study: (1) Server = max PCs block, (2) Layout = Star from Server or shortest-cable Tree, (3) Switch in every block with >1 PC, (4) Repeater if span > 80–100m, (5) Broadband/Fiber/Satellite for inter-city WAN.',
      ],
      formulas: [],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Distinguish between a Switch and a Router in a school network.',
          solutionSteps: [
            'Switch connects devices within the same LAN using MAC addresses.',
            'Router connects multiple distinct networks and forwards IP packets along optimal paths to the Internet.',
          ],
          finalAnswer: 'Switch operates inside LAN (MAC); Router connects different networks (IP)',
        },
      ],
      exercises: [
        'Design a network layout for 4 blocks (HQ 150 PCs, Lab 60 PCs, Admin 25 PCs, Hostel 10 PCs) answering server, switch, repeater, and video-conferencing protocol.',
      ],
      learningOutcomes: [
        'Architect enterprise campus networks and identify internet/email protocols precisely',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'All in One'],
    },
    {
      id: 'cs-db',
      number: 8,
      title: 'Database Concepts & Relational Data Model (Keys, Degree & Cardinality)',
      unit: 'Unit III: Database Management',
      weightageMarks: 4,
      topics: [
        'Purpose of DBMS over Flat File Systems (Redundancy, Inconsistency, Concurrency)',
        'Relational Data Model: Relation (Table), Tuple (Row), Attribute (Column), Domain',
        'Degree (No. of Attributes) & Cardinality (No. of Tuples)',
        'Relational Keys: Candidate Key, Primary Key, Alternate Key, Foreign Key',
      ],
      subtopics: [
        'Domain integrity and referential integrity via Foreign Key',
        'Effect of Cartesian Product on Degree and Cardinality',
      ],
      deletedTopics: ['Normalisation forms (1NF, 2NF, 3NF) mathematical proofs'],
      definitions: [
        {
          term: 'Candidate, Primary & Alternate Key',
          definition: 'Candidate Keys are minimal attributes uniquely identifying tuples; one chosen as Primary Key (NOT NULL + UNIQUE), remaining Candidate Keys become Alternate Keys.',
        },
        {
          term: 'Foreign Key',
          definition: 'Non-key attribute in a child table whose values reference the Primary Key of a parent table to enforce referential integrity.',
        },
      ],
      concepts: [
        'NULL is NOT zero or empty space—it represents unknown, missing, or inapplicable data.',
        'Alternate Keys count = (Total Candidate Keys) − 1.',
      ],
      detailedNotes: [
        'If Table A has degree 4, cardinality 5 and Table B has degree 3, cardinality 6, then Cartesian Product (A × B) has Degree = 4 + 3 = 7 and Cardinality = 5 × 6 = 30.',
      ],
      boardExamTips: [
        'Never confuse Degree (columns) and Cardinality (rows) — remember "Cardinality = Count of records (rows)".',
      ],
      formulas: [
        { name: 'Cartesian Product Size', expression: 'Degree(A × B) = deg(A) + deg(B); Card(A × B) = card(A) × card(B)', units: 'relations' },
      ],
      derivations: [],
      diagramId: 'logic_gates_sql_schema',
      diagramCaption: 'Interactive Relational Database Schema, Keys & Degree/Cardinality Explorer.',
      solvedExamples: [
        {
          problem: 'Table STUDENT has (AdmNo, AadhaarNo, Email, Name, Class). Identify Primary, Candidate, and Alternate keys.',
          solutionSteps: [
            'Candidate Keys (unique identifiers): {AdmNo, AadhaarNo, Email}.',
            'Choose AdmNo as Primary Key → Alternate Keys are AadhaarNo and Email.',
          ],
          finalAnswer: 'PK: AdmNo; Alternate Keys: AadhaarNo, Email',
        },
      ],
      exercises: [
        'A table has 6 columns and 12 rows. Two columns are dropped and 3 rows added. Find updated Degree and Cardinality.',
      ],
      learningOutcomes: [
        'Design normalized relational tables with proper Primary and Foreign keys',
      ],
      referenceCoverage: ['NCERT', 'Oswaal', 'Xam Idea'],
    },
    {
      id: 'cs-ch5',
      number: 9,
      title: 'Structured Query Language (DDL, DML, Scalar/Aggregate Functions, GROUP BY & Joins)',
      unit: 'Unit III: Database Management',
      weightageMarks: 12,
      topics: [
        'DDL: CREATE DATABASE, USE, CREATE TABLE, ALTER TABLE (ADD/MODIFY/DROP), DROP TABLE',
        'DML: INSERT INTO, SELECT, UPDATE ... SET ... WHERE, DELETE FROM',
        'Clauses & Operators: DISTINCT, BETWEEN, IN, LIKE (% and _), IS NULL, ORDER BY',
        'SQL Math/Text/Date Functions (POWER, ROUND, MOD, UPPER, LOWER, MID/SUBSTR, LENGTH, LEFT, RIGHT, TRIM, NOW, YEAR, MONTH, DAYNAME)',
        'Aggregate Functions (SUM, AVG, MIN, MAX, COUNT(*) vs COUNT(col)) & GROUP BY / HAVING',
        'SQL Joins: Cartesian Product, Equi-Join & Natural Join',
      ],
      subtopics: [
        'Critical distinction: WHERE filters rows BEFORE grouping; HAVING filters groups AFTER GROUP BY',
        'COUNT(*) includes NULL rows; COUNT(col) skips NULL values',
      ],
      deletedTopics: ['PL/SQL Triggers, Stored Procedures, Cursors inside MySQL'],
      definitions: [
        {
          term: 'Equi-Join vs Natural Join',
          definition: 'Equi-join combines rows using an equality condition (WHERE A.id = B.id) keeping duplicate join columns; Natural join eliminates duplicate common columns automatically.',
        },
      ],
      concepts: [
        'Use `IS NULL` or `IS NOT NULL` in SQL — writing `= NULL` never matches anything because NULL compares unknown.',
        'Single-row scalar functions return one result per row; aggregate functions collapse a group of rows into a single summary value.',
      ],
      detailedNotes: [
        'ROUND(15.678, 1) → 15.7; MOD(17, 5) → 2; INSTR("INFORMATICS", "FOR") → 3 (1-based indexing in MySQL!).',
        'MID("COMPUTERS", 4, 3) extracts 3 chars starting at 1-based position 4 → "PUT".',
      ],
      boardExamTips: [
        'Double-check MySQL 1-based indexing in SUBSTR/MID/INSTR output questions — students lose easy marks assuming 0-based Python indexing!',
      ],
      formulas: [
        { name: 'SQL Query Sequence', expression: 'SELECT cols FROM tbl WHERE row_cond GROUP BY col HAVING grp_cond ORDER BY col', units: 'SQL syntax' },
      ],
      derivations: [],
      diagramId: 'logic_gates_sql_schema',
      diagramCaption: 'Interactive SQL Joins, GROUP BY & Aggregate Query Explorer.',
      solvedExamples: [
        {
          problem: 'Display department and average salary for departments having > 3 staff earning at least 30000.',
          solutionSteps: [
            'SELECT Dept, AVG(Salary) FROM Staff WHERE Salary >= 30000 GROUP BY Dept HAVING COUNT(*) > 3;',
          ],
          finalAnswer: 'SELECT Dept, AVG(Salary) FROM Staff WHERE Salary >= 30000 GROUP BY Dept HAVING COUNT(*) > 3;',
        },
      ],
      exercises: [
        'Write SQL join query to display OrderID, CustomerName, and City across CUSTOMERS and ORDERS linked by CustID.',
      ],
      learningOutcomes: [
        'Author error-free DDL, DML, aggregate grouping, and multi-table JOIN queries in MySQL',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Oswaal', 'All in One'],
    },
    {
      id: 'cs-pydb',
      number: 10,
      title: 'Interface Python with MySQL (mysql.connector, Cursor Execution & CRUD Queries)',
      unit: 'Unit III: Database Management',
      weightageMarks: 4,
      topics: [
        'Connecting Python to MySQL via mysql.connector.connect(host, user, password, database)',
        'Checking Connection (is_connected()) & Creating Cursor Object (con.cursor())',
        'Executing Queries (cur.execute()) & Parameterized Queries (%s placeholders)',
        'Fetching Result Sets: fetchone(), fetchmany(n), fetchall(), cur.rowcount',
        'Committing Transactions (con.commit()) for INSERT, UPDATE, DELETE & Closing cleanly',
      ],
      subtopics: [
        'Why con.commit() is mandatory for DML changes (INSERT/UPDATE/DELETE) but optional for SELECT',
        'Iterating fetchall() tuple lists in Python',
      ],
      deletedTopics: ['ORM frameworks (SQLAlchemy/Django ORM)'],
      definitions: [
        {
          term: 'Cursor Object',
          definition: 'Database control structure created via `con.cursor()` that executes SQL statements and traverses retrieved result rows.',
        },
        {
          term: 'con.commit()',
          definition: 'Persists pending INSERT, UPDATE, or DELETE transactions permanently into the MySQL database.',
        },
      ],
      concepts: [
        'Each row returned by `fetchone()` or inside `fetchall()` is a Python tuple containing column values in SELECT order.',
        'Always call `cur.close()` and `con.close()` inside a `finally` block or at end of script.',
      ],
      detailedNotes: [
        'Standard template: import mysql.connector as mc; con = mc.connect(host="localhost", user="root", passwd="...", database="school"); cur = con.cursor().',
        '`cur.rowcount` returns the count of rows fetched or affected by the last executed SQL operation.',
      ],
      boardExamTips: [
        'CBSE fill-in-the-blank 3M/4M connectivity questions test exact method names: `connect()`, `cursor()`, `execute()`, `fetchall()`, and `commit()`.',
      ],
      formulas: [
        { name: 'Connectivity Lifecycle', expression: 'connect() → cursor() → execute() → fetchall()/commit() → close()', units: 'DB-API' },
      ],
      derivations: [],
      solvedExamples: [
        {
          problem: 'Write Python code using mysql.connector to increase price by 10% for Electronics items in STOCK table.',
          solutionSteps: [
            'import mysql.connector as mc',
            'con = mc.connect(host="localhost", user="root", password="pwd", database="store")',
            'cur = con.cursor()',
            'cur.execute("UPDATE STOCK SET Price = Price * 1.10 WHERE Category = \'Electronics\'")',
            'con.commit()',
            'con.close()',
          ],
          finalAnswer: 'Executes UPDATE query and persists change via con.commit()',
        },
      ],
      exercises: [
        'Write a Python-MySQL script to accept a RollNo and display that student’s record or "Not Found".',
      ],
      learningOutcomes: [
        'Connect Python scripts cleanly to MySQL databases to run parameterized queries and commit updates',
      ],
      referenceCoverage: ['NCERT', 'CBSE Official', 'Together With', 'Xam Idea'],
    },
  ],
};
