import {
  BookOpen,
  CircleDot,
  Cloud,
  ContactRound,
  Compass,
  Eye,
  FileKey,
  FlaskConical,
  Gem,
  KeyRound,
  Landmark,
  ScrollText,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { DossierStep, InventoryItem, VaultFile, VaultFolder } from "./types";
import photo1 from "./assets/references/photo-1.jpg";
import photo10 from "./assets/references/photo-10.jpg";
import photo2 from "./assets/references/photo-2.jpg";
import photo3 from "./assets/references/photo-3.jpg";
import photo4 from "./assets/references/photo-4.jpg";
import photo5 from "./assets/references/photo-5.jpg";
import photo6 from "./assets/references/photo-6.jpg";
import photo7 from "./assets/references/photo-7.jpg";
import photo8 from "./assets/references/photo-8.jpg";
import photo9 from "./assets/references/photo-9.jpg";

export const REFERENCE_IMAGES = [
  photo1,
  photo2,
  photo3,
  photo4,
  photo5,
  photo6,
  photo7,
  photo8,
  photo9,
  photo10,
];

export const dossierSteps: DossierStep[] = [
  { id: "reliquary", label: "The Reliquary", status: "solved" },
  { id: "wheel", label: "The Story Begins", status: "active" },
  { id: "vault", label: "The Vault", status: "open" },
  { id: "mask", label: "The Mask", status: "locked" },
  { id: "leviathan", label: "Leviathan Notes", status: "locked" },
  { id: "constellation", label: "Constellation Map", status: "locked" },
  { id: "seal", label: "Final Seal", status: "locked" },
];

export const inventory: InventoryItem[] = [
  {
    id: "lens",
    name: "Brass Lens",
    detail: "Reveals red marginalia when the wheel aligns.",
    icon: Search,
    acquired: false,
  },
  {
    id: "astrolabe",
    name: "Astrolabe",
    detail: "Calibrates the middle numeral ring.",
    icon: Compass,
    acquired: false,
  },
  {
    id: "ink",
    name: "Ink Vial",
    detail: "Stores solved phrases as dossier fragments.",
    icon: FlaskConical,
    acquired: false,
  },
  {
    id: "chronicle",
    name: "Chronicle",
    detail: "Records terminal events and decrypted files.",
    icon: ScrollText,
    acquired: false,
  },
  {
    id: "seal-ring",
    name: "Seal Ring",
    detail: "Authenticates the archive key.",
    icon: ShieldCheck,
    acquired: false,
  },
  {
    id: "wax",
    name: "Wax Stamp",
    detail: "Locks custom notes into the MEGA archive.",
    icon: Gem,
    acquired: false,
  },
  {
    id: "folding-key",
    name: "Folding Key",
    detail: "A three-toothed key recovered from the reliquary.",
    icon: KeyRound,
    acquired: false,
  },
  {
    id: "dividers",
    name: "Dividers",
    detail: "Measures distances between constellation nodes.",
    icon: CircleDot,
    acquired: false,
  },
  {
    id: "coin",
    name: "Strange Coin",
    detail: "Stamped with the Archivist-72 sigil.",
    icon: Landmark,
    acquired: false,
  },
];

export const vaultFiles: VaultFile[] = [
  {
    id: "triad-key",
    name: "TRIAD_KEY.txt.enc",
    type: "file",
    path: "Archive: MASK_OF_DESPAIR.mega/02_Artifacts/03_Keys",
    keyLabel: "Vault Key",
    password: "R3LIQU4RY-72",
    size: "6.4 KB",
    locked: true,
    clue: "The investigator code in the dossier opens this key.",
    plainText:
      "TRIAD KEY FRAGMENT A\n\nThis key was divided into three: truth, shadow, and memory. Align the outer Daedric alphabet to H, the middle numeral ring to the fourth mark, and the inner glyph to the third rune.\n\nRecovered passphrase: VERITAS",
  },
  {
    id: "mask-index",
    name: "MASK_INDEX.md.enc",
    type: "file",
    path: "Archive: MASK_OF_DESPAIR.mega/02_Artifacts/01_Mask",
    keyLabel: "Mask Password",
    password: "VERITAS",
    size: "11.2 KB",
    locked: true,
    clue: "Solve the wheel to reveal the passphrase.",
    plainText:
      "MASK INDEX\n\nThe Mask of Despair records what the reliquary forgets. Its surface contains twelve red wounds and seven black seals. Count the red stars clockwise, then read the black seals in reverse.\n\nRecovered passphrase: OCCULTA",
  },
  {
    id: "leviathan-notes",
    name: "LEVIATHAN_NOTES.txt.enc",
    type: "file",
    path: "Archive: MASK_OF_DESPAIR.mega/03_Forbidden_Library/01_Leviathan",
    keyLabel: "Leviathan Password",
    password: "OCCULTA",
    size: "14.8 KB",
    locked: true,
    clue: "The mask index contains the next word.",
    plainText:
      "LEVIATHAN NOTES\n\nThe old cabinet responds to discovery, not force. Seven folders are decoys. The true folder is the one whose star map has no repeated angle.\n\nRecovered passphrase: REVELATUR",
  },
  {
    id: "constellation-map",
    name: "CONSTELLATION_MAP.svg.enc",
    type: "file",
    path: "Archive: MASK_OF_DESPAIR.mega/03_Forbidden_Library/02_Constellations",
    keyLabel: "Constellation Password",
    password: "REVELATUR",
    size: "9.7 KB",
    locked: true,
    clue: "The leviathan note completes the Latin phrase.",
    plainText:
      "CONSTELLATION MAP\n\nA brass meridian splits the sky into twenty-six stations. The final seal opens when the three wheel rings read H, 4, and ᚨ at the red needle.\n\nRecovered final password: ARCHIVIST-72",
  },
  {
    id: "final-answer",
    name: "FINAL_ANSWERS.mega",
    type: "file",
    path: "Archive: MASK_OF_DESPAIR.mega/05_Final_Answers",
    keyLabel: "Final Password",
    password: "ARCHIVIST-72",
    size: "21.9 KB",
    locked: true,
    clue: "The constellation map gives the final credential.",
    plainText:
      "THE FINAL SEAL\n\nTruth hidden reveals. The Reliquary of Knowledge opens when the vault remembers its keeper: Archivist-72. The escape-room solution chain is R3LIQU4RY-72 -> VERITAS -> OCCULTA -> REVELATUR -> ARCHIVIST-72.",
  },
];

export const vaultTree: VaultFolder = {
  id: "archive-root",
  name: "Archive: MASK_OF_DESPAIR.mega",
  type: "folder",
  children: [
    {
      id: "lore",
      name: "00_Lore",
      type: "folder",
      children: [
        {
          id: "storyline-folder",
          name: "01_Storyline",
          type: "folder",
          children: [],
        },
      ],
    },
    {
      id: "research",
      name: "01_Research",
      type: "folder",
      children: [
        {
          id: "notes-folder",
          name: "01_Notes",
          type: "folder",
          children: [],
        },
        {
          id: "diagrams-folder",
          name: "02_Diagrams",
          type: "folder",
          children: [],
        },
      ],
    },
    {
      id: "artifacts",
      name: "02_Artifacts",
      type: "folder",
      children: [
        {
          id: "mask-folder",
          name: "01_Mask",
          type: "folder",
          children: [vaultFiles[1]],
        },
        {
          id: "seal-pieces",
          name: "02_Seal_Pieces",
          type: "folder",
          locked: true,
          children: [],
        },
        {
          id: "keys-folder",
          name: "03_Keys",
          type: "folder",
          children: [vaultFiles[0]],
        },
      ],
    },
    {
      id: "library",
      name: "03_Forbidden_Library",
      type: "folder",
      children: [
        {
          id: "leviathan-folder",
          name: "01_Leviathan",
          type: "folder",
          children: [vaultFiles[2]],
        },
        {
          id: "constellation-folder",
          name: "02_Constellations",
          type: "folder",
          children: [vaultFiles[3]],
        },
      ],
    },
    {
      id: "archives-obscura",
      name: "04_Archives_Obscura",
      type: "folder",
      locked: true,
      children: [],
    },
    {
      id: "final",
      name: "05_Final_Answers",
      type: "folder",
      children: [vaultFiles[4]],
    },
  ],
};

export const manuscriptTabs = [
  { id: "vault", label: "Vault", icon: FileKey },
  { id: "mega", label: "MEGA", icon: Cloud },
  { id: "archivists", label: "Users", icon: ContactRound },
  { id: "keys", label: "Keys", icon: KeyRound },
  { id: "notes", label: "Notes", icon: BookOpen },
  { id: "places", label: "Places", icon: Landmark },
  { id: "guides", label: "Guides", icon: ScrollText },
];
