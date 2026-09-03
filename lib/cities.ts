/**
 * Curated list of communities for the signup dropdown — no free-typed
 * typos, so the "cities" counter and per-city grouping stay clean. Grouped
 * by state/region. "Other" reveals a free-text field.
 */
export type CityGroup = { region: string; cities: string[] };

export const CITY_GROUPS: CityGroup[] = [
  { region: "New York", cities: ["Brooklyn", "Queens", "Manhattan", "Staten Island", "Bronx", "Far Rockaway", "Five Towns", "Long Island", "Monsey", "Spring Valley", "New Square", "Kiryas Joel", "Wesley Hills", "Suffern", "New Rochelle", "Riverdale", "Westchester", "Albany", "Rochester", "Buffalo", "Syracuse"] },
  { region: "New Jersey", cities: ["Lakewood", "Jackson", "Toms River", "Howell", "Passaic", "Clifton", "Teaneck", "Bergenfield", "Englewood", "Fair Lawn", "Paramus", "Edison", "Highland Park", "Elizabeth", "Deal", "Long Branch", "West Orange", "Livingston", "Morristown", "Cherry Hill", "Linden"] },
  { region: "Maryland / DC", cities: ["Baltimore", "Silver Spring", "Potomac", "Washington, DC"] },
  { region: "Pennsylvania", cities: ["Philadelphia", "Lower Merion", "Pittsburgh", "Scranton", "Harrisburg"] },
  { region: "Connecticut / Massachusetts / Rhode Island", cities: ["Waterbury", "Stamford", "New Haven", "West Hartford", "Boston", "Brookline", "Sharon", "Providence"] },
  { region: "Florida", cities: ["Miami Beach", "North Miami Beach", "Aventura", "Hollywood", "Boca Raton", "Fort Lauderdale", "Orlando", "Jacksonville", "Tampa"] },
  { region: "Georgia / Carolinas / Tennessee", cities: ["Atlanta", "Charlotte", "Memphis", "Nashville"] },
  { region: "Ohio / Michigan / Indiana", cities: ["Cleveland", "Cleveland Heights", "Beachwood", "Columbus", "Cincinnati", "Detroit", "Oak Park", "Southfield", "Indianapolis"] },
  { region: "Illinois / Wisconsin / Minnesota", cities: ["Chicago", "West Rogers Park", "Skokie", "Lincolnwood", "Milwaukee", "Minneapolis", "St. Paul"] },
  { region: "Missouri / Kansas / Colorado", cities: ["St. Louis", "Kansas City", "Denver"] },
  { region: "Texas / Arizona / Nevada", cities: ["Dallas", "Houston", "Austin", "San Antonio", "Phoenix", "Scottsdale", "Las Vegas"] },
  { region: "California", cities: ["Los Angeles", "Pico-Robertson", "Hancock Park", "Valley Village", "Beverly Hills", "Irvine", "San Diego", "San Francisco", "Palo Alto", "Oakland", "Sacramento"] },
  { region: "Pacific Northwest", cities: ["Seattle", "Portland"] },
  { region: "Canada", cities: ["Toronto", "Thornhill", "Montreal", "Ottawa", "Vancouver", "Winnipeg", "Calgary"] },
  { region: "Israel", cities: ["Yerushalayim", "Ramat Beit Shemesh", "Beit Shemesh", "Bnei Brak", "Tel Aviv", "Modiin", "Ramat Gan", "Petach Tikva", "Haifa", "Tzfas", "Netanya", "Efrat", "Kiryat Sefer", "Beitar Illit"] },
  { region: "United Kingdom / Europe", cities: ["London", "Manchester", "Gateshead", "Antwerp", "Paris", "Zurich", "Amsterdam"] },
  { region: "Australia / South Africa / Latin America", cities: ["Melbourne", "Sydney", "Johannesburg", "Cape Town", "Mexico City", "Buenos Aires", "São Paulo", "Panama City"] },
];

export const ALL_CITIES = new Set(CITY_GROUPS.flatMap((g) => g.cities));

export function regionOf(city: string): string | null {
  return CITY_GROUPS.find((g) => g.cities.includes(city))?.region ?? null;
}
