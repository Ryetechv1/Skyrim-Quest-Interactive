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
  { id: "balfiera", title: "Countryside", subtitle: "" },
  { id: "velothi", title: "Safari", subtitle: "" },
  { id: "adamant", title: "Station", subtitle: "" },
];

export const SWITCH_NODES: SwitchNode[] = [
  {
    id: "balfiera-01",
    label: "01",
    title: "Sea-mouth hinge",
    group: "balfiera",
    x: 356,
    y: 86,
    lane: 1,
    correct: "lower",
    choices: [
      { id: "upper", label: "white shore", points: "194,276 266,202 340,130 436,130 505,130 436,204" },
      { id: "lower", label: "first tower", points: "194,276 282,226 340,188 436,188" },
    ],
  },
  {
    id: "balfiera-02",
    label: "02",
    title: "Zero-stone gate",
    group: "balfiera",
    x: 356,
    y: 158,
    lane: 2,
    correct: "upper",
    choices: [
      { id: "upper", label: "hollow count", points: "280,224 342,198 436,198 505,130" },
      { id: "lower", label: "late measure", points: "280,224 340,214 436,214" },
    ],
  },
  {
    id: "balfiera-03",
    label: "03",
    title: "Dawn verdict",
    group: "balfiera",
    x: 356,
    y: 230,
    lane: 3,
    correct: "lower",
    choices: [
      { id: "upper", label: "dragon rests", points: "292,276 436,276 506,346" },
      { id: "lower", label: "dragon measures", points: "292,276 436,276 506,314" },
    ],
  },
  {
    id: "balfiera-04",
    label: "04",
    title: "Judgment split",
    group: "balfiera",
    x: 356,
    y: 302,
    lane: 4,
    correct: "upper",
    choices: [
      { id: "upper", label: "eastward cast", points: "280,322 345,358 436,358 506,314" },
      { id: "lower", label: "bowless return", points: "280,322 345,388 436,388" },
    ],
  },
  {
    id: "balfiera-05",
    label: "05",
    title: "Ash-wound mouth",
    group: "balfiera",
    x: 356,
    y: 374,
    lane: 5,
    correct: "upper",
    choices: [
      { id: "upper", label: "heart below", points: "300,418 436,418 506,418" },
      { id: "lower", label: "dead ember", points: "300,418 400,452 506,452" },
    ],
  },
  {
    id: "velothi-01",
    label: "01",
    title: "Convention fulcrum",
    group: "velothi",
    x: 770,
    y: 158,
    lane: 1,
    correct: "upper",
    choices: [
      { id: "upper", label: "council holds", points: "505,205 596,205 686,205 754,205 820,164 850,164 922,164" },
      { id: "lower", label: "council breaks", points: "505,205 598,205 686,276 754,276 820,236" },
    ],
  },
  {
    id: "velothi-02",
    label: "02",
    title: "Heart crossing",
    group: "velothi",
    x: 770,
    y: 248,
    lane: 2,
    correct: "lower",
    choices: [
      { id: "upper", label: "trial remains", points: "604,276 700,276 850,276 922,276" },
      { id: "lower", label: "heart travels", points: "604,276 700,318 850,318 922,276" },
    ],
  },
  {
    id: "velothi-03",
    label: "03",
    title: "Red mountain hinge",
    group: "velothi",
    x: 770,
    y: 338,
    lane: 3,
    correct: "upper",
    choices: [
      { id: "upper", label: "ash wakes", points: "604,350 700,350 850,318 922,276" },
      { id: "lower", label: "ash sleeps", points: "604,350 700,390 850,390" },
    ],
  },
  {
    id: "adamant-01",
    label: "01",
    title: "Sun lock",
    group: "adamant",
    x: 1100,
    y: 158,
    lane: 1,
    correct: "upper",
    choices: [
      { id: "upper", label: "golden witness", points: "922,164 1017,164 1087,164 1178,164" },
      { id: "lower", label: "blind witness", points: "922,164 1017,210 1087,210 1178,210" },
    ],
  },
  {
    id: "adamant-02",
    label: "02",
    title: "Arrow lock",
    group: "adamant",
    x: 1100,
    y: 248,
    lane: 2,
    correct: "lower",
    choices: [
      { id: "upper", label: "wrong road", points: "922,276 1017,276 1087,276 1178,276" },
      { id: "lower", label: "east road", points: "922,276 1017,316 1087,316 1178,316" },
    ],
  },
  {
    id: "adamant-03",
    label: "03",
    title: "Wound lock",
    group: "adamant",
    x: 1100,
    y: 338,
    lane: 3,
    correct: "lower",
    choices: [
      { id: "upper", label: "heart alone", points: "922,350 1017,350 1087,350 1178,350" },
      { id: "lower", label: "heart and ash", points: "922,350 1017,392 1087,392 1178,392" },
    ],
  },
  {
    id: "adamant-04",
    label: "04",
    title: "Tower lock",
    group: "adamant",
    x: 1100,
    y: 408,
    lane: 4,
    correct: "upper",
    choices: [
      { id: "upper", label: "tower answers", points: "956,424 1035,424 1178,424" },
      { id: "lower", label: "tower refuses", points: "956,424 1035,462 1178,462" },
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
