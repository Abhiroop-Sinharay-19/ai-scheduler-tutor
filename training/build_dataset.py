"""Build source-grounded tutoring SFT data with fixed train/validation/eval splits.

The authored lesson cards below paraphrase the course slides; the slides themselves
are never copied into the dataset. Run with Python 3.11+: python training/build_dataset.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent / "data"
NOTES = Path("SUMSEM2025-26_VL_BCSE303L_00100_TH_2026-06-01_Module-3---Process-Scheduling.pptx")

# Citation locations refer to slide numbers in the course scheduling presentation.
CARDS = [
    {"topic":"FCFS", "fact":"First-Come, First-Served runs ready processes in arrival order and is non-preemptive: once selected, a process keeps the CPU until it finishes or blocks.", "mis":"FCFS always minimizes average waiting time.", "hint":"Imagine a long CPU burst at the front of the ready queue. What happens to the short jobs behind it?", "probe":"What information determines the order in FCFS?", "link":"This is the baseline we can compare with SJF, which uses the next CPU-burst length instead.", "page":10},
    {"topic":"SJF", "fact":"Shortest Job First selects the ready process with the shortest next CPU burst. For a given set of processes, it gives the minimum average waiting time; the next burst must be estimated.", "mis":"SJF picks the process that arrived most recently.", "hint":"Look at the word 'shortest' in the name: shortest according to which process property?", "probe":"Why can a short burst ahead of a long one lower average waiting time?", "link":"Compared with FCFS, SJF uses burst length rather than arrival order alone.", "page":16},
    {"topic":"SRTF", "fact":"Shortest Remaining Time First is the preemptive version of SJF. When a process arrives, the scheduler can compare its burst with the running process's remaining time and preempt if the new remaining time is shorter.", "mis":"SRTF is non-preemptive because it is just SJF.", "hint":"When a new process arrives, does the running process always keep the CPU under SRTF?", "probe":"What value is compared at a scheduling decision: original burst or remaining time?", "link":"This is the preemptive counterpart to the non-preemptive SJF rule.", "page":19},
    {"topic":"Round Robin", "fact":"Round Robin gives each ready process up to a fixed time quantum. An unfinished process goes to the back of the ready queue when its quantum expires.", "mis":"When a quantum expires, the process is terminated.", "hint":"Separate 'its turn ended' from 'its CPU burst ended.' What happens if work remains?", "probe":"Where does an unfinished process go after its quantum expires?", "link":"The quantum controls the trade-off between response and context-switch overhead.", "page":22},
    {"topic":"Time quantum", "fact":"In Round Robin, a large quantum makes behavior approach FCFS; a very small quantum raises context-switch overhead. The quantum should be large relative to context-switch time.", "mis":"A smaller time quantum always makes Round Robin faster overall.", "hint":"A tiny turn means the CPU changes processes more often. Does every switch do useful process work?", "probe":"What trade-off changes when the quantum becomes very small?", "link":"This is why Round Robin's responsiveness depends on the chosen quantum.", "page":22},
    {"topic":"Priority Scheduling", "fact":"Priority Scheduling selects the highest-priority ready process; in the course convention, a smaller integer means higher priority. It can be preemptive or non-preemptive.", "mis":"A larger priority number always means higher priority.", "hint":"Use the convention in these notes: compare a small value such as 1 with a larger value such as 5.", "probe":"Under this course convention, which integer represents higher priority?", "link":"Priority uses a ranking value, while SJF can be viewed as priority based on predicted burst length.", "page":26},
    {"topic":"Preemption", "fact":"A non-preemptive scheduler makes a choice when a process terminates or blocks, and the selected process keeps the CPU until then. A preemptive scheduler can take the CPU away while that process is still runnable.", "mis":"Preemption means a process has completed its CPU burst.", "hint":"Can the running process still have remaining work when it loses the CPU?", "probe":"What must be true for a scheduler to be preemptive?", "link":"SRTF and Round Robin illustrate different reasons to preempt a still-running process.", "page":5},
    {"topic":"Arrival time", "fact":"Arrival time marks when a process enters the system and becomes eligible to wait for the CPU; a scheduler can choose only among processes that have arrived and are ready.", "mis":"A process can be selected before it has arrived if its burst is shortest.", "hint":"At a given time, first ask whether each process is in the ready queue yet.", "probe":"Can SJF select a short-burst process that has not arrived? Why?", "link":"Arrival order matters directly to FCFS and determines which jobs are candidates for SJF.", "page":10},
    {"topic":"CPU burst", "fact":"A CPU burst is the time a process needs on the CPU for that burst. SJF uses the next CPU-burst length, which must be estimated.", "mis":"SJF knows every process's future CPU burst exactly in advance.", "hint":"The course notes describe the next burst as estimated. What does that imply about certainty?", "probe":"Which scheduling policy uses the next CPU-burst estimate to choose a process?", "link":"A burst is different from waiting time: one is CPU work, the other time in the ready queue.", "page":16},
    {"topic":"Turnaround time", "fact":"Turnaround time is completion time minus arrival time: the total elapsed time from entering the system until completion.", "mis":"Turnaround time is only the time spent waiting in the ready queue.", "hint":"The elapsed interval includes both CPU service and time waiting. Which endpoint starts the interval?", "probe":"Which two timestamps define turnaround time?", "link":"Waiting time is one component of the total elapsed turnaround interval.", "page":8},
    {"topic":"Waiting time", "fact":"Waiting time is the total time a process spends in the ready queue, not the time it spends executing on the CPU.", "mis":"Waiting time includes the process's CPU burst.", "hint":"Separate time waiting to be selected from time actually running.", "probe":"If a process has not yet received CPU service, where is its waiting time accumulating?", "link":"Turnaround includes both ready-queue waiting and CPU service.", "page":8},
    {"topic":"Response time", "fact":"Response time measures the time from a process's arrival until it first gets the CPU/produces its first response; it is not the total time until completion.", "mis":"Response time and turnaround time both end only when the process completes.", "hint":"Think about the first time the process gets attention, not the last event in its life.", "probe":"Does response time end at first service or at completion?", "link":"Response and turnaround describe different endpoints even when both start at arrival.", "page":8},
    {"topic":"Completion time", "fact":"Completion time is the time instant when a process finishes. Turnaround is completion time minus arrival time.", "mis":"Completion time is the length of the process's CPU burst.", "hint":"One is a clock-time endpoint; the other is an amount of CPU work. Which is which?", "probe":"How do completion time and turnaround time relate?", "link":"Once completion is known, turnaround follows by measuring from arrival.", "page":8},
    {"topic":"Gantt chart", "fact":"A scheduling Gantt chart shows which process occupies the CPU over successive time intervals; the interval boundaries let us read execution order and timing.", "mis":"A Gantt chart only lists process priorities.", "hint":"Read the horizontal time intervals: what is running during each one?", "probe":"What can you read from an interval labeled with a process name?", "link":"From the timeline we can derive completion instants and then turnaround and waiting times.", "page":19},
    {"topic":"Context switching", "fact":"A context switch changes which process is running. Very small Round Robin quanta can increase the overhead from these switches.", "mis":"A context switch is CPU work that advances the current process's burst.", "hint":"During a switch, is the process executing useful instructions for its own burst?", "probe":"Why can a very small Round Robin quantum increase overhead?", "link":"This overhead is one reason the quantum should not be made arbitrarily small.", "page":22},
    {"topic":"Starvation", "fact":"Priority scheduling can cause starvation: a low-priority process may wait indefinitely while higher-priority processes keep being selected.", "mis":"Starvation means a process has completed and left the system.", "hint":"The process is still waiting. What might keep winning the CPU selection?", "probe":"Which kind of process is at risk of starvation in priority scheduling?", "link":"Aging is one remedy: it changes a waiting process's priority over time.", "page":26},
    {"topic":"Aging", "fact":"Aging addresses starvation by gradually increasing the priority of a process that has waited for a long time.", "mis":"Aging reduces the priority of a process the longer it waits.", "hint":"The goal is to help a waiting process eventually be selected. Which direction should its priority move?", "probe":"How does aging reduce the risk of starvation?", "link":"Aging changes scheduling priority over time to complement priority scheduling.", "page":26},
    {"topic":"Priority ties", "fact":"When processes have equal priority, the course notes use FCFS or Round Robin as a tie-breaking policy.", "mis":"Equal priority means one of the processes must be discarded.", "hint":"A tie needs a second ordering rule, not removal. Which policies from the notes can break it?", "probe":"Name a course-supported way to break a priority tie.", "link":"A scheduling policy can combine a primary priority rule with a secondary queue rule.", "page":28},
    {"topic":"Multilevel queue", "fact":"A multilevel queue scheduling setup partitions the ready queue into multiple queues; jobs are assigned to a queue and scheduling operates across those queues.", "mis":"Every process in a multilevel queue must move between queues as it runs.", "hint":"Distinguish fixed queue membership from movement between queues.", "probe":"What does the word 'multilevel' describe in this policy?", "link":"Multilevel feedback queues add movement between queues, unlike fixed queue assignment.", "page":32},
    {"topic":"Multilevel feedback queue", "fact":"A multilevel feedback queue allows processes to move between queues. The course example uses decreasing priority/longer quanta for lower queues and can demote a job after it uses its quantum.", "mis":"Feedback queues never move processes after they enter a queue.", "hint":"Compare 'feedback' with fixed queue membership: what can the scheduler change?", "probe":"What can happen to a job after it uses its queue's quantum?", "link":"This extends multilevel queues with movement that can respond to process behavior.", "page":37},
    {"topic":"Convoy effect", "fact":"In FCFS, short processes can wait behind a long CPU-bound process at the front of the queue. Changing the arrival order can lower average waiting time; this pattern is called the convoy effect.", "mis":"The convoy effect means a short process blocks a long process from arriving.", "hint":"Picture a long job already running while several short jobs are ready behind it.", "probe":"Which jobs are delayed when a long CPU-bound job is at the front of FCFS?", "link":"This helps explain why arrival order alone can produce worse average waiting than SJF for a given process set.", "page":15},
    {"topic":"Scheduling criteria", "fact":"Scheduling criteria include CPU utilization, throughput, turnaround time, waiting time, and response time. Utilization and throughput are maximized; the time measures are minimized.", "mis":"Every scheduling criterion should be minimized, including throughput.", "hint":"Separate the measures of useful CPU activity/completions from the measures of delay.", "probe":"Which criteria are goals to maximize, and which time criteria are minimized?", "link":"Different algorithms trade off these goals, so compare the metric that matters for the workload.", "page":8},
]

VARIANTS = [
    ("Before we begin, what do you think {topic} decides?", "beginner"),
    ("I know a little about scheduling. Help me reason through {topic}.", "intermediate"),
    ("Can we connect {topic} to another scheduling rule and discuss its trade-off?", "advanced"),
    ("Explain {topic} briefly, then test whether I can apply it.", "beginner"),
    ("I may be mixing up {topic} with another metric or policy.", "intermediate"),
    ("I remember a few rules, but I am uncertain about {topic}.", "beginner"),
    ("Could you test my reasoning about {topic} with a comparison?", "advanced"),
]
STUDENT_RETRY = [
    "Maybe I should compare the processes that are ready at that time.",
    "I see the difference now; I was treating the two quantities as the same.",
    "So it depends on the policy's selection rule, not just the process name.",
    "The hint helps. I can explain the rule in my own words now.",
    "I still need one more clue before I can say it confidently.",
    "Let me use the clue: I should focus on what is ready and what the rule compares.",
    "I had the right idea about timing, but mixed up which event matters.",
]
STUDENT_OWN_WORDS = [
    "I can describe the rule without repeating your sentence.",
    "I would teach it to a classmate by starting with the selection rule.",
    "Let me explain it in my own words, using the idea of eligible processes.",
    "The deciding factor is clearer now; I can restate it simply.",
    "I can connect the rule to what the scheduler observes.",
    "I think I can state the difference without relying on the name.",
    "I can explain the choice and why another policy might choose differently.",
]

def teacher_rules(level: str) -> str:
    return ("Teach process scheduling as a patient tutor. Use only the supplied course fact for factual claims. "
            "Keep the turn concise, diagnose reasoning rather than judging the student, and ask at most one useful question. "
            "When a first answer is wrong, do not give away the answer: give a small conceptual hint and ask for one retry. "
            "If the student still struggles, increase the hint gradually and then explain plainly. Connect to earlier lesson context only when it helps. "
            "For numerical calculations, defer to the deterministic schedule result included in context; never recalculate it. "
            f"Adapt to a {level} learner: simplify when uncertain, deepen reasoning when mastery is shown.")

def render_episode(card: dict, index: int, split: str) -> list[dict]:
    opening, level = VARIANTS[index % len(VARIANTS)]
    style = index // len(CARDS)
    misconception = card["mis"]
    retry = STUDENT_RETRY[index % len(STUDENT_RETRY)]
    if index % 4 == 0:
        wrong = f"{misconception}"
    elif index % 4 == 1:
        wrong = f"I was under the impression that {misconception[0].lower() + misconception[1:]} Is that right?"
    elif index % 4 == 2:
        wrong = f"I might say, '{misconception}' Does that reasoning work?"
    else:
        wrong = "My current theory is that " + misconception[0].lower() + misconception[1:] + " I am basing that on the term."
    source = f"{NOTES.name}, slide {card['page']}"
    system = teacher_rules(level) + f"\n\nCourse note: {card['fact']}\nSource: {source}\nEarlier lesson: the student has not yet demonstrated mastery of {card['topic']}."
    own_words = [
        f"In my own words, {card['topic']} is about the rule you just described. I think I understand it better now.",
        f"I would teach {card['topic']} by saying: use the stated scheduling rule, then check which process is eligible.",
        f"Let me restate {card['topic']}: the scheduler follows its selection rule, and I should distinguish that from the other policies.",
        f"{STUDENT_OWN_WORDS[style % 7]} For {card['topic']}, I should focus on the policy's decision, not just its name.",
        f"{STUDENT_OWN_WORDS[style % 7]} The course description gives me the rule I need to apply.",
        f"{STUDENT_OWN_WORDS[style % 7]} I can now contrast this with the earlier scheduling idea.",
        f"{STUDENT_OWN_WORDS[style % 7]} I will reason from the eligible processes before answering.",
    ][style]
    recall_answer = [
        f"It asks: {card['probe']} I would answer using the rule, but I want to compare it with what we learned earlier.",
        f"My recall is that I should apply the policy's selection rule. How does that connect to the earlier idea?",
        f"I would start from the candidate processes and then use the rule. Can I check the contrast with the previous policy?",
        f"I will retrieve the selection rule first. How does that build on the idea we learned before?",
        f"I can answer by naming what the policy uses to choose. What was that deciding detail again?",
        f"I think the key is to compare the scheduler's choices. Which earlier idea should I connect this to?",
        f"I would use the rule rather than guess from the name. Can you help me check my recall of the earlier topic?",
    ][style]
    turns = [
        (f"{opening.format(topic=card['topic'])}",
         [f"{card['fact']} Let's make sure the key distinction sticks: {card['probe']}",
          f"Start with this course rule: {card['fact']} Your first retrieval check is: {card['probe']}",
          f"Here is the core idea in one step: {card['fact']} What would you use to decide: {card['probe']}",
          f"Let's build from the source: {card['fact']} Which part of that rule would you apply first: {card['probe']}",
          f"One course-backed distinction to start: {card['fact']} Can you retrieve the deciding factor: {card['probe']}",
          f"Keep this first idea small: {card['fact']} Now try this focused check: {card['probe']}",
          f"The relevant course rule is: {card['fact']} Apply it with one short response: {card['probe']}"][style]),
        (wrong,
         [f"That's a common mix-up; let's use a clue instead of jumping to the answer. {card['hint']} Try once more: {card['probe']}",
          f"You're close to an important distinction. I won't give the answer yet: {card['hint']} Give it another try: {card['probe']}",
          f"Let's reason it through together. Notice this clue: {card['hint']} What does that suggest for {card['topic']}?",
          f"That is a plausible guess, but let's test it. {card['hint']} What would you revise in your answer?",
          f"We'll take this one step at a time. {card['hint']} Try applying the clue to the process that is waiting.",
          f"No problem; this distinction takes practice. {card['hint']} What does the clue rule out?",
          f"Let's pause before revealing the rule. {card['hint']} Which part of your guess should we check first?"][style]),
        (retry,
         [f"You're starting to separate the ideas. {card['fact']} Now put the rule in your own words: how would you explain {card['topic']} to a classmate?",
          f"That is a more useful way to reason about it. To make the distinction precise: {card['fact']} How would you explain the rule without repeating my wording?",
          f"Good use of the clue. The course rule is: {card['fact']} Can you now teach that idea back in your own words?",
          f"You're narrowing it down. To keep it precise: {card['fact']} How would you explain that without my wording?",
          f"That retry is closer. Here is the exact note-supported rule: {card['fact']} Can you give a one-sentence explanation?",
          f"You used the clue well. {card['fact']} Try explaining what the scheduler does in your own words.",
          f"Now we can make the idea precise: {card['fact']} What example would show this rule to a classmate?",
          f"You're reasoning from the right distinction. {card['fact']} How would you teach the deciding factor to someone new?"][style]),
        (own_words,
         [f"Good self-explanation: you are focusing on the decision rule. {card['link']} Before we move on, answer this recall check: {card['probe']}",
          f"Your explanation separates the selection rule from the process itself. {card['link']} Try retrieving this next: {card['probe']}",
          f"You have restated the idea rather than memorizing a phrase. {card['link']} One short recall check before we extend it: {card['probe']}",
          f"That explanation uses the idea, not just its label. {card['link']} Can you retrieve this detail: {card['probe']}",
          f"Nice: you made the rule your own. {card['link']} Let's retrieve one key point before going further: {card['probe']}",
          f"Your wording shows the core decision. {card['link']} Now recall the specific course detail: {card['probe']}",
          f"You connected the rule to how a scheduler chooses. {card['link']} Test that memory with: {card['probe']}"][style]),
        (recall_answer,
         [f"Exactly the right way to retrieve it: start from the decision rule, then compare it with the earlier idea. {card['link']} Keep the note's distinction in mind: {card['fact']}",
          f"That is a useful retrieval strategy. {card['link']} The course material's key statement is: {card['fact']}",
          f"You are connecting the new rule to prior material instead of treating it in isolation. {card['link']} The source-backed rule is: {card['fact']}",
          f"That comparison helps retrieve the idea. {card['link']} Check the course statement once more: {card['fact']}",
          f"Good recall. {card['link']} The precise note-supported distinction to carry forward is: {card['fact']}",
          f"You tied this to earlier learning. {card['link']} Summarize the source-backed rule as: {card['fact']}",
          f"That is a useful connection to keep. {card['link']} Here is the course fact we grounded it in: {card['fact']}"][style]),
    ]
    messages = [{"role":"system", "content":system}]
    rows = []
    for turn, (student, target) in enumerate(turns, start=1):
        messages.append({"role":"user", "content":student})
        rows.append({
            "id":f"{split}-{index:03d}-t{turn}",
            "split":split,
            "topic":card["topic"],
            "skill":["progressive_explanation","misconception_hint","graduated_support","self_explanation","active_and_cumulative_recall"][turn-1],
            "difficulty":level,
            "source":{"filename":NOTES.name,"page":card["page"]},
            "messages":[*messages],
            "training_messages":[*messages,{"role":"assistant","content":target}],
            "target":target,
        })
        messages.append({"role":"assistant", "content":target})
    return rows

def render_numerical_episode(split: str) -> list[dict]:
    """A tiny schedule fixture copied from src/lib/scheduling.ts output.

    FCFS input: P1(AT=0,BT=4), P2(AT=0,BT=2), P3(AT=0,BT=1).
    The backend's deterministic scheduler produced Gantt 0-4/4-6/6-7 and
    waiting times 0/4/6 (mean 3.33). The teacher explains these supplied values;
    it is explicitly trained not to recompute or override them.
    """
    fixture = {
        "algorithm":"fcfs",
        "gantt":[["P1",0,4],["P2",4,6],["P3",6,7]],
        "perProcess":[{"name":"P1","arrival":0,"burst":4,"completion":4,"turnaround":4,"waiting":0,"response":0},
                      {"name":"P2","arrival":0,"burst":2,"completion":6,"turnaround":6,"waiting":4,"response":4},
                      {"name":"P3","arrival":0,"burst":1,"completion":7,"turnaround":7,"waiting":6,"response":6}],
        "avgWaiting":3.33,
    }
    system = (teacher_rules("intermediate") + "\n\nCourse note: FCFS runs processes in arrival order and the waiting time is time in the ready queue. "
              "Source: " + NOTES.name + ", slide 10.\n"
              "A deterministic scheduler already computed this exact result; treat it as ground truth and explain it without recalculating: "
              + json.dumps(fixture, separators=(",", ":")))
    user_turns = [
        "The backend returned an FCFS schedule for P1(0,4), P2(0,2), P3(0,1). Help me understand it.",
        "I think P2 waits for 2 units because its burst is 2.",
        "Then waiting means time before its first run, not its own CPU time?",
        "P2 starts at 4 and arrived at 0, so the supplied result says its wait is 4.",
        "Why is average waiting 3.33 if the three waits are 0, 4, and 6?",
    ]
    teacher_turns = [
        "Use the provided Gantt intervals: P1 runs from 0 to 4, then P2 from 4 to 6, then P3 from 6 to 7. The deterministic result reports waiting times 0, 4, and 6, with average 3.33. Let's interpret rather than recompute: during which interval is P2 waiting?",
        "You're mixing P2's CPU burst with its ready-queue wait. The supplied result is the ground truth. Think about when P2 arrives and when the Gantt chart first starts P2; what interval lies between those events?",
        "Exactly: waiting is the time before it receives CPU service in this FCFS example. The deterministic result gives P2 waiting=4. Now compare that with P2's burst=2: what does each number describe?",
        "Right. You read the deterministic values correctly: P2 is ready from time 0 until its first run at time 4. The scheduler's result is authoritative; we are interpreting it, not replacing its calculation. What operation would combine three process waits into their average?",
        "Yes: add the three supplied waiting values and divide by the three processes. That explains the reported average without asking the language model to run the scheduler. Which process has the largest wait, and what in the Gantt order explains it?",
    ]
    messages = [{"role":"system","content":system}]
    rows=[]
    for turn,(student,target) in enumerate(zip(user_turns,teacher_turns),start=1):
        messages.append({"role":"user","content":student})
        rows.append({"id":f"{split}-numerical-t{turn}","split":split,"topic":"Numerical explanation","skill":"deterministic_numerical_explanation","difficulty":"intermediate","source":{"filename":NOTES.name,"page":10},"deterministic_fixture":fixture,"messages":[*messages],"training_messages":[*messages,{"role":"assistant","content":target}],"target":target})
        messages.append({"role":"assistant","content":target})
    return rows

def render_eval_probes() -> list[dict]:
    """Held-out, one-turn probes spanning the teaching-quality rubric."""
    probes = [
        ("active_recall", "FCFS", 10, "Earlier we learned FCFS. Before we move on, ask me to retrieve its key selection principle without giving it away.", "question"),
        ("misconception_handling", "FCFS", 10, "I think FCFS always gives the minimum average waiting time. Respond to my claim as a tutor.", "hint"),
        ("hint_first", "SJF", 16, "SJF picks the newest arrival, right? Give me a first hint and one retry question; do not reveal the correction yet.", "hint"),
        ("cumulative_recall", "Waiting time", 8, "We covered FCFS earlier and are now learning SJF. Ask me to recall how we described waiting time so we can connect the ideas.", "question"),
        ("self_explanation", "Round Robin", 22, "I have read the definition of Round Robin. Ask me to explain it in my own words and test a key detail.", "question"),
        ("difficulty_adaptation", "SRTF", 19, "I have answered two SRTF questions incorrectly and seem overwhelmed. Simplify the idea and ask a smaller reasoning question.", "question"),
        ("concept_comparison", "SJF", 16, "Compare SJF with FCFS briefly, then ask me a question that checks why their selection rules differ.", "question"),
        ("numerical_explanation", "FCFS numerical", 10, "The deterministic backend supplied Gantt P1 0-4, P2 4-6, P3 6-7 and waits 0,4,6 (average 3.33). Explain P2's wait without recalculating and ask me to interpret one next step.", "numerical"),
        ("previous_topic_connection", "SJF", 16, "We just studied arrival time and FCFS. Introduce SJF by connecting it to that earlier material without repeating a whole lesson.", "connect"),
        ("avoid_answer_dump", "Turnaround time", 8, "Teach me turnaround time interactively in one concise step; do not give a full lesson or ask 'Do you understand?'.", "question"),
        ("useful_question", "Time quantum", 22, "The Round Robin time quantum became very small. Give a brief explanation and ask a substantive question about the trade-off.", "question"),
        ("conversation_continuity", "FCFS", 10, "Earlier you asked what determines FCFS order and gave me a hint. I answer: arrival time. Evaluate this answer and move our lesson forward.", "feedback"),
    ]
    facts = {card["topic"]: card for card in CARDS}
    rows=[]
    for idx,(skill,topic,page,user,expect) in enumerate(probes,1):
        fact = facts["FCFS"] if topic == "FCFS numerical" else facts[topic]
        messages=[
            {"role":"system","content":teacher_rules("adaptive")+f"\nCourse note: {fact['fact']}\nSource: {NOTES.name}, slide {page}. Use this source-backed fact and preserve the supplied conversation context."},
            {"role":"user","content":user},
        ]
        if skill == "conversation_continuity":
            messages=[
                messages[0],
                {"role":"user","content":"What determines which process runs first in FCFS?"},
                {"role":"assistant","content":"Think about which process became ready first. What event tells us that order?"},
                {"role":"user","content":"Arrival time."},
            ]
        rows.append({"id":f"eval-rubric-{idx:02d}","split":"evaluation","topic":topic,"skill":skill,"difficulty":"mixed","source":{"filename":NOTES.name,"page":page},"expected_marker":expect,"messages":messages})
    return rows

def main() -> None:
    source_path = Path(__file__).resolve().parents[1] / "notes for process" / NOTES.name
    if not source_path.is_file():
        raise SystemExit(f"Required course source is missing: {source_path}")
    # Fixed 100/15/15 held-out episode split. Topic cards repeat across split,
    # while exact dialogue variants and target responses do not.
    episode_ids = [("train", i) for i in range(100)] + [("validation", i) for i in range(15)] + [("evaluation", i) for i in range(15)]
    by_split = {"train": [], "validation": [], "evaluation": []}
    for split, local_index in episode_ids:
        if split == "train":
            card_index, variant = local_index % len(CARDS), local_index // len(CARDS)
        else:
            card_index = local_index % len(CARDS)
            variant = 5 if split == "validation" else 6
        scenario_index = variant * len(CARDS) + card_index
        card = CARDS[card_index]
        by_split[split].extend(render_episode(card, scenario_index, split))
    for split in by_split:
        by_split[split].extend(render_numerical_episode(split))
    by_split["evaluation"].extend(render_eval_probes())
    for split, rows in by_split.items():
        target = OUT / f"{split}.jsonl"
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("w", encoding="utf-8", newline="\n") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print("Dataset built (assistant-turn examples): " + ", ".join(f"{k}={len(v)}" for k,v in by_split.items()))
    print(f"Total: {sum(map(len, by_split.values()))}; source cards: {len(CARDS)}; episode split: 100/15/15 plus one deterministic numerical episode per split.")

if __name__ == "__main__":
    main()
