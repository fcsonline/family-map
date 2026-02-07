import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  ControlButton,
  Controls,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import Papa from "papaparse";
import {
  FaBirthdayCake,
  FaCog,
  FaExclamationTriangle,
  FaFileCsv,
  FaHeart,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaPrint,
  FaRegHeart,
  FaSkull,
} from "react-icons/fa";
import "reactflow/dist/style.css";
import "./App.css";

const personWidth = 220;
const personHeight = 120;
const partnerGap = 60;
const unitGap = 200;
const verticalGap = 220;
const leftPadding = 80;
const topPadding = 60;
const marriageSize = 20;

const normalizeId = (value) => (value ? value.trim() : "");

const normalizePerson = (row) => ({
  id: normalizeId(row.id),
  name: row.name?.trim() || "Unknown",
  birth_day: row.birth_day?.trim() || "",
  death_day: row.death_day?.trim() || "",
  birth_place: row.birth_place?.trim() || "",
  father: normalizeId(row.father),
  mother: normalizeId(row.mother),
  married_to: normalizeId(row.married_to),
  avatar_url: row.avatar_url?.trim() || "",
  info: row.info?.trim() || "",
});

const formatDate = (value, locale) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
};

const getAgeYears = (birthDate, endDate) => {
  if (!birthDate) return null;
  const start = new Date(birthDate);
  if (Number.isNaN(start.getTime())) return null;
  const end = endDate ? new Date(endDate) : new Date();
  if (Number.isNaN(end.getTime())) return null;
  let years = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < start.getDate())) {
    years -= 1;
  }
  return years >= 0 ? years : null;
};

const translations = {
  "en-US": {
    title: "Family Tree",
    subtitle: "Your private genealogy map",
    searchPlaceholder: "Search a person",
    settings: "Settings",
    loadCsv: "Load CSV",
    clearHighlight: "Clear highlight",
    modalTitle: "Settings",
    modalSubtitle: "Personalize the tree view",
    close: "Close",
    save: "Save",
    locale: "Locale",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    alive: "Alive",
    unknown: "Unknown",
    warningsTitle: "Data warnings",
    warningsLabel: "Show warnings",
    warningsDescription: "Highlight inconsistent relationships and show alerts.",
    warningMissingPartner: "has a missing partner",
    warningNoReciprocal: "is not reciprocated",
    warningMissingParent: "has a child with a missing parent",
    infoTitle: "About",
    yearsLabel: "years",
  },
  "es-ES": {
    title: "Árbol familiar",
    subtitle: "Tu mapa genealógico privado",
    searchPlaceholder: "Buscar una persona",
    settings: "Configuración",
    loadCsv: "Cargar CSV",
    clearHighlight: "Quitar resaltado",
    modalTitle: "Configuración",
    modalSubtitle: "Personaliza la vista del árbol",
    close: "Cerrar",
    save: "Guardar",
    locale: "Idioma",
    theme: "Tema",
    themeLight: "Claro",
    themeDark: "Oscuro",
    alive: "Vivo",
    unknown: "Desconocido",
    warningsTitle: "Advertencias de datos",
    warningsLabel: "Mostrar advertencias",
    warningsDescription: "Resalta relaciones inconsistentes y muestra alertas.",
    warningMissingPartner: "tiene una pareja faltante",
    warningNoReciprocal: "no es recíproco",
    warningMissingParent: "tiene un hijo con un padre/madre faltante",
    infoTitle: "Sobre",
    yearsLabel: "años",
  },
  "ca-ES": {
    title: "Arbre familiar",
    subtitle: "El teu mapa genealògic privat",
    searchPlaceholder: "Cerca una persona",
    settings: "Configuració",
    loadCsv: "Carrega CSV",
    clearHighlight: "Treure ressaltat",
    modalTitle: "Configuració",
    modalSubtitle: "Personalitza la vista de l'arbre",
    close: "Tanca",
    save: "Desa",
    locale: "Idioma",
    theme: "Tema",
    themeLight: "Clar",
    themeDark: "Fosc",
    alive: "Viu",
    unknown: "Desconegut",
    warningsTitle: "Avisos de dades",
    warningsLabel: "Mostra avisos",
    warningsDescription: "Ressalta relacions incoherents i mostra alertes.",
    warningMissingPartner: "té una parella absent",
    warningNoReciprocal: "no és recíproc",
    warningMissingParent: "té un fill amb pare/mare absent",
    infoTitle: "Sobre",
    yearsLabel: "anys",
  },
  "pt-BR": {
    title: "Árvore genealógica",
    subtitle: "Seu mapa genealógico privado",
    searchPlaceholder: "Buscar uma pessoa",
    settings: "Configurações",
    loadCsv: "Carregar CSV",
    clearHighlight: "Limpar destaque",
    modalTitle: "Configurações",
    modalSubtitle: "Personalize a visualização",
    close: "Fechar",
    save: "Salvar",
    locale: "Localidade",
    theme: "Tema",
    themeLight: "Claro",
    themeDark: "Escuro",
    alive: "Vivo",
    unknown: "Desconhecido",
    warningsTitle: "Avisos de dados",
    warningsLabel: "Mostrar avisos",
    warningsDescription: "Destaque relações inconsistentes e mostre alertas.",
    warningMissingPartner: "tem parceiro ausente",
    warningNoReciprocal: "não é recíproco",
    warningMissingParent: "tem filho com pai/mãe ausente",
    infoTitle: "Sobre",
    yearsLabel: "anos",
  },
};

const getTranslations = (locale) => translations[locale] || translations["en-US"];

const getCoupleId = (idA, idB) => {
  if (!idA && !idB) return "";
  if (idA && idB) return [idA, idB].sort().join("__");
  return idA ? `${idA}__solo` : `${idB}__solo`;
};

const buildModel = (people) => {
  const peopleById = new Map();
  people.forEach((person) => {
    if (person.id) {
      peopleById.set(person.id, person);
    }
  });

  const coupleById = new Map();
  const marriageByPerson = new Map();
  const childrenByCouple = new Map();

  const ensureCouple = (idA, idB) => {
    const safeA = idA && peopleById.has(idA) ? idA : "";
    const safeB = idB && peopleById.has(idB) ? idB : "";
    const coupleId = getCoupleId(safeA, safeB);
    if (!coupleId) return "";
    if (!coupleById.has(coupleId)) {
      const partners = [safeA, safeB].filter(Boolean);
      if (partners.length === 2) {
        partners.sort((left, right) => {
          const leftName = peopleById.get(left)?.name || "";
          const rightName = peopleById.get(right)?.name || "";
          return leftName.localeCompare(rightName);
        });
      }
      coupleById.set(coupleId, {
        id: coupleId,
        partners,
        isSolo: partners.length === 1,
      });
    }
    const couple = coupleById.get(coupleId);
    couple.partners.forEach((partnerId) => {
      if (!marriageByPerson.has(partnerId)) {
        marriageByPerson.set(partnerId, coupleId);
      }
    });
    return coupleId;
  };

  people.forEach((person) => {
    if (person.married_to) {
      ensureCouple(person.id, person.married_to);
    }
  });

  people.forEach((person) => {
    if (person.father || person.mother) {
      const coupleId = ensureCouple(person.father, person.mother);
      if (coupleId) {
        const children = childrenByCouple.get(coupleId) || [];
        children.push(person.id);
        childrenByCouple.set(coupleId, children);
      }
    }
  });

  return { peopleById, coupleById, marriageByPerson, childrenByCouple };
};

const computeGenerations = (peopleById) => {
  const generationById = new Map();
  const visiting = new Set();

  const resolve = (id) => {
    if (!id || !peopleById.has(id)) return 0;
    if (generationById.has(id)) return generationById.get(id);
    if (visiting.has(id)) return 0;

    visiting.add(id);
    const person = peopleById.get(id);
    const fatherGen = person.father ? resolve(person.father) : 0;
    const motherGen = person.mother ? resolve(person.mother) : 0;
    const gen = person.father || person.mother ? 1 + Math.max(fatherGen, motherGen) : 0;
    generationById.set(id, gen);
    visiting.delete(id);
    return gen;
  };

  peopleById.forEach((_person, id) => {
    resolve(id);
  });

  return generationById;
};

const buildWarnings = (people, locale) => {
  const copy = getTranslations(locale);
  const peopleById = new Map();
  people.forEach((person) => {
    peopleById.set(person.id, person);
  });

  const warnings = [];
  const warningIds = new Set();
  const warningById = new Map();

  const addWarning = (personId, message) => {
    warnings.push(message);
    warningIds.add(personId);
    const list = warningById.get(personId) || [];
    list.push(message);
    warningById.set(personId, list);
  };

  people.forEach((person) => {
    if (person.married_to) {
      const partner = peopleById.get(person.married_to);
      if (!partner) {
        addWarning(person.id, `${person.name} ${copy.warningMissingPartner}.`);
      } else if (partner.married_to !== person.id) {
        addWarning(
          person.id,
          `${person.name} ${copy.warningNoReciprocal} (${partner.name}).`,
        );
      }
    }
  });

  people.forEach((child) => {
    if (child.father && !child.mother) {
      const fatherName = peopleById.get(child.father)?.name || child.father;
      addWarning(
        child.id,
        `${fatherName} ${copy.warningMissingParent} (${child.name}).`,
      );
    }
    if (child.mother && !child.father) {
      const motherName = peopleById.get(child.mother)?.name || child.mother;
      addWarning(
        child.id,
        `${motherName} ${copy.warningMissingParent} (${child.name}).`,
      );
    }
  });

  return { warnings, warningIds, warningById };
};

const buildGraph = (
  people,
  selectedId,
  locale,
  warningIds,
  warningById,
  matchIds,
  onInfo,
  showWarnings,
) => {
  const { peopleById, coupleById, marriageByPerson, childrenByCouple } =
    buildModel(people);
  const generationById = computeGenerations(peopleById);
  const coupleGeneration = new Map();

  coupleById.forEach((couple) => {
    const generations = couple.partners.map((partnerId) =>
      generationById.get(partnerId) ?? 0,
    );
    coupleGeneration.set(couple.id, Math.max(0, ...generations));
  });

  const unitsByGen = new Map();
  const addUnit = (gen, unit) => {
    const list = unitsByGen.get(gen) || [];
    list.push(unit);
    unitsByGen.set(gen, list);
  };

  coupleById.forEach((couple) => {
    const gen = coupleGeneration.get(couple.id) ?? 0;
    addUnit(gen, { type: "couple", couple });
  });

  peopleById.forEach((person) => {
    if (!marriageByPerson.has(person.id)) {
      const gen = generationById.get(person.id) ?? 0;
      addUnit(gen, { type: "single", personId: person.id });
    }
  });

  const orderedGenerations = Array.from(unitsByGen.keys()).sort((a, b) => a - b);
  const nodes = [];
  const edges = [];
  const positions = new Map();

  orderedGenerations.forEach((gen) => {
    const units = unitsByGen.get(gen) || [];
    units.sort((left, right) => {
      const getKey = (unit) => {
        const person =
          unit.type === "single"
            ? peopleById.get(unit.personId)
            : peopleById.get(unit.couple.partners[0]);
        const parentCouple = getCoupleId(person?.father, person?.mother) || "";
        const name = person?.name || "";
        return `${parentCouple}__${name}`;
      };
      return getKey(left).localeCompare(getKey(right));
    });

    let currentX = leftPadding;
    const y = topPadding + gen * verticalGap;

    units.forEach((unit) => {
      const partners =
        unit.type === "couple"
          ? unit.couple.partners
          : [unit.personId];
      const isCouple = unit.type === "couple";
      const unitWidth =
        partners.length * personWidth + (partners.length - 1) * partnerGap;
      const startX = currentX;

      partners.forEach((partnerId, index) => {
        const x = startX + index * (personWidth + partnerGap);
        const person = peopleById.get(partnerId);
        const isSelected = selectedId === partnerId;
        const isDimmed = selectedId && selectedId !== partnerId;
        const node = {
          id: partnerId,
          type: "person",
          position: { x, y },
          data: {
            person,
            isSelected,
            isDimmed,
            locale,
            hasWarning: showWarnings && warningIds?.has(partnerId),
            warningMessage: showWarnings
              ? warningById?.get(partnerId)?.join(" ") || ""
              : "",
            isMatch: matchIds?.has(partnerId),
            onInfo,
          },
        };
        nodes.push(node);
        positions.set(partnerId, { x, y });
      });

      if (isCouple) {
        const marriageX = startX + unitWidth / 2 - marriageSize / 2;
        const marriageY = y + personHeight / 2 - marriageSize / 2;
        const marriageNodeId = `marriage-${unit.couple.id}`;
        const isDimmed = selectedId
          ? !unit.couple.partners.includes(selectedId)
          : false;
        nodes.push({
          id: marriageNodeId,
          type: "marriage",
          position: { x: marriageX, y: marriageY },
          data: { isDimmed },
        });
        positions.set(marriageNodeId, { x: marriageX, y: marriageY });
      }

      currentX += unitWidth + unitGap;
    });
  });

  coupleById.forEach((couple) => {
    const marriageNodeId = `marriage-${couple.id}`;
    const marriagePos = positions.get(marriageNodeId);
    couple.partners.forEach((partnerId) => {
      const partnerPos = positions.get(partnerId);
      const isLeft = partnerPos && marriagePos && partnerPos.x < marriagePos.x;
      const targetHandle = isLeft ? "left" : "right";
      const sourceHandle = isLeft ? "right" : "left";
      edges.push({
        id: `${partnerId}-${marriageNodeId}`,
        source: partnerId,
        sourceHandle,
        target: marriageNodeId,
        targetHandle,
        type: "straight",
      });
    });
    const children = childrenByCouple.get(couple.id) || [];
    children.forEach((childId) => {
      edges.push({
        id: `${marriageNodeId}-${childId}`,
        source: marriageNodeId,
        target: childId,
        sourceHandle: "bottom",
        type: "step",
      });
    });
  });

  return { nodes, edges };
};

const PersonNode = ({ data }) => {
  const {
    person,
    isSelected,
    isDimmed,
    locale,
    hasWarning,
    warningMessage,
    isMatch,
    onInfo,
  } = data;
  const copy = getTranslations(locale);
  const isDeceased = Boolean(person.death_day);
  const birthLabel = formatDate(person.birth_day, locale) || copy.unknown;
  const deathLabel = person.death_day
    ? formatDate(person.death_day, locale)
    : copy.alive;

  return (
    <div
      className={`person-card ${isSelected ? "selected" : ""} ${
        isDimmed ? "dimmed" : ""
      } ${hasWarning ? "warning" : ""} ${isMatch ? "match" : ""}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Handle
        type="source"
        id="left"
        position={Position.Left}
        isConnectable={false}
      />
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        isConnectable={false}
      />
      <div
        className={`person-image ${isDeceased ? "deceased" : ""}`}
        style={
          person.avatar_url
            ? { backgroundImage: `url(${person.avatar_url})` }
            : undefined
        }
      />
      {hasWarning && (
        <div className="person-warning" title={warningMessage}>
          <FaExclamationTriangle />
        </div>
      )}
      {isSelected && person.info && (
        <button
          className="person-info"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onInfo?.(person);
          }}
          title={copy.infoTitle}
        >
          <FaInfoCircle />
        </button>
      )}
      <div className="person-body">
        <div className="person-name">{person.name}</div>
        <div className="person-meta">
          <FaBirthdayCake />
          <span>{birthLabel}</span>
        </div>
        <div className="person-meta">
          {isDeceased ? <FaSkull /> : <FaRegHeart />}
          <span>{deathLabel}</span>
        </div>
        <div className="person-meta">
          <FaMapMarkerAlt />
          <span>{person.birth_place || copy.unknown}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
};

const MarriageNode = ({ data }) => (
  <div className={`marriage-node ${data.isDimmed ? "dimmed" : ""}`}>
    <FaHeart />
    <Handle
      type="target"
      id="left"
      position={Position.Left}
      isConnectable={false}
    />
    <Handle
      type="target"
      id="right"
      position={Position.Right}
      isConnectable={false}
    />
    <Handle
      type="source"
      id="bottom"
      position={Position.Bottom}
      isConnectable={false}
    />
  </div>
);

const FlowCanvas = ({ nodes, edges, onSelect, selectedId, onPrint, fitViewKey }) => {
  const { fitView, setCenter } = useReactFlow();

  const handlePrint = () => {
    fitView({ padding: 0.2, duration: 300 });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => onPrint(), 150);
      });
    });
  };

  useEffect(() => {
    if (!selectedId) return;
    const node = nodes.find((item) => item.id === selectedId);
    if (!node) return;
    setCenter(node.position.x + personWidth / 2, node.position.y + personHeight / 2, {
      zoom: 1.1,
      duration: 600,
    });
  }, [nodes, selectedId, setCenter]);

  useEffect(() => {
    if (fitViewKey === 0) return;
    fitView({ padding: 0.2, duration: 400 });
  }, [fitViewKey, fitView]);

  return (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ person: PersonNode, marriage: MarriageNode }}
        fitView
        nodesConnectable={false}
        onNodeClick={(_event, node) => {
          if (node.type === "person") {
            onSelect(node.id);
          }
        }}
        defaultEdgeOptions={{
          style: { stroke: "#7b86a4", strokeWidth: 2 },
          pathOptions: { offset: 20 },
          markerEnd: "",
        }}
      >
      <Background gap={16} color="#d6dbe8" />
      <Controls>
        <ControlButton onClick={handlePrint} title="Print">
          <FaPrint />
        </ControlButton>
      </Controls>
    </ReactFlow>
  );
};

const App = () => {
  const [people, setPeople] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [locale, setLocale] = useState("en-US");
  const [theme, setTheme] = useState("light");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [draftLocale, setDraftLocale] = useState("en-US");
  const [draftTheme, setDraftTheme] = useState("light");
  const [showWarnings, setShowWarnings] = useState(true);
  const [draftShowWarnings, setDraftShowWarnings] = useState(true);
  const [fitViewKey, setFitViewKey] = useState(0);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const fileInputRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const parseCsv = (text) => {
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });
    return parsed.data.map(normalizePerson).filter((item) => item.id);
  };

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/people.csv");
      const text = await response.text();
      setPeople(parseCsv(text));
    };

    load();
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setSelectedId("");
        setSelectedInfo(null);
        setFitViewKey((value) => value + 1);
      }
      if (event.key === "/") {
        if (document.activeElement !== searchInputRef.current) {
          event.preventDefault();
          searchInputRef.current?.focus();
        }
      }
      if (event.key === "Enter" && selectedId && !selectedInfo) {
        const person = people.find((entry) => entry.id === selectedId);
        if (person?.info) {
          setSelectedInfo(person);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId, selectedInfo, people]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const storedLocale = localStorage.getItem("geo-family-locale");
    const storedTheme = localStorage.getItem("geo-family-theme");
    const storedWarnings = localStorage.getItem("geo-family-show-warnings");
    if (storedLocale && translations[storedLocale]) {
      setLocale(storedLocale);
    }
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
    if (storedWarnings === "false") {
      setShowWarnings(false);
    }
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      setDraftLocale(locale);
      setDraftTheme(theme);
      setDraftShowWarnings(showWarnings);
    }
  }, [isSettingsOpen, locale, theme, showWarnings]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setPeople(parseCsv(text));
      setSelectedId("");
      setSelectedInfo(null);
      setSearchTerm("");
      setIsSearchOpen(false);
    };
    reader.readAsText(file);
  };

  const copy = getTranslations(locale);
  const { warnings, warningIds, warningById } = useMemo(
    () => buildWarnings(people, locale),
    [people, locale],
  );

  const filteredMatches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return people.filter((person) => person.name.toLowerCase().includes(term));
  }, [people, searchTerm]);

  const matches = useMemo(() => filteredMatches.slice(0, 8), [filteredMatches]);

  const matchIds = useMemo(
    () => new Set(filteredMatches.map((person) => person.id)),
    [filteredMatches],
  );

  useEffect(() => {
    if (!matches.length) {
      setActiveMatchIndex(0);
    }
  }, [matches]);

  const infoParagraphs = useMemo(() => {
    if (!selectedInfo?.info) return [];
    return selectedInfo.info
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [selectedInfo]);

  const selectedAge = useMemo(() => {
    if (!selectedInfo?.birth_day) return null;
    return getAgeYears(selectedInfo.birth_day, selectedInfo.death_day);
  }, [selectedInfo]);

  const { nodes, edges } = useMemo(
    () =>
      buildGraph(
        people,
        selectedId,
        locale,
        warningIds,
        warningById,
        matchIds,
        (person) => setSelectedInfo(person),
        showWarnings,
      ),
    [people, selectedId, locale, warningIds, warningById, matchIds, showWarnings],
  );

  useEffect(() => {
    setShowWarnings(true);
    setDraftShowWarnings(true);
  }, [people, locale]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setSelectedInfo(null);
  };

  return (
    <div className={`app-shell ${theme}`}>
      <div className="toolbar">
        <div className="title-row">
          <img className="title-icon" src="/favicon.png" alt="" />
          <div className="title-stack">
            <div className="title">{copy.title}</div>
            <div className="subtitle">{copy.subtitle}</div>
          </div>
        </div>
        <div className="search" ref={searchRef}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder={copy.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setIsSearchOpen(true);
              setActiveMatchIndex(0);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setSearchTerm("");
                setIsSearchOpen(false);
                setActiveMatchIndex(0);
                return;
              }
              if (!matches.length) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveMatchIndex((index) => Math.min(index + 1, matches.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveMatchIndex((index) => Math.max(index - 1, 0));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const chosen = matches[activeMatchIndex] || matches[0];
                if (chosen) {
                  handleSelect(chosen.id);
                  setSearchTerm(chosen.name);
                  setIsSearchOpen(false);
                  setActiveMatchIndex(0);
                }
              }
            }}
          />
          {isSearchOpen && matches.length > 0 && (
            <div className="search-results">
              {matches.map((person, index) => (
                <button
                  key={person.id}
                  type="button"
                  className={index === activeMatchIndex ? "active" : ""}
                  onMouseDown={() => {
                    handleSelect(person.id);
                    setSearchTerm(person.name);
                    setIsSearchOpen(false);
                    setActiveMatchIndex(0);
                  }}
                >
                  {person.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="toolbar-actions">
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />
          {selectedId && (
            <button
              className="reset"
              type="button"
              onClick={() => {
                setSelectedId("");
                setSelectedInfo(null);
              }}
            >
              {copy.clearHighlight}
            </button>
          )}
          <button
            className="settings"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <FaFileCsv />
            {copy.loadCsv}
          </button>
          <button
            className="settings"
            type="button"
            onClick={() => setIsSettingsOpen(true)}
          >
            <FaCog />
            {copy.settings}
          </button>
        </div>
      </div>
      {showWarnings && warnings.length > 0 && (
        <div className="warning-banner">
          <div className="warning-content">
            <span className="warning-title">{copy.warningsTitle}:</span>
            <span className="warning-list">{warnings.join(" ")}</span>
          </div>
          <button
            className="warning-dismiss"
            type="button"
            onClick={() => setShowWarnings(false)}
          >
            {copy.close}
          </button>
        </div>
      )}
      <div className="flow-wrapper">
        <ReactFlowProvider>
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onSelect={handleSelect}
            selectedId={selectedId}
            onPrint={() => window.print()}
            fitViewKey={fitViewKey}
          />
        </ReactFlowProvider>
      </div>
      {isSettingsOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{copy.modalTitle}</div>
                <div className="modal-subtitle">{copy.modalSubtitle}</div>
              </div>
            </div>
            <div className="modal-body">
              <label className="field">
                <span>{copy.locale}</span>
                <select
                  value={draftLocale}
                  onChange={(event) => setDraftLocale(event.target.value)}
                >
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español (ES)</option>
                  <option value="ca-ES">Català (ES)</option>
                  <option value="pt-BR">Português (BR)</option>
                </select>
              </label>
              <label className="field">
                <span>{copy.theme}</span>
                <select
                  value={draftTheme}
                  onChange={(event) => setDraftTheme(event.target.value)}
                >
                  <option value="light">{copy.themeLight}</option>
                  <option value="dark">{copy.themeDark}</option>
                </select>
              </label>
              <label className="field checkbox">
                <div>
                  <span>{copy.warningsLabel}</span>
                  <small>{copy.warningsDescription}</small>
                </div>
                <input
                  type="checkbox"
                  checked={draftShowWarnings}
                  onChange={(event) => setDraftShowWarnings(event.target.checked)}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="modal-close"
                type="button"
                onClick={() => setIsSettingsOpen(false)}
              >
                {copy.close}
              </button>
              <button
                className="modal-save"
                type="button"
                onClick={() => {
                  setLocale(draftLocale);
                  setTheme(draftTheme);
                  setShowWarnings(draftShowWarnings);
                  localStorage.setItem("geo-family-locale", draftLocale);
                  localStorage.setItem("geo-family-theme", draftTheme);
                  localStorage.setItem(
                    "geo-family-show-warnings",
                    draftShowWarnings ? "true" : "false",
                  );
                  setIsSettingsOpen(false);
                }}
              >
                {copy.save}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedInfo && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal info-modal">
            <div className="modal-header">
              <div className="info-header">
                <div className="modal-title">
                  {copy.infoTitle} {selectedInfo.name}
                </div>
                <div className="info-meta">
                  <span className="info-line">
                    {formatDate(selectedInfo.birth_day, locale) || copy.unknown}
                    {selectedInfo.death_day
                      ? ` - ${formatDate(selectedInfo.death_day, locale)}`
                      : ""}
                    {selectedAge !== null && ` (${selectedAge} ${copy.yearsLabel})`}
                    {` · ${selectedInfo.birth_place || copy.unknown}`}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-body info-body">
              <div
                className={`info-avatar ${
                  selectedInfo.death_day ? "deceased" : ""
                }`}
                style={
                  selectedInfo.avatar_url
                    ? { backgroundImage: `url(${selectedInfo.avatar_url})` }
                    : undefined
                }
              />
              <div className="info-text">
                {infoParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-close"
                type="button"
                onClick={() => setSelectedInfo(null)}
              >
                {copy.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
