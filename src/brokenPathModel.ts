export const BROKEN_PATH_FINAL_WORD = "AURIEL";

export type BrokenPathState = {
  solvedPairIds: string[];
  routeSelections: Record<string, string>;
  completedAt?: string;
  finalWord?: string;
};

export type PuzzleViewMode = "adventure" | "moderation";

export type SwitchChoice = {
  id: "upper" | "lower";
  label: string;
  points: string;
};

export type SwitchNode = {
  id: string;
  label: string;
  title: string;
  group: string;
  x: number;
  y: number;
  lane: number;
  correct: SwitchChoice["id"];
  choices: [SwitchChoice, SwitchChoice];
};

export const SWITCHBOARD_GROUPS = [
  { id: "balfiera", title: "Balfiera", subtitle: "First coast" },
  { id: "velothi", title: "Velothi Span", subtitle: "Ash road" },
  { id: "adamant", title: "Adamant Gate", subtitle: "Final locks" },
];

export const SWITCH_NODES: SwitchNode[] = [
  {
    id: "balfiera-01",
    label: "01",
    title: "Sea-mouth hinge",
    group: "balfiera",
    x: 330,
    y: 92,
    lane: 1,
    correct: "lower",
    choices: [
      { id: "upper", label: "white shore", points: "195,270 265,210 315,156 445,156" },
      { id: "lower", label: "first tower", points: "195,270 265,210 315,132 445,132 515,100" },
    ],
  },
  {
    id: "balfiera-02",
    label: "02",
    title: "Zero-stone gate",
    group: "balfiera",
    x: 330,
    y: 162,
    lane: 2,
    correct: "upper",
    choices: [
      { id: "upper", label: "hollow count", points: "270,205 330,184 445,184 515,132" },
      { id: "lower", label: "late measure", points: "270,205 330,220 445,220" },
    ],
  },
  {
    id: "balfiera-03",
    label: "03",
    title: "Dawn verdict",
    group: "balfiera",
    x: 330,
    y: 232,
    lane: 3,
    correct: "lower",
    choices: [
      { id: "upper", label: "dragon rests", points: "290,270 445,270 515,318" },
      { id: "lower", label: "dragon measures", points: "290,270 445,270 515,352" },
    ],
  },
  {
    id: "balfiera-04",
    label: "04",
    title: "Judgment split",
    group: "balfiera",
    x: 330,
    y: 302,
    lane: 4,
    correct: "upper",
    choices: [
      { id: "upper", label: "eastward cast", points: "270,320 345,358 445,358 515,318" },
      { id: "lower", label: "bowless return", points: "270,320 345,388 445,388" },
    ],
  },
  {
    id: "balfiera-05",
    label: "05",
    title: "Ash-wound mouth",
    group: "balfiera",
    x: 330,
    y: 372,
    lane: 5,
    correct: "upper",
    choices: [
      { id: "upper", label: "heart below", points: "300,418 445,418 515,418" },
      { id: "lower", label: "dead ember", points: "300,418 400,448 515,448" },
    ],
  },
  {
    id: "velothi-01",
    label: "01",
    title: "Convention fulcrum",
    group: "velothi",
    x: 750,
    y: 152,
    lane: 1,
    correct: "upper",
    choices: [
      { id: "upper", label: "council holds", points: "565,170 650,170 705,205 750,205 820,164" },
      { id: "lower", label: "council breaks", points: "565,170 650,240 750,240 820,205" },
    ],
  },
  {
    id: "velothi-02",
    label: "02",
    title: "Heart crossing",
    group: "velothi",
    x: 750,
    y: 242,
    lane: 2,
    correct: "lower",
    choices: [
      { id: "upper", label: "trial remains", points: "600,274 700,274 820,240" },
      { id: "lower", label: "heart travels", points: "600,274 700,318 820,318 885,278" },
    ],
  },
  {
    id: "velothi-03",
    label: "03",
    title: "Red mountain hinge",
    group: "velothi",
    x: 750,
    y: 332,
    lane: 3,
    correct: "upper",
    choices: [
      { id: "upper", label: "ash wakes", points: "565,365 700,365 820,318 885,278" },
      { id: "lower", label: "ash sleeps", points: "565,365 700,404 820,404" },
    ],
  },
  {
    id: "adamant-01",
    label: "01",
    title: "Sun lock",
    group: "adamant",
    x: 1080,
    y: 152,
    lane: 1,
    correct: "upper",
    choices: [
      { id: "upper", label: "golden witness", points: "875,170 950,170 1030,170 1190,170" },
      { id: "lower", label: "blind witness", points: "875,170 950,210 1030,210 1190,210" },
    ],
  },
  {
    id: "adamant-02",
    label: "02",
    title: "Arrow lock",
    group: "adamant",
    x: 1080,
    y: 242,
    lane: 2,
    correct: "lower",
    choices: [
      { id: "upper", label: "wrong road", points: "900,270 995,270 1190,270" },
      { id: "lower", label: "east road", points: "900,270 995,315 1190,315" },
    ],
  },
  {
    id: "adamant-03",
    label: "03",
    title: "Wound lock",
    group: "adamant",
    x: 1080,
    y: 332,
    lane: 3,
    correct: "lower",
    choices: [
      { id: "upper", label: "heart alone", points: "900,360 995,360 1190,360" },
      { id: "lower", label: "heart and ash", points: "900,360 995,405 1190,405" },
    ],
  },
  {
    id: "adamant-04",
    label: "04",
    title: "Tower lock",
    group: "adamant",
    x: 1080,
    y: 422,
    lane: 4,
    correct: "upper",
    choices: [
      { id: "upper", label: "tower answers", points: "955,450 1035,450 1190,450" },
      { id: "lower", label: "tower refuses", points: "955,450 1035,492 1190,492" },
    ],
  },
];

const DEFAULT_ROUTE_SELECTIONS = SWITCH_NODES.reduce<Record<string, string>>((accumulator, node, index) => {
  accumulator[node.id] = index % 2 === 0 ? "upper" : "lower";
  return accumulator;
}, {});

export const DEFAULT_BROKEN_PATH_STATE: BrokenPathState = {
  solvedPairIds: [],
  routeSelections: DEFAULT_ROUTE_SELECTIONS,
};

export function normalizeSelections(selections: Record<string, string>) {
  return SWITCH_NODES.reduce<Record<string, string>>((accumulator, node) => {
    const value = selections[node.id];
    accumulator[node.id] = value === "upper" || value === "lower" ? value : DEFAULT_ROUTE_SELECTIONS[node.id];
    return accumulator;
  }, {});
}

export function stageIsSolved(state: BrokenPathState, groupId: string) {
  const selections = normalizeSelections(state.routeSelections);
  return SWITCH_NODES.filter((node) => node.group === groupId).every((node) => selections[node.id] === node.correct);
}

export function solvedStageIds(state: BrokenPathState) {
  return SWITCHBOARD_GROUPS.filter((group) => stageIsSolved(state, group.id)).map((group) => group.id);
}

export function correctSwitchCount(state: BrokenPathState) {
  const selections = normalizeSelections(state.routeSelections);
  return SWITCH_NODES.filter((node) => selections[node.id] === node.correct).length;
}

export function brokenPathSolved(state: BrokenPathState) {
  return Boolean(state.completedAt && state.finalWord === BROKEN_PATH_FINAL_WORD);
}

export function brokenPathProgress(state: BrokenPathState) {
  const switchHits = correctSwitchCount(state);
  const completion = brokenPathSolved(state) ? 1 : 0;
  return Math.round(((switchHits + completion) / (SWITCH_NODES.length + 1)) * 100);
}
