import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Menu,
  Search,
  Settings,
  Star,
  Trophy,
  UsersRound,
  X,
  ArrowRight,
  Radio,
  Newspaper,
  Shuffle,
  Tv,
  UserRound,
  CircleHelp,
  Bug,
  FlaskConical,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import "./styles.css";
import { enablePushNotifications } from "./push";

type Status = "live" | "upcoming" | "finished";
type PanelKey = "Compétitions" | "Équipes" | "Joueurs" | "Transferts" | "Trouver un match" | "Télévisé" | "Paramètres" | "À propos" | "Rapport d’incidence" | "Bêta testeur";
type ScreenState = "launching" | "loading" | "analyzing" | "ready" | "error" | "offline";
type Match = {
  id: number;
  competition: string;
  region: string;
  phase: string;
  home: string;
  away: string;
  homeShort: string;
  awayShort: string;
  homeColor: string;
  awayColor: string;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
  kickoff?: string;
  status: Status;
  event?: string;
  favorite?: boolean;
};

const matches: Match[] = [
  { id: 1, competition: "Ligue 1", region: "France", phase: "Journée 25", home: "Paris Saint-Germain", away: "Olympique de Marseille", homeShort: "PSG", awayShort: "OM", homeColor: "#2d75d6", awayColor: "#1b55a0", homeScore: 2, awayScore: 1, minute: "67’", status: "live", event: "But · 64’", favorite: true },
  { id: 2, competition: "Premier League", region: "Angleterre", phase: "Journée 28", home: "Manchester City", away: "Arsenal", homeShort: "MCI", awayShort: "ARS", homeColor: "#70b8ed", awayColor: "#d93a42", homeScore: 1, awayScore: 1, minute: "82’", status: "live", event: "Carton jaune · 79’" },
  { id: 3, competition: "Ligue des champions", region: "Europe", phase: "Huitièmes · Aller", home: "Real Madrid", away: "Bayern Munich", homeShort: "RMA", awayShort: "FCB", homeColor: "#d9b236", awayColor: "#d43e54", kickoff: "21:00", status: "upcoming" },
  { id: 4, competition: "Liga", region: "Espagne", phase: "Journée 29", home: "FC Barcelona", away: "Villarreal", homeShort: "BAR", awayShort: "VIL", homeColor: "#a52844", awayColor: "#f0c532", homeScore: 3, awayScore: 2, status: "finished", event: "Terminé" },
  { id: 5, competition: "Ligue 1", region: "France", phase: "Journée 25", home: "Lyon", away: "Lille", homeShort: "OL", awayShort: "LIL", homeColor: "#3154a0", awayColor: "#d33a44", kickoff: "22:00", status: "upcoming" },
];

const teams = ["Paris Saint-Germain", "Real Madrid", "FC Barcelona", "Arsenal", "Liverpool", "Manchester City", "Bayern Munich", "Olympique de Marseille", "Chelsea"];

const teamLogoIds: Record<string, number> = {
  "Paris Saint-Germain": 85,
  "Olympique de Marseille": 81,
  "Manchester City": 50,
  Arsenal: 42,
  "Real Madrid": 541,
  "Bayern Munich": 157,
  "FC Barcelona": 529,
  Villarreal: 533,
  Lyon: 80,
  Lille: 79,
  Liverpool: 40,
  Chelsea: 49,
};

function TeamMark({ short, color, name, className = "team-mark" }: { short: string; color: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const logoId = teamLogoIds[name];
  return <span className={className} style={{ background: color }}>
    {logoId && !failed ? <img src={`/team-logos/${logoId}.png`} alt={`${name} écusson`} loading="lazy" onError={() => setFailed(true)} /> : <span>{short.slice(0, 3)}</span>}
  </span>;
}

function LoadingScreen({ state, onRetry }: { state: Exclude<ScreenState, "ready">; onRetry: () => void }) {
  const copy = {
    launching: { title: "Lancement de ScoreMatch", text: "Préparation de votre espace de scores…", icon: Sparkles },
    loading: { title: "Chargement des matchs", text: "Récupération des compétitions et des rencontres…", icon: LoaderCircle },
    analyzing: { title: "Analyse des matchs", text: "Vérification des scores, événements et fraîcheur des données…", icon: CheckCircle2 },
    error: { title: "Impossible de charger les scores", text: "Le service ne répond pas pour le moment. Vos données locales restent disponibles.", icon: AlertTriangle },
    offline: { title: "Vous êtes hors connexion", text: "Nous affichons la dernière version disponible et réessaierons automatiquement.", icon: WifiOff },
  }[state];
  const Icon = copy.icon;
  return <main className={`state-screen state-${state}`} role="status" aria-live="polite">
    <div className="state-glow" aria-hidden="true" />
    <img className="state-logo" src="/scorematch-logo.svg" alt="ScoreMatch" />
    <div className="state-icon"><Icon size={25} className={state === "loading" || state === "launching" ? "spin" : ""} /></div>
    <p className="state-kicker">{state === "launching" ? "BIENVENUE" : state === "analyzing" ? "MISE À JOUR INTELLIGENTE" : "SCORES EN DIRECT"}</p>
    <h1>{copy.title}</h1>
    <p>{copy.text}</p>
    {(state === "error" || state === "offline") && <button className="primary-button" onClick={onRetry}><RefreshCw size={16} /> Réessayer</button>}
    <div className="state-progress" aria-hidden="true"><span className="state-progress-fill" /></div>
  </main>;
}

function StatusBadge({ status, minute }: { status: Status; minute?: string }) {
  const copy = status === "live" ? `EN DIRECT${minute ? ` · ${minute}` : ""}` : status === "upcoming" ? "À VENIR" : "TERMINÉ";
  return <span className={`status-badge status-${status}`}><span className="status-dot" aria-hidden="true" />{copy}</span>;
}

function MatchCard({ match, onFavorite, onOpen }: { match: Match; onFavorite: (id: number) => void; onOpen: (match: Match) => void }) {
  return (
    <article className={`match-card ${match.status === "live" ? "match-live" : ""}`}>
      <button className="match-main" onClick={() => onOpen(match)} aria-label={`Ouvrir le match ${match.home} contre ${match.away}`}>
        <div className="match-context"><span>{match.competition}</span><span className="context-separator">·</span><span>{match.region} · {match.phase}</span></div>
        <div className="match-body">
          <div className="teams">
            <div className="team-row"><TeamMark short={match.homeShort} color={match.homeColor} name={match.home} /><span>{match.home}</span></div>
            <div className="team-row"><TeamMark short={match.awayShort} color={match.awayColor} name={match.away} /><span>{match.away}</span></div>
          </div>
          <div className="match-score">
            <StatusBadge status={match.status} minute={match.minute} />
            <strong>{match.status === "upcoming" ? match.kickoff : `${match.homeScore} : ${match.awayScore}`}</strong>
            {match.event && <small>{match.event}</small>}
          </div>
        </div>
      </button>
      <button className={`icon-button card-favorite ${match.favorite ? "is-favorite" : ""}`} onClick={() => onFavorite(match.id)} aria-label={match.favorite ? `Retirer ${match.home} - ${match.away} des favoris` : `Ajouter ${match.home} - ${match.away} aux favoris`} aria-pressed={match.favorite}>
        <Star size={19} fill={match.favorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}

function DateStrip({ selected, onSelect, onPrevious, onNext, onOpenCalendar }: { selected: string; onSelect: (value: string) => void; onPrevious: () => void; onNext: () => void; onOpenCalendar: () => void }) {
  const dates = ["Jeu. 17", "Hier", "Aujourd’hui", "En direct (2)", "Demain"];
  return <div className="date-area">
    <button className="round-control" aria-label="Dates précédentes" onClick={onPrevious}><ChevronLeft size={18} /></button>
    <nav className="date-strip" aria-label="Navigation par date">{dates.map((date) => <button key={date} className={selected === date ? "date-item active" : "date-item"} onClick={() => onSelect(date)}>{date}</button>)}</nav>
    <button className="round-control" aria-label="Dates suivantes" onClick={onNext}><ChevronRight size={18} /></button>
    <button className="calendar-button" onClick={onOpenCalendar} aria-label="Choisir une date"><CalendarDays size={17} /></button>
  </div>;
}

function Drawer({ onClose, onNavigate }: { onClose: () => void; onNavigate: (value: string) => void }) {
  const items = [
    ["Compétitions", Trophy], ["Équipes", UsersRound], ["Joueurs", UserRound], ["Transferts", Shuffle], ["Trouver un match", Search], ["Télévisé", Tv],
  ] as const;
  return <div className="drawer-backdrop" onClick={onClose}>
    <aside className="drawer" onClick={(event) => event.stopPropagation()}>
      <div className="drawer-header"><div className="avatar-large"><UserRound size={23} /></div><div><strong>Connexion ou inscription</strong><span>Synchronisez vos favoris</span></div><button className="icon-button" onClick={onClose} aria-label="Fermer le menu"><X size={21} /></button></div>
      <nav className="drawer-nav">{items.map(([label, Icon]) => <button key={label} onClick={() => onNavigate(label)}><Icon size={21} /><span>{label}</span></button>)}</nav>
      <div className="drawer-divider" /><p className="drawer-section-title">Plus</p>
      <nav className="drawer-nav secondary"><button onClick={() => onNavigate("Paramètres")}><Settings size={21} /><span>Paramètres</span></button><button onClick={() => onNavigate("À propos")}><CircleHelp size={21} /><span>À propos</span></button><button onClick={() => onNavigate("Rapport d’incidence")}><Bug size={21} /><span>Rapport d’incidence</span></button><button onClick={() => onNavigate("Bêta testeur")}><FlaskConical size={21} /><span>Bêta testeur</span></button></nav>
    </aside>
  </div>;
}

function CalendarModal({ onClose }: { onClose: () => void }) {
  const [selectedDay, setSelectedDay] = useState(8);
  const [month, setMonth] = useState(2);
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  return <div className="modal-backdrop" onClick={onClose}><section className="calendar-modal" onClick={(event) => event.stopPropagation()}>
    <div className="calendar-hero"><span>SÉLECTIONNER LA DATE</span><strong>{selectedDay} {months[month]} 2025</strong></div>
    <div className="calendar-content"><div className="calendar-month"><button aria-label="Mois précédent" onClick={() => setMonth((current) => Math.max(0, current - 1))}><ChevronLeft size={19} /></button><strong>{months[month]} 2025</strong><button aria-label="Mois suivant" onClick={() => setMonth((current) => Math.min(months.length - 1, current + 1))}><ChevronRight size={19} /></button></div><div className="weekdays">{["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-days">{Array.from({ length: 31 }, (_, index) => <button key={index} className={index + 1 === selectedDay ? "selected" : ""} onClick={() => setSelectedDay(index + 1)} aria-label={`Sélectionner le ${index + 1} ${months[month]}`}>{index + 1}</button>)}</div><div className="calendar-actions"><button onClick={onClose}>Annuler</button><button className="primary-text" onClick={onClose}>Confirmer la date</button></div></div>
  </section></div>;
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(["Paris Saint-Germain"]);
  const filtered = teams.filter((team) => team.toLowerCase().includes(query.toLowerCase()));
  return <div className="onboarding"><div className="onboarding-top"><img className="onboarding-logo" src="/scorematch-logo.svg" alt="ScoreMatch" /><button onClick={onDone}>Passer</button></div><div className="onboarding-intro"><Sparkles size={22} /><h1>Choisissez vos équipes préférées</h1><p>Retrouvez leurs scores et leurs prochains matchs au même endroit.</p></div><div className="team-search"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une équipe" aria-label="Rechercher une équipe" /></div><div className="team-grid">{filtered.map((team, index) => { const isSelected = selected.includes(team); return <button className={`team-choice ${isSelected ? "selected" : ""}`} key={team} onClick={() => setSelected(isSelected ? selected.filter((item) => item !== team) : [...selected, team])}><TeamMark short={team.slice(0, 3)} color={["#228b57", "#c82c42", "#d7ad27", "#3154a0"][index % 4]} name={team} className="team-choice-logo" /><span>{team}</span>{isSelected && <span className="choice-check">✓</span>}</button>; })}</div><div className="onboarding-footer"><div className="progress-dots"><span className="active" /><span /><span /></div><button className="onboarding-next" onClick={onDone} aria-label="Terminer la personnalisation"><ArrowRight size={23} /></button></div></div>;
}

function PanelView({ panel, onBack, onNotify }: { panel: PanelKey; onBack: () => void; onNotify: (message: string) => void }) {
  const [search, setSearch] = useState("");
  const [report, setReport] = useState("");
  const panelCopy: Record<PanelKey, { title: string; subtitle: string }> = {
    "Compétitions": { title: "Compétitions", subtitle: "Explorez les compétitions suivies par ScoreMatch." },
    "Équipes": { title: "Équipes", subtitle: "Suivez les équipes dont vous voulez recevoir les scores." },
    "Joueurs": { title: "Joueurs", subtitle: "Retrouvez les joueurs associés aux matchs du jour." },
    "Transferts": { title: "Transferts", subtitle: "Les dernières actualités de mercato seront synchronisées ici." },
    "Trouver un match": { title: "Trouver un match", subtitle: "Recherchez une équipe, une compétition ou une rencontre." },
    "Télévisé": { title: "Matchs télévisés", subtitle: "Identifiez rapidement les rencontres diffusées aujourd’hui." },
    "Paramètres": { title: "Paramètres", subtitle: "Personnalisez vos alertes et votre expérience ScoreMatch." },
    "À propos": { title: "À propos de ScoreMatch", subtitle: "Une expérience claire pour suivre les scores de football." },
    "Rapport d’incidence": { title: "Rapporter une incidence", subtitle: "Aidez-nous à corriger une donnée ou un problème d’interface." },
    "Bêta testeur": { title: "Programme bêta", subtitle: "Testez les nouvelles fonctionnalités avant leur publication." },
  };
  const icons = { "Compétitions": Trophy, "Équipes": UsersRound, "Joueurs": UserRound, "Transferts": Shuffle, "Trouver un match": Search, "Télévisé": Tv, "Paramètres": Settings, "À propos": CircleHelp, "Rapport d’incidence": Bug, "Bêta testeur": FlaskConical };
  const Icon = icons[panel];
  const competitions = ["Ligue 1", "Premier League", "Liga", "Ligue des champions"];
  const players = ["Ousmane Dembélé", "Erling Haaland", "Kylian Mbappé", "Harry Kane"];
  const searchMatches = matches.filter((match) => `${match.home} ${match.away} ${match.competition}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="panel-view">
    <button className="panel-back" onClick={onBack}><ChevronLeft size={17} /> Retour aux matchs</button>
    <div className="panel-heading"><span className="panel-heading-icon"><Icon size={22} /></span><div><p className="eyebrow">ESPACE SCOREMATCH</p><h1>{panelCopy[panel].title}</h1><p>{panelCopy[panel].subtitle}</p></div></div>
    {panel === "Compétitions" && <div className="panel-grid">{competitions.map((item) => <button className="panel-card" key={item} onClick={() => onNotify(`${item} sélectionnée`)}><Trophy size={20} /><strong>{item}</strong><span>Voir les matchs et classements</span><ArrowRight size={16} /></button>)}</div>}
    {panel === "Équipes" && <div className="panel-grid">{teams.map((team) => <button className="panel-card panel-team-card" key={team} onClick={() => onNotify(`${team} ajoutée à vos favoris`)}><TeamMark short={team.slice(0, 3)} color="#238946" name={team} className="team-mark" /><span><strong>{team}</strong><small>Suivre les scores</small></span><Star size={17} /></button>)}</div>}
    {panel === "Joueurs" && <div className="panel-grid">{players.map((player) => <div className="panel-card panel-static-card" key={player}><UserRound size={20} /><span><strong>{player}</strong><small>Statistiques et matchs récents</small></span></div>)}</div>}
    {panel === "Trouver un match" && <div className="panel-search"><label className="search-field"><Search size={17} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une équipe ou un match" aria-label="Rechercher une équipe ou un match" /></label><div className="panel-results">{searchMatches.map((match) => <button className="panel-result" key={match.id} onClick={() => onNotify(`${match.home} – ${match.away} sélectionné`)}><span>{match.home} – {match.away}</span><small>{match.competition}</small><ArrowRight size={16} /></button>)}</div></div>}
    {panel === "Télévisé" && <div className="panel-grid">{matches.slice(0, 3).map((match) => <button className="panel-card" key={match.id} onClick={() => onNotify(`${match.home} – ${match.away} ouvert`)}><Tv size={20} /><span><strong>{match.home} – {match.away}</strong><small>Canal à confirmer · {match.kickoff ?? "En direct"}</small></span><ArrowRight size={16} /></button>)}</div>}
    {panel === "Transferts" && <div className="panel-empty"><Shuffle size={28} /><h2>Les transferts arrivent bientôt</h2><p>Cette vue est prête à recevoir les données du fournisseur sportif.</p><button className="primary-button" onClick={() => onNotify("Synchronisation des transferts demandée")}>Demander une synchronisation</button></div>}
    {panel === "Paramètres" && <div className="settings-list"><label><span><strong>Alertes de buts</strong><small>Recevoir une notification pour les équipes suivies</small></span><input type="checkbox" defaultChecked /></label><label><span><strong>Actualisation automatique</strong><small>Actualiser les scores en direct</small></span><input type="checkbox" defaultChecked /></label><button className="primary-button" onClick={() => onNotify("Paramètres enregistrés")}>Enregistrer les paramètres</button></div>}
    {panel === "À propos" && <div className="panel-empty"><img className="panel-logo" src="/scorematch-logo.svg" alt="ScoreMatch" /><h2>ScoreMatch</h2><p>Version 0.1 · Une PWA de scores conçue pour retrouver les matchs importants en quelques secondes.</p></div>}
    {panel === "Rapport d’incidence" && <form className="report-form" onSubmit={(event) => { event.preventDefault(); onNotify(report.trim() ? "Merci, votre rapport a été enregistré" : "Décrivez l’incidence avant d’envoyer le rapport"); if (report.trim()) setReport(""); }}><label htmlFor="incident">Décrivez le problème</label><textarea id="incident" value={report} onChange={(event) => setReport(event.target.value)} placeholder="Ex. score incorrect, écusson absent, bouton inactif…" /><button className="primary-button" type="submit">Envoyer le rapport</button></form>}
    {panel === "Bêta testeur" && <div className="panel-empty"><FlaskConical size={30} /><h2>Rejoindre la bêta</h2><p>Recevez les nouvelles vues et partagez vos retours avant la mise en production.</p><button className="primary-button" onClick={() => onNotify("Votre demande de bêta a été enregistrée")}>Rejoindre le programme</button></div>}
  </section>;
}

function App() {
  const [view, setView] = useState("matches");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [selectedDate, setSelectedDate] = useState("Aujourd’hui");
  const [filter, setFilter] = useState("Tous");
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [notification, setNotification] = useState(" ");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([1]);
  const [screenState, setScreenState] = useState<ScreenState>("launching");

  useEffect(() => {
    const forcedState = new URLSearchParams(window.location.search).get("state") as ScreenState | null;
    if (forcedState && forcedState !== "ready") { setScreenState(forcedState); return; }
    const go = (next: ScreenState, delay: number) => window.setTimeout(() => setScreenState(next), delay);
    if (!navigator.onLine) setScreenState("offline");
    const timers = [go("loading", 650), go("analyzing", 1450), go("ready", 2350)];
    const onOffline = () => setScreenState("offline");
    const onOnline = () => { setScreenState("analyzing"); window.setTimeout(() => setScreenState("ready"), 900); };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => { timers.forEach(window.clearTimeout); window.removeEventListener("offline", onOffline); window.removeEventListener("online", onOnline); };
  }, []);

  function retryLoad() {
    setScreenState("loading");
    window.setTimeout(() => setScreenState("analyzing"), 550);
    window.setTimeout(() => setScreenState(navigator.onLine ? "ready" : "offline"), 1450);
  }

  function refreshScores() {
    setScreenState("analyzing");
    window.setTimeout(() => setScreenState(navigator.onLine ? "ready" : "offline"), 900);
  }

  function focusSearch() {
    document.querySelector<HTMLInputElement>(".search-field input")?.focus();
  }

  function shiftDate(direction: -1 | 1) {
    const dates = ["Jeu. 17", "Hier", "Aujourd’hui", "En direct (2)", "Demain"];
    const current = Math.max(0, dates.indexOf(selectedDate));
    setSelectedDate(dates[Math.min(dates.length - 1, Math.max(0, current + direction))]);
  }

  const visibleMatches = useMemo(() => matches.filter((match) => {
    const matchFilter = filter === "Tous" || (filter === "En direct" && match.status === "live") || (filter === "À venir" && match.status === "upcoming") || (filter === "Terminés" && match.status === "finished");
    const searchFilter = `${match.home} ${match.away} ${match.competition}`.toLowerCase().includes(query.toLowerCase());
    const favoriteFilter = view === "favorites" ? favoriteIds.includes(match.id) : true;
    return matchFilter && searchFilter && favoriteFilter;
  }), [filter, query, view, favoriteIds]);

  function toggleFavorite(id: number) {
    const match = matches.find((item) => item.id === id);
    setFavoriteIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setNotification(current => current.trim() ? "" : `${favoriteIds.includes(id) ? "Retiré des" : "Ajouté aux"} favoris · ${match?.home} – ${match?.away}`);
    window.setTimeout(() => setNotification(""), 2600);
  }

  function openMatch(match: Match) { setNotification(`${match.home} – ${match.away} · ouverture du centre de match`); window.setTimeout(() => setNotification(""), 2200); }

  async function handleNotifications() {
    const result = await enablePushNotifications();
    const messages = {
      unsupported: "Les notifications push ne sont pas disponibles sur ce navigateur",
      "permission-denied": "Autorisation refusée · activez les notifications dans les réglages",
      "missing-vapid-key": "Configuration push manquante · ajoutez VITE_VAPID_PUBLIC_KEY",
      failed: "Impossible d’enregistrer cet appareil pour le moment",
    } as const;
    setNotification(result.ok ? "Notifications activées · vous recevrez les buts" : messages[result.reason]);
    window.setTimeout(() => setNotification(""), 3200);
  }

  if (screenState !== "ready") return <LoadingScreen state={screenState} onRetry={retryLoad} />;
  if (onboarding) return <Onboarding onDone={() => setOnboarding(false)} />;
  if (activePanel) return <div className={dark ? "app dark" : "app"}><main className="page-shell"><PanelView panel={activePanel} onBack={() => setActivePanel(null)} onNotify={(message) => { setNotification(message); window.setTimeout(() => setNotification(""), 2600); }} /></main>{notification.trim() && <div className="toast" role="status"><Sparkles size={16} />{notification}</div>}</div>;

  return <div className={dark ? "app dark" : "app"}>
    <header className="topbar"><div className="topbar-inner"><button className="mobile-menu icon-button" onClick={() => setDrawerOpen(true)} aria-label="Ouvrir le menu"><Menu size={30} /></button><button className="brand" onClick={() => setView("matches")}><img className="brand-logo" src="/scorematch-logo.svg" alt="ScoreMatch" /></button><nav className="desktop-nav"><button className={view === "matches" ? "active" : ""} onClick={() => setView("matches")}>Matchs</button><button className={view === "favorites" ? "active" : ""} onClick={() => setView("favorites")}>Favoris</button><button onClick={() => setOnboarding(true)}>Équipes</button></nav><div className="topbar-actions"><button className="icon-button header-calendar" aria-label="Choisir une date" onClick={() => setCalendarOpen(true)}><CalendarDays size={28} /></button><button className="icon-button header-search" aria-label="Rechercher une équipe" onClick={focusSearch}><Search size={30} /></button><button className="icon-button header-secondary" aria-label="Actualiser les scores" onClick={refreshScores}><Radio size={19} /></button><button className="icon-button header-secondary" aria-label="Activer les notifications pour les buts" onClick={handleNotifications}><Bell size={19} /></button><button className="profile-button header-secondary" onClick={() => setOnboarding(true)}>CM</button></div></div><DateStrip selected={selectedDate} onSelect={setSelectedDate} onPrevious={() => shiftDate(-1)} onNext={() => shiftDate(1)} onOpenCalendar={() => setCalendarOpen(true)} /></header>
    <main className="page-shell"><section className="hero-row"><div><p className="eyebrow"><span className="live-pulse" /> Scores en direct</p><h1>{view === "favorites" ? "Vos favoris" : "Les matchs d’aujourd’hui"}</h1><p className="hero-subtitle">{view === "favorites" ? "Retrouvez les équipes et matchs que vous suivez." : "2 matchs en direct · 3 rencontres à suivre"}</p></div><div className="freshness"><Clock3 size={15} /><span>Mis à jour il y a 12 s</span><button onClick={() => setDark(!dark)}>{dark ? "Clair" : "Sombre"}</button></div></section>
      <section className="date-panel"><div className="filters-row"><div className="filter-tabs">{["Tous", "En direct", "À venir", "Terminés"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une équipe" aria-label="Rechercher dans les matchs" /></label></div></section>
      <section className="live-strip"><div><Radio size={17} /><strong>En direct maintenant</strong></div><span>Suivez les moments clés en temps réel</span><button onClick={() => setFilter("En direct")}>Voir les 2 matchs <ArrowRight size={15} /></button></section>
      {visibleMatches.length === 0 ? <div className="empty-state"><Star size={27} /><h2>Aucun match dans cette sélection</h2><p>Modifiez vos filtres ou ajoutez une équipe à vos favoris.</p><button className="primary-button" onClick={() => { setFilter("Tous"); setQuery(""); }}>Voir tous les matchs</button></div> : <div className="competition-list">{Array.from(new Set(visibleMatches.map((match) => match.competition))).map((competition) => <section className="competition-group" key={competition}><div className="competition-heading"><div><span className="competition-code">{competition.slice(0, 2).toUpperCase()}</span><div><h2>{competition}</h2><p>{visibleMatches.filter((item) => item.competition === competition)[0].region} · {visibleMatches.filter((item) => item.competition === competition).length} match{visibleMatches.filter((item) => item.competition === competition).length > 1 ? "s" : ""}</p></div></div><button aria-label={`Options ${competition}`} className="more-button" onClick={() => setNotification(`${competition} · options disponibles prochainement`)}>···</button></div>{visibleMatches.filter((match) => match.competition === competition).map((match) => <MatchCard key={match.id} match={{ ...match, favorite: favoriteIds.includes(match.id) }} onFavorite={toggleFavorite} onOpen={openMatch} />)}</section>)}</div>}
    </main>
    <nav className="bottom-nav"><button className={view === "matches" ? "active" : ""} onClick={() => setView("matches")}><Radio size={20} /><span>Matchs</span></button><button className={view === "favorites" ? "active" : ""} onClick={() => setView("favorites")}><Star size={20} /><span>Favoris</span></button><button onClick={() => setOnboarding(true)}><Search size={20} /><span>Explorer</span></button><button onClick={() => setNotification("Les transferts arrivent bientôt")}><Shuffle size={20} /><span>Transferts</span></button><button onClick={() => setNotification("Les actualités arrivent bientôt")}><Newspaper size={20} /><span>Infos</span></button></nav>
    {drawerOpen && <Drawer onClose={() => setDrawerOpen(false)} onNavigate={(value) => { setDrawerOpen(false); setActivePanel(value as PanelKey); }} />}
    {calendarOpen && <CalendarModal onClose={() => setCalendarOpen(false)} />}
    {notification.trim() && <div className="toast" role="status"><Sparkles size={16} />{notification}</div>}
  </div>;
}

function StarIcon({ className, ...props }: { className?: string; "aria-hidden"?: boolean }) { return <Star className={className} {...props} />; }

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));

import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")!).render(<App />);
