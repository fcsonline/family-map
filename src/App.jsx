import { Component, useEffect, useMemo, useRef, useState } from "react";
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
  FaClock,
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

const getYearFromDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear();
};

const focusableSelectors =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const useModalFocusTrap = (isOpen, modalRef) => {
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    lastFocusedRef.current = document.activeElement;
    const focusable = modalRef.current?.querySelectorAll(focusableSelectors);
    focusable?.[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key !== "Tab") return;
      const elements = modalRef.current?.querySelectorAll(focusableSelectors);
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [isOpen, modalRef]);
};

const isPersonInYear = (person, year) => {
  const birthYear = getYearFromDate(person.birth_day);
  const deathYear = getYearFromDate(person.death_day);
  if (birthYear !== null && year < birthYear) return false;
  if (deathYear !== null && year > deathYear) return false;
  return true;
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
    warningsShow: "Show warnings",
    warningsHide: "Hide warnings",
    warningMissingPartner: "has a missing partner",
    warningNoReciprocal: "is not reciprocated",
    warningMissingParent: "has a child with a missing parent",
    infoTitle: "About",
    yearsLabel: "years",
    print: "Print",
    timeline: "Time travel",
    timelineTitle: "Time travel",
    timelineSubtitle: "Step through years to see the tree change over time",
    timelineStart: "Start year",
    timelineEnd: "End year",
    timelinePlay: "Start",
    timelineStop: "Stop",
    timelineCancel: "Cancel",
    timelineSpeed: "Speed",
    timelineSpeedSlow: "Slow",
    timelineSpeedNormal: "Normal",
    timelineSpeedFast: "Fast",
    treeErrorTitle: "Tree unavailable",
    treeErrorMessage: "Something went wrong while rendering the family tree.",
    treeErrorAction: "Try again",
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
    warningsShow: "Mostrar advertencias",
    warningsHide: "Ocultar advertencias",
    warningMissingPartner: "tiene una pareja faltante",
    warningNoReciprocal: "no es recíproco",
    warningMissingParent: "tiene un hijo con un padre/madre faltante",
    infoTitle: "Sobre",
    yearsLabel: "años",
    print: "Imprimir",
    timeline: "Viaje en el tiempo",
    timelineTitle: "Viaje en el tiempo",
    timelineSubtitle: "Recorre los años para ver cómo cambia el árbol",
    timelineStart: "Año de inicio",
    timelineEnd: "Año de fin",
    timelinePlay: "Iniciar",
    timelineStop: "Detener",
    timelineCancel: "Cancelar",
    timelineSpeed: "Velocidad",
    timelineSpeedSlow: "Lenta",
    timelineSpeedNormal: "Normal",
    timelineSpeedFast: "Rápida",
    treeErrorTitle: "Árbol no disponible",
    treeErrorMessage: "Se produjo un error al renderizar el árbol familiar.",
    treeErrorAction: "Intentar de nuevo",
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
    warningsShow: "Mostra avisos",
    warningsHide: "Amaga avisos",
    warningMissingPartner: "té una parella absent",
    warningNoReciprocal: "no és recíproc",
    warningMissingParent: "té un fill amb pare/mare absent",
    infoTitle: "Sobre",
    yearsLabel: "anys",
    print: "Imprimeix",
    timeline: "Viatge en el temps",
    timelineTitle: "Viatge en el temps",
    timelineSubtitle: "Recorre els anys per veure com canvia l'arbre",
    timelineStart: "Any d'inici",
    timelineEnd: "Any de fi",
    timelinePlay: "Inicia",
    timelineStop: "Atura",
    timelineCancel: "Cancel·la",
    timelineSpeed: "Velocitat",
    timelineSpeedSlow: "Lenta",
    timelineSpeedNormal: "Normal",
    timelineSpeedFast: "Ràpida",
    treeErrorTitle: "Arbre no disponible",
    treeErrorMessage: "S'ha produït un error en renderitzar l'arbre familiar.",
    treeErrorAction: "Torna-ho a provar",
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
    warningsShow: "Mostrar avisos",
    warningsHide: "Ocultar avisos",
    warningMissingPartner: "tem parceiro ausente",
    warningNoReciprocal: "não é recíproco",
    warningMissingParent: "tem filho com pai/mãe ausente",
    infoTitle: "Sobre",
    yearsLabel: "anos",
    print: "Imprimir",
    timeline: "Viagem no tempo",
    timelineTitle: "Viagem no tempo",
    timelineSubtitle: "Percorra os anos para ver como a árvore muda",
    timelineStart: "Ano inicial",
    timelineEnd: "Ano final",
    timelinePlay: "Iniciar",
    timelineStop: "Parar",
    timelineCancel: "Cancelar",
    timelineSpeed: "Velocidade",
    timelineSpeedSlow: "Lenta",
    timelineSpeedNormal: "Normal",
    timelineSpeedFast: "Rápida",
    treeErrorTitle: "Árvore indisponível",
    treeErrorMessage: "Ocorreu um erro ao renderizar a árvore da família.",
    treeErrorAction: "Tentar novamente",
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
  timelineYear,
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
            isTimelineDimmed: timelineYear
              ? !isPersonInYear(person, timelineYear)
              : false,
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
    isTimelineDimmed,
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
      } ${hasWarning ? "warning" : ""} ${isMatch ? "match" : ""} ${
        isTimelineDimmed ? "timeline-dim" : ""
      }`}
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
          aria-label={copy.infoTitle}
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

class TreeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    const { hasError } = this.state;
    const { title, message, actionLabel, onRetry, children } = this.props;

    if (hasError) {
      return (
        <div className="tree-error" role="alert">
          <div className="tree-error-card">
            <div className="tree-error-title">{title}</div>
            <div className="tree-error-message">{message}</div>
            <button className="tree-error-action" type="button" onClick={onRetry}>
              {actionLabel}
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

const FlowCanvas = ({
  nodes,
  edges,
  onSelect,
  selectedId,
  onPrint,
  fitViewKey,
  onToggleWarnings,
  showWarnings,
  warningsToggleLabel,
  printLabel,
}) => {
  const { fitView, setCenter } = useReactFlow();
  const nodeTypes = useMemo(
    () => ({ person: PersonNode, marriage: MarriageNode }),
    [],
  );

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
        nodeTypes={nodeTypes}
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
        <ControlButton
          onClick={onToggleWarnings}
          title={warningsToggleLabel}
          aria-label={warningsToggleLabel}
          aria-pressed={showWarnings}
          className={`warning-toggle ${showWarnings ? "is-on" : "is-off"}`}
        >
          <FaExclamationTriangle />
        </ControlButton>
        <ControlButton onClick={handlePrint} title={printLabel} aria-label={printLabel}>
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
  const [fitViewKey, setFitViewKey] = useState(0);
  const [treeErrorKey, setTreeErrorKey] = useState(0);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineStart, setTimelineStart] = useState("");
  const [timelineEnd, setTimelineEnd] = useState("");
  const [timelineSpeed, setTimelineSpeed] = useState(900);
  const [timelineYear, setTimelineYear] = useState(null);
  const [isTimelineRunning, setIsTimelineRunning] = useState(false);
  const timelineRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const settingsModalRef = useRef(null);
  const timelineModalRef = useRef(null);
  const infoModalRef = useRef(null);

  useModalFocusTrap(isSettingsOpen, settingsModalRef);
  useModalFocusTrap(isTimelineOpen, timelineModalRef);
  useModalFocusTrap(Boolean(selectedInfo), infoModalRef);

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
        if (isSettingsOpen || isTimelineOpen || selectedInfo) {
          setIsSettingsOpen(false);
          setIsTimelineOpen(false);
          setSelectedInfo(null);
          return;
        }
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
  }, [selectedId, selectedInfo, people, isSettingsOpen, isTimelineOpen]);

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
    }
  }, [isSettingsOpen, locale, theme]);

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

  useEffect(() => {
    if (!isTimelineRunning || timelineYear === null) return;
    if (!timelineRef.current) return;
    clearInterval(timelineRef.current.intervalId);
    timelineRef.current.intervalId = setInterval(() => {
      setTimelineYear((current) => {
        if (current === null) return current;
        const next = current + 1;
        if (next > timelineRef.current.endYear) {
          setIsTimelineRunning(false);
          return timelineRef.current.endYear;
        }
        return next;
      });
    }, timelineSpeed);
    return () => clearInterval(timelineRef.current.intervalId);
  }, [isTimelineRunning, timelineYear, timelineSpeed]);

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

  const currentYear = new Date().getFullYear();
  const { minTimelineYear } = useMemo(() => {
    const years = people
      .flatMap((person) => [
        getYearFromDate(person.birth_day),
        getYearFromDate(person.death_day),
      ])
      .filter((year) => Number.isFinite(year));
    if (!years.length) {
      return { minTimelineYear: currentYear };
    }
    return { minTimelineYear: Math.min(...years) };
  }, [people, currentYear]);

  useEffect(() => {
    if (!isTimelineOpen) return;
    setTimelineStart(String(minTimelineYear));
    setTimelineEnd(String(currentYear));
  }, [isTimelineOpen, minTimelineYear, currentYear]);

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

  const parsedTimelineStart = Number.parseInt(timelineStart, 10);
  const parsedTimelineEnd = Number.parseInt(timelineEnd, 10);
  const isTimelineRangeValid =
    Number.isFinite(parsedTimelineStart) &&
    Number.isFinite(parsedTimelineEnd) &&
    parsedTimelineEnd > parsedTimelineStart;

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
        timelineYear,
      ),
    [
      people,
      selectedId,
      locale,
      warningIds,
      warningById,
      matchIds,
      showWarnings,
      timelineYear,
    ],
  );

  useEffect(() => {
    setShowWarnings(true);
  }, [people, locale]);

  const handleStopTimeline = () => {
    setIsTimelineRunning(false);
    setTimelineYear(null);
    if (timelineRef.current?.intervalId) {
      clearInterval(timelineRef.current.intervalId);
    }
  };

  const handleToggleWarnings = () => {
    setShowWarnings((prev) => {
      const next = !prev;
      localStorage.setItem("geo-family-show-warnings", next ? "true" : "false");
      return next;
    });
  };

  const handleSelect = (id) => {
    setSelectedId(id);
    setSelectedInfo(null);
  };

  const warningsToggleLabel = showWarnings
    ? copy.warningsHide
    : copy.warningsShow;

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
            className={`settings ${isTimelineRunning ? "stop" : ""}`}
            type="button"
            onClick={() => {
              if (isTimelineRunning) {
                handleStopTimeline();
              } else {
                setIsTimelineOpen(true);
              }
            }}
          >
            <FaClock />
            {isTimelineRunning ? copy.timelineStop : copy.timeline}
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
        <TreeErrorBoundary
          title={copy.treeErrorTitle}
          message={copy.treeErrorMessage}
          actionLabel={copy.treeErrorAction}
          onRetry={() => setTreeErrorKey((value) => value + 1)}
          resetKey={treeErrorKey}
        >
          <ReactFlowProvider key={treeErrorKey}>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onSelect={handleSelect}
              selectedId={selectedId}
              onPrint={() => window.print()}
              fitViewKey={fitViewKey}
              onToggleWarnings={handleToggleWarnings}
              showWarnings={showWarnings}
              warningsToggleLabel={warningsToggleLabel}
              printLabel={copy.print}
            />
          </ReactFlowProvider>
        </TreeErrorBoundary>
      </div>
      {timelineYear !== null && (
        <div className="timeline-toast" role="status" aria-live="polite" aria-atomic="true">
          {timelineYear}
        </div>
      )}
      {isSettingsOpen && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            ref={settingsModalRef}
          >
            <div className="modal-header">
              <div>
                <div className="modal-title" id="settings-modal-title">
                  {copy.modalTitle}
                </div>
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
                  localStorage.setItem("geo-family-locale", draftLocale);
                  localStorage.setItem("geo-family-theme", draftTheme);
                  setIsSettingsOpen(false);
                }}
              >
                {copy.save}
              </button>
            </div>
          </div>
        </div>
      )}
      {isTimelineOpen && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeline-modal-title"
            ref={timelineModalRef}
          >
            <div className="modal-header">
              <div>
                <div className="modal-title" id="timeline-modal-title">
                  {copy.timelineTitle}
                </div>
                <div className="modal-subtitle">{copy.timelineSubtitle}</div>
              </div>
            </div>
            <div className="modal-body">
              <label className="field">
                <span>{copy.timelineStart}</span>
                <input
                  type="number"
                  min={minTimelineYear}
                  max={currentYear}
                  value={timelineStart}
                  onChange={(event) => setTimelineStart(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{copy.timelineEnd}</span>
                <input
                  type="number"
                  min={minTimelineYear}
                  max={currentYear}
                  value={timelineEnd}
                  onChange={(event) => setTimelineEnd(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{copy.timelineSpeed}</span>
                <select
                  value={timelineSpeed}
                  onChange={(event) => setTimelineSpeed(Number(event.target.value))}
                >
                  <option value={1500}>{copy.timelineSpeedSlow}</option>
                  <option value={900}>{copy.timelineSpeedNormal}</option>
                  <option value={500}>{copy.timelineSpeedFast}</option>
                </select>
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="modal-close"
                type="button"
                onClick={() => setIsTimelineOpen(false)}
              >
                {copy.timelineCancel}
              </button>
              <button
                className="modal-save"
                type="button"
                disabled={!isTimelineRangeValid}
                onClick={() => {
                  if (!isTimelineRangeValid) return;
                  timelineRef.current = {
                    endYear: parsedTimelineEnd,
                    intervalId: timelineRef.current?.intervalId,
                  };
                  setTimelineYear(parsedTimelineStart);
                  setIsTimelineRunning(true);
                  setIsTimelineOpen(false);
                }}
              >
                {copy.timelinePlay}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedInfo && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
            ref={infoModalRef}
          >
            <div className="modal-header">
              <div className="info-header">
                <div className="modal-title" id="info-modal-title">
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
