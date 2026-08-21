export type CompetitionConfig = {
  key: string;
  name: string;
  country: string;
  footballDataCode: string;
  apiFootballId: number;
};

/**
 * Catalogue de départ. Les noms et identifiants de fournisseur sont conservés
 * séparément afin d’éviter de déduire une compétition depuis son libellé.
 */
export const TOP_COMPETITIONS: CompetitionConfig[] = [
  { key: "premier-league", name: "Premier League", country: "Angleterre", footballDataCode: "PL", apiFootballId: 39 },
  { key: "la-liga", name: "La Liga", country: "Espagne", footballDataCode: "PD", apiFootballId: 140 },
  { key: "serie-a", name: "Serie A", country: "Italie", footballDataCode: "SA", apiFootballId: 135 },
  { key: "bundesliga", name: "Bundesliga", country: "Allemagne", footballDataCode: "BL1", apiFootballId: 78 },
  { key: "ligue-1", name: "Ligue 1", country: "France", footballDataCode: "FL1", apiFootballId: 61 },
  { key: "champions-league", name: "Ligue des champions", country: "Europe", footballDataCode: "CL", apiFootballId: 2 },
  { key: "europa-league", name: "Ligue Europa", country: "Europe", footballDataCode: "EL", apiFootballId: 3 },
  { key: "brasileirao", name: "Brasileirão Série A", country: "Brésil", footballDataCode: "BSA", apiFootballId: 71 },
];

export function findCompetition(key: string) {
  return TOP_COMPETITIONS.find((competition) => competition.key === key || competition.footballDataCode === key || String(competition.apiFootballId) === key);
}
