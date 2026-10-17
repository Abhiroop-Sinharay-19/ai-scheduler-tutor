import type { AlgorithmId } from "./scheduling.ts";

export interface AlgorithmInfo {
  id: AlgorithmId;
  name: string;
  tagline: string;
  type: "Preemptive" | "Non-preemptive" | "Both";
  complexity: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  overview: string;
  howItWorks: string[];
  advantages: string[];
  disadvantages: string[];
  examQuestions: string[];
  aiExplanation: string;
}

export const algorithms: AlgorithmInfo[] = [
  {
    id: "fcfs",
    name: "FCFS",
    tagline: "First Come First Serve — processes run in arrival order.",
    type: "Non-preemptive",
    complexity: "O(n log n)",
    difficulty: "Beginner",
    overview:
      "First Come First Serve is the simplest scheduling policy: the process that requests the CPU first gets it first. It is implemented with a plain FIFO queue and never preempts a running process.",
    howItWorks: [
      "Processes are inserted into a FIFO ready queue as they arrive.",
      "The CPU picks the head of the queue and runs it to completion.",
      "Newly arrived processes always wait behind existing ones.",
      "Waiting time depends heavily on arrival order — long jobs first hurt everyone.",
    ],
    advantages: ["Trivial to implement", "No starvation", "Low scheduling overhead"],
    disadvantages: [
      "Convoy effect: one long burst delays every short job",
      "High average waiting time",
      "Poor for interactive systems",
    ],
    examQuestions: [
      "Compute average waiting time for FCFS with the given arrival/burst table.",
      "Explain the convoy effect with an example.",
      "Why is FCFS unsuitable for time-sharing systems?",
    ],
    aiExplanation:
      "Think of a single supermarket till: whoever queues first is served first, so a customer with a full trolley blocks everyone behind them. That blocking is exactly the convoy effect.",
  },
  {
    id: "sjf",
    name: "SJF",
    tagline: "Shortest Job First — pick the smallest burst among arrivals.",
    type: "Non-preemptive",
    complexity: "O(n log n)",
    difficulty: "Intermediate",
    overview:
      "Shortest Job First selects the ready process with the smallest CPU burst. It is provably optimal for minimising average waiting time among non-preemptive policies, but it needs burst-length knowledge.",
    howItWorks: [
      "When the CPU is free, look at every process that has already arrived.",
      "Choose the one with the smallest burst time (ties broken by arrival).",
      "Run it to completion — no preemption happens mid-burst.",
      "Repeat until every process is complete.",
    ],
    advantages: [
      "Minimum average waiting time for non-preemptive scheduling",
      "Great throughput for short jobs",
    ],
    disadvantages: [
      "Requires knowing/estimating burst length",
      "Long jobs can starve",
      "Not suitable for interactive workloads without prediction",
    ],
    examQuestions: [
      "Prove SJF minimises average waiting time.",
      "Estimate the next CPU burst with exponential averaging.",
      "Compare SJF and FCFS on the same process set.",
    ],
    aiExplanation:
      "Sorting jobs shortest-first pulls every small waiting time forward and pushes one large one to the end, which lowers the average — that's the exchange argument behind SJF's optimality.",
  },
  {
    id: "srtf",
    name: "SRTF",
    tagline: "Shortest Remaining Time First — preemptive SJF.",
    type: "Preemptive",
    complexity: "O(n log n)",
    difficulty: "Advanced",
    overview:
      "SRTF is the preemptive version of SJF. At every arrival the scheduler compares the new process's burst with the remaining time of the running process and switches if the newcomer is shorter.",
    howItWorks: [
      "Maintain remaining time for every ready process.",
      "On each arrival (or time unit) select the minimum remaining time.",
      "If a newly arrived process is shorter, preempt the running one.",
      "The preempted process re-enters the ready set with its remaining time.",
    ],
    advantages: ["Lowest average waiting time of all algorithms", "Very responsive to short jobs"],
    disadvantages: [
      "Frequent context switches",
      "Starvation of long processes",
      "Needs continuous burst estimation",
    ],
    examQuestions: [
      "Draw the Gantt chart for SRTF and mark every preemption point.",
      "Why does SRTF beat SJF on average waiting time?",
      "How many context switches occur in the given SRTF schedule?",
    ],
    aiExplanation:
      "SRTF is a triage nurse: every time someone new walks in, they re-evaluate who needs the least work to finish and hand the CPU to them, even mid-treatment.",
  },
  {
    id: "rr",
    name: "Round Robin",
    tagline: "Fixed time quantum, cyclic ready queue.",
    type: "Preemptive",
    complexity: "O(1) per switch",
    difficulty: "Intermediate",
    overview:
      "Round Robin gives each process a fixed time quantum. When the quantum expires the process is preempted and moved to the tail of the ready queue, producing fair, predictable response times.",
    howItWorks: [
      "Ready queue is circular (FIFO with re-entry).",
      "Head of queue runs for min(quantum, remaining).",
      "If work remains, the process goes to the back of the queue.",
      "Smaller quantum = better response, more context-switch overhead.",
    ],
    advantages: ["Fair CPU sharing", "No starvation", "Great for time-sharing systems"],
    disadvantages: [
      "Higher average turnaround time",
      "Performance is very sensitive to quantum size",
      "Context-switch overhead",
    ],
    examQuestions: [
      "For quantum = 2, compute average turnaround time.",
      "What happens as the quantum approaches infinity? And zero?",
      "Compare Round Robin response time against FCFS.",
    ],
    aiExplanation:
      "Round Robin is a study group where everyone gets exactly five minutes of the tutor's time before passing the tutor along — nobody waits forever, but nobody finishes quickly either.",
  },
  {
    id: "priority",
    name: "Priority Scheduling",
    tagline: "Highest-priority ready process wins the CPU.",
    type: "Both",
    complexity: "O(log n) with heap",
    difficulty: "Intermediate",
    overview:
      "Each process carries a priority number (lower value = higher priority here). The scheduler always selects the highest-priority ready process; the preemptive variant switches when a better process arrives.",
    howItWorks: [
      "Keep the ready set in a priority queue.",
      "Select the smallest priority value among ready processes.",
      "Preemptive variant re-checks on every arrival.",
      "Aging gradually raises the priority of waiting processes to avoid starvation.",
    ],
    advantages: ["Supports real-time and system-critical work", "Flexible policy control"],
    disadvantages: [
      "Indefinite blocking / starvation of low priority jobs",
      "Priority inversion",
      "Needs aging to stay fair",
    ],
    examQuestions: [
      "Explain starvation and how aging solves it.",
      "Describe priority inversion and the priority-inheritance fix.",
      "Solve the preemptive priority Gantt chart for the table below.",
    ],
    aiExplanation:
      "Priority scheduling is an emergency room: critical patients jump the queue. Without aging, a patient with a mild complaint may never be seen at all — that's starvation.",
  },
];

export interface QuizQuestion {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  answerIndex?: number;
  explanation?: string;
}

export interface Resource {
  id: string;
  title: string;
  category: string;
  description: string;
  minutes: number;
  type: string;
}

export interface QuizCategory {
  id: string;
  label: string;
  questions: number;
  completed: number;
  progress: number;
}

export const resources: Resource[] = [
  {
    id: "r1",
    title: "Process states & PCB anatomy",
    category: "OS Notes",
    description:
      "New, ready, running, waiting, terminated — plus what the kernel stores per process.",
    minutes: 12,
    type: "Notes",
  },
  {
    id: "r2",
    title: "Scheduling criteria cheat sheet",
    category: "Process Scheduling",
    description: "Utilisation, throughput, turnaround, waiting and response time in one page.",
    minutes: 5,
    type: "Cheat sheet",
  },
  {
    id: "r3",
    title: "Gantt chart construction walkthrough",
    category: "Examples",
    description: "Build FCFS, SJF and SRTF charts step by step from one process table.",
    minutes: 18,
    type: "Worked example",
  },
  {
    id: "r4",
    title: "Round Robin quantum tuning",
    category: "Algorithms",
    description: "How quantum size trades response time against context-switch overhead.",
    minutes: 10,
    type: "Notes",
  },
  {
    id: "r5",
    title: "Preemptive vs non-preemptive",
    category: "Process Scheduling",
    description: "Decision points, dispatcher latency and when each policy is used.",
    minutes: 8,
    type: "Notes",
  },
  {
    id: "r6",
    title: "50 solved scheduling numericals",
    category: "Exam Preparation",
    description: "Exam-style numericals with full metric tables and marking notes.",
    minutes: 45,
    type: "Problem set",
  },
  {
    id: "r7",
    title: "Starvation, aging & priority inversion",
    category: "Algorithms",
    description: "The three classic priority-scheduling pitfalls with real-world cases.",
    minutes: 14,
    type: "Notes",
  },
  {
    id: "r8",
    title: "Multilevel feedback queues",
    category: "Algorithms",
    description: "How real kernels combine RR and priority into tiered queues.",
    minutes: 16,
    type: "Video",
  },
  {
    id: "r9",
    title: "Previous-year question bank",
    category: "Exam Preparation",
    description: "Frequently repeated university questions grouped by algorithm.",
    minutes: 30,
    type: "Problem set",
  },
];
