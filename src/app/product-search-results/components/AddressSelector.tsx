'use client';
import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Navigation, Clock, Trash2, X } from 'lucide-react';

interface Address {
  country: string;
  state: string;
  suburb: string;
  full: string;
}

interface AddressSelectorProps {
  value: Address;
  onChange: (a: Address) => void;
}

const LOCATION_HISTORY_KEY = 'shopradar_location_history';
const MAX_LOCATION_HISTORY = 8;

function loadLocationHistory(): Address[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOCATION_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocationHistory(history: Address[]) {
  localStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(history));
}

function addressLabel(a: Address): string {
  const parts = [a.suburb, a.state, a.country].filter(Boolean);
  return parts.join(', ');
}

const countryData: Record<string, Record<string, string[]>> = {
  'Afghanistan': { 'Kabul': ['Kabul', 'Karte Seh', 'Wazir Akbar Khan'], 'Herat': ['Herat', 'Guzara', 'Injil'], 'Kandahar': ['Kandahar', 'Dand', 'Panjwai'] },
  'Albania': { 'Tirana': ['Tirana', 'Kamëz', 'Kashar'], 'Durrës': ['Durrës', 'Shijak', 'Sukth'], 'Vlorë': ['Vlorë', 'Orikum', 'Sazan'] },
  'Algeria': { 'Algiers': ['Algiers', 'Bab El Oued', 'Hussein Dey'], 'Oran': ['Oran', 'Es Senia', 'Bir El Djir'], 'Constantine': ['Constantine', 'El Khroub', 'Ain Smara'] },
  'Argentina': { 'Buenos Aires': ['Buenos Aires', 'La Plata', 'Mar del Plata'], 'Córdoba': ['Córdoba', 'Villa Carlos Paz', 'Río Cuarto'], 'Santa Fe': ['Rosario', 'Santa Fe', 'Rafaela'] },
  'Australia': {
    'New South Wales': ['Sydney', 'Newcastle', 'Wollongong', 'Canberra', 'Albury'],
    'Victoria': ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton'],
    'Queensland': ['Brisbane', 'Gold Coast', 'Cairns', 'Townsville', 'Sunshine Coast'],
    'Western Australia': ['Perth', 'Fremantle', 'Bunbury', 'Geraldton', 'Kalgoorlie'],
    'South Australia': ['Adelaide', 'Mount Gambier', 'Whyalla', 'Port Augusta', 'Port Pirie'],
    'Tasmania': ['Hobart', 'Launceston', 'Devonport', 'Burnie', 'Ulverstone'],
    'Northern Territory': ['Darwin', 'Alice Springs', 'Palmerston', 'Katherine', 'Nhulunbuy'],
    'Australian Capital Territory': ['Canberra', 'Belconnen', 'Tuggeranong', 'Gungahlin', 'Woden'],
  },
  'Austria': { 'Vienna': ['Vienna', 'Floridsdorf', 'Donaustadt'], 'Styria': ['Graz', 'Leoben', 'Kapfenberg'], 'Upper Austria': ['Linz', 'Wels', 'Steyr'] },
  'Bangladesh': { 'Dhaka': ['Dhaka', 'Narayanganj', 'Gazipur'], 'Chittagong': ['Chittagong', 'Comilla', 'Cox\'s Bazar'], 'Rajshahi': ['Rajshahi', 'Bogura', 'Pabna'] },
  'Belgium': { 'Brussels': ['Brussels', 'Ixelles', 'Schaerbeek'], 'Antwerp': ['Antwerp', 'Ghent', 'Bruges'], 'Liège': ['Liège', 'Namur', 'Charleroi'] },
  'Bolivia': { 'La Paz': ['La Paz', 'El Alto', 'Viacha'], 'Santa Cruz': ['Santa Cruz', 'Montero', 'Warnes'], 'Cochabamba': ['Cochabamba', 'Quillacollo', 'Sacaba'] },
  'Brazil': { 'São Paulo': ['São Paulo', 'Campinas', 'Santos'], 'Rio de Janeiro': ['Rio de Janeiro', 'Niterói', 'Nova Iguaçu'], 'Minas Gerais': ['Belo Horizonte', 'Uberlândia', 'Contagem'], 'Bahia': ['Salvador', 'Feira de Santana', 'Vitória da Conquista'] },
  'Cambodia': { 'Phnom Penh': ['Phnom Penh', 'Tuol Kork', 'Chamkar Mon'], 'Siem Reap': ['Siem Reap', 'Angkor', 'Svay Leu'], 'Battambang': ['Battambang', 'Banan', 'Sangker'] },
  'Canada': {
    'Ontario': ['Toronto', 'Ottawa', 'Hamilton', 'London', 'Windsor'],
    'British Columbia': ['Vancouver', 'Victoria', 'Kelowna', 'Abbotsford', 'Nanaimo'],
    'Quebec': ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil'],
    'Alberta': ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat'],
    'Manitoba': ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson', 'Portage la Prairie'],
    'Saskatchewan': ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Swift Current'],
    'Nova Scotia': ['Halifax', 'Dartmouth', 'Sydney', 'Truro', 'New Glasgow'],
    'New Brunswick': ['Moncton', 'Saint John', 'Fredericton', 'Miramichi', 'Bathurst'],
  },
  'Chile': { 'Santiago': ['Santiago', 'Puente Alto', 'Maipú'], 'Valparaíso': ['Valparaíso', 'Viña del Mar', 'Quilpué'], 'Biobío': ['Concepción', 'Talcahuano', 'Chillán'] },
  'China': { 'Beijing': ['Beijing', 'Haidian', 'Chaoyang'], 'Shanghai': ['Shanghai', 'Pudong', 'Huangpu'], 'Guangdong': ['Guangzhou', 'Shenzhen', 'Dongguan'], 'Sichuan': ['Chengdu', 'Mianyang', 'Deyang'] },
  'Colombia': { 'Bogotá': ['Bogotá', 'Soacha', 'Chía'], 'Antioquia': ['Medellín', 'Bello', 'Itagüí'], 'Valle del Cauca': ['Cali', 'Buenaventura', 'Palmira'] },
  'Croatia': { 'Zagreb': ['Zagreb', 'Sesvete', 'Velika Gorica'], 'Split-Dalmatia': ['Split', 'Solin', 'Kaštela'], 'Rijeka': ['Rijeka', 'Opatija', 'Kastav'] },
  'Czech Republic': { 'Prague': ['Prague', 'Brno', 'Ostrava'], 'South Moravian': ['Brno', 'Znojmo', 'Hodonín'], 'Moravian-Silesian': ['Ostrava', 'Havířov', 'Karviná'] },
  'Denmark': { 'Capital Region': ['Copenhagen', 'Frederiksberg', 'Gentofte'], 'Central Denmark': ['Aarhus', 'Viborg', 'Silkeborg'], 'Southern Denmark': ['Odense', 'Esbjerg', 'Kolding'] },
  'Ecuador': { 'Pichincha': ['Quito', 'Cayambe', 'Rumiñahui'], 'Guayas': ['Guayaquil', 'Samborondón', 'Durán'], 'Azuay': ['Cuenca', 'Gualaceo', 'Paute'] },
  'Egypt': { 'Cairo': ['Cairo', 'Giza', 'Heliopolis'], 'Alexandria': ['Alexandria', 'Borg El Arab', 'Abu Qir'], 'Aswan': ['Aswan', 'Edfu', 'Kom Ombo'] },
  'Ethiopia': { 'Addis Ababa': ['Addis Ababa', 'Bole', 'Kirkos'], 'Oromia': ['Adama', 'Jimma', 'Dire Dawa'], 'Amhara': ['Bahir Dar', 'Gondar', 'Dessie'] },
  'Finland': { 'Uusimaa': ['Helsinki', 'Espoo', 'Vantaa'], 'Pirkanmaa': ['Tampere', 'Nokia', 'Ylöjärvi'], 'Southwest Finland': ['Turku', 'Naantali', 'Raisio'] },
  'France': { 'Île-de-France': ['Paris', 'Boulogne-Billancourt', 'Saint-Denis'], 'Provence-Alpes-Côte d\'Azur': ['Marseille', 'Nice', 'Toulon'], 'Auvergne-Rhône-Alpes': ['Lyon', 'Grenoble', 'Saint-Étienne'], 'Occitanie': ['Toulouse', 'Montpellier', 'Nîmes'] },
  'Germany': {
    'Bavaria': ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg', 'Würzburg'],
    'Berlin': ['Berlin', 'Mitte', 'Charlottenburg', 'Prenzlauer Berg', 'Kreuzberg'],
    'Hamburg': ['Hamburg', 'Altona', 'Eimsbüttel', 'Wandsbek', 'Bergedorf'],
    'North Rhine-Westphalia': ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen', 'Duisburg'],
    'Baden-Württemberg': ['Stuttgart', 'Karlsruhe', 'Mannheim', 'Freiburg', 'Heidelberg'],
    'Saxony': ['Dresden', 'Leipzig', 'Chemnitz', 'Zwickau', 'Plauen'],
  },
  'Ghana': { 'Greater Accra': ['Accra', 'Tema', 'Ashaiman'], 'Ashanti': ['Kumasi', 'Obuasi', 'Ejisu'], 'Western': ['Takoradi', 'Sekondi', 'Tarkwa'] },
  'Greece': { 'Attica': ['Athens', 'Piraeus', 'Peristeri'], 'Central Macedonia': ['Thessaloniki', 'Kavala', 'Serres'], 'Crete': ['Heraklion', 'Chania', 'Rethymno'] },
  'Guatemala': { 'Guatemala': ['Guatemala City', 'Mixco', 'Villa Nueva'], 'Quetzaltenango': ['Quetzaltenango', 'Coatepeque', 'Huehuetenango'], 'Escuintla': ['Escuintla', 'Mazatenango', 'Retalhuleu'] },
  'Honduras': { 'Francisco Morazán': ['Tegucigalpa', 'Comayagüela', 'Valle de Ángeles'], 'Cortés': ['San Pedro Sula', 'Choloma', 'La Lima'], 'Atlántida': ['La Ceiba', 'El Progreso', 'Tela'] },
  'Hungary': { 'Budapest': ['Budapest', 'Óbuda', 'Pest'], 'Pest': ['Érd', 'Gödöllő', 'Dunakeszi'], 'Győr-Moson-Sopron': ['Győr', 'Sopron', 'Mosonmagyaróvár'] },
  'India': { 'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'], 'Delhi': ['New Delhi', 'Noida', 'Gurgaon', 'Faridabad', 'Ghaziabad'], 'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'], 'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'], 'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'] },
  'Indonesia': { 'Jakarta': ['Jakarta', 'Bekasi', 'Tangerang'], 'West Java': ['Bandung', 'Bogor', 'Depok'], 'East Java': ['Surabaya', 'Malang', 'Kediri'], 'Central Java': ['Semarang', 'Solo', 'Yogyakarta'] },
  'Iran': { 'Tehran': ['Tehran', 'Karaj', 'Shahr-e Rey'], 'Isfahan': ['Isfahan', 'Kashan', 'Najafabad'], 'Mashhad': ['Mashhad', 'Neyshabur', 'Sabzevar'] },
  'Iraq': { 'Baghdad': ['Baghdad', 'Sadr City', 'Kadhimiya'], 'Basra': ['Basra', 'Zubayr', 'Abu Al-Khasib'], 'Erbil': ['Erbil', 'Soran', 'Shaqlawa'] },
  'Ireland': { 'Leinster': ['Dublin', 'Dún Laoghaire', 'Swords'], 'Munster': ['Cork', 'Limerick', 'Waterford'], 'Connacht': ['Galway', 'Sligo', 'Castlebar'] },
  'Israel': { 'Tel Aviv': ['Tel Aviv', 'Ramat Gan', 'Petah Tikva'], 'Jerusalem': ['Jerusalem', 'Bethlehem', 'Beit Shemesh'], 'Haifa': ['Haifa', 'Nazareth', 'Acre'] },
  'Italy': { 'Lombardy': ['Milan', 'Bergamo', 'Brescia'], 'Lazio': ['Rome', 'Latina', 'Frosinone'], 'Campania': ['Naples', 'Salerno', 'Caserta'], 'Sicily': ['Palermo', 'Catania', 'Messina'], 'Veneto': ['Venice', 'Verona', 'Padua'] },
  'Japan': { 'Tokyo': ['Tokyo', 'Shinjuku', 'Shibuya', 'Minato', 'Chiyoda'], 'Osaka': ['Osaka', 'Sakai', 'Higashiosaka'], 'Kanagawa': ['Yokohama', 'Kawasaki', 'Sagamihara'], 'Aichi': ['Nagoya', 'Toyota', 'Okazaki'], 'Hokkaido': ['Sapporo', 'Asahikawa', 'Hakodate'] },
  'Jordan': { 'Amman': ['Amman', 'Zarqa', 'Russeifa'], 'Irbid': ['Irbid', 'Ramtha', 'Ajloun'], 'Aqaba': ['Aqaba', 'Wadi Rum', 'Quweira'] },
  'Kazakhstan': { 'Almaty': ['Almaty', 'Talgar', 'Kaskelen'], 'Nur-Sultan': ['Nur-Sultan', 'Temirtau', 'Karaganda'], 'Shymkent': ['Shymkent', 'Turkestan', 'Kentau'] },
  'Kenya': { 'Nairobi': ['Nairobi', 'Westlands', 'Embakasi'], 'Mombasa': ['Mombasa', 'Nyali', 'Kisauni'], 'Kisumu': ['Kisumu', 'Kakamega', 'Eldoret'] },
  'Malaysia': { 'Kuala Lumpur': ['Kuala Lumpur', 'Petaling Jaya', 'Shah Alam'], 'Selangor': ['Klang', 'Subang Jaya', 'Ampang'], 'Penang': ['George Town', 'Butterworth', 'Bukit Mertajam'], 'Johor': ['Johor Bahru', 'Batu Pahat', 'Muar'] },
  'Mexico': { 'Mexico City': ['Mexico City', 'Iztapalapa', 'Gustavo A. Madero'], 'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque'], 'Nuevo León': ['Monterrey', 'San Nicolás', 'Apodaca'], 'Puebla': ['Puebla', 'Tehuacán', 'San Martín Texmelucan'] },
  'Morocco': { 'Casablanca-Settat': ['Casablanca', 'Mohammedia', 'El Jadida'], 'Rabat-Salé-Kénitra': ['Rabat', 'Salé', 'Kénitra'], 'Fès-Meknès': ['Fès', 'Meknès', 'Taza'] },
  'Mozambique': { 'Maputo': ['Maputo', 'Matola', 'Boane'], 'Nampula': ['Nampula', 'Nacala', 'Angoche'], 'Sofala': ['Beira', 'Dondo', 'Nhamatanda'] },
  'Myanmar': { 'Yangon': ['Yangon', 'Mandalay', 'Naypyidaw'], 'Mandalay': ['Mandalay', 'Sagaing', 'Monywa'], 'Shan': ['Taunggyi', 'Lashio', 'Kengtung'] },
  'Nepal': { 'Bagmati': ['Kathmandu', 'Lalitpur', 'Bhaktapur'], 'Gandaki': ['Pokhara', 'Baglung', 'Gorkha'], 'Lumbini': ['Butwal', 'Bhairahawa', 'Tansen'] },
  'Netherlands': { 'North Holland': ['Amsterdam', 'Haarlem', 'Zaandam'], 'South Holland': ['Rotterdam', 'The Hague', 'Leiden'], 'Utrecht': ['Utrecht', 'Amersfoort', 'Nieuwegein'] },
  'New Zealand': { 'Auckland': ['Auckland', 'Manukau', 'North Shore'], 'Wellington': ['Wellington', 'Lower Hutt', 'Porirua'], 'Canterbury': ['Christchurch', 'Timaru', 'Ashburton'], 'Waikato': ['Hamilton', 'Cambridge', 'Te Awamutu'] },
  'Nigeria': { 'Lagos': ['Lagos', 'Ikeja', 'Surulere'], 'Abuja': ['Abuja', 'Gwagwalada', 'Kuje'], 'Kano': ['Kano', 'Kaduna', 'Zaria'], 'Rivers': ['Port Harcourt', 'Obio-Akpor', 'Eleme'] },
  'Norway': { 'Oslo': ['Oslo', 'Bærum', 'Lørenskog'], 'Vestland': ['Bergen', 'Askøy', 'Fjell'], 'Trøndelag': ['Trondheim', 'Stjørdal', 'Steinkjer'] },
  'Pakistan': { 'Punjab': ['Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Multan'], 'Sindh': ['Karachi', 'Hyderabad', 'Sukkur'], 'Khyber Pakhtunkhwa': ['Peshawar', 'Mardan', 'Abbottabad'], 'Islamabad': ['Islamabad', 'Rawalpindi', 'Attock'] },
  'Peru': { 'Lima': ['Lima', 'Callao', 'San Juan de Lurigancho'], 'Arequipa': ['Arequipa', 'Cayma', 'Cerro Colorado'], 'La Libertad': ['Trujillo', 'Víctor Larco', 'El Porvenir'] },
  'Philippines': { 'Metro Manila': ['Manila', 'Quezon City', 'Caloocan', 'Makati', 'Pasig'], 'Cebu': ['Cebu City', 'Mandaue', 'Lapu-Lapu'], 'Davao': ['Davao City', 'Tagum', 'Panabo'] },
  'Poland': { 'Masovian': ['Warsaw', 'Radom', 'Płock'], 'Lesser Poland': ['Kraków', 'Tarnów', 'Nowy Sącz'], 'Lower Silesian': ['Wrocław', 'Legnica', 'Wałbrzych'] },
  'Portugal': { 'Lisbon': ['Lisbon', 'Sintra', 'Cascais'], 'Porto': ['Porto', 'Gaia', 'Braga'], 'Algarve': ['Faro', 'Portimão', 'Albufeira'] },
  'Romania': { 'Bucharest': ['Bucharest', 'Sector 1', 'Sector 3'], 'Cluj': ['Cluj-Napoca', 'Turda', 'Dej'], 'Iași': ['Iași', 'Bacău', 'Suceava'] },
  'Russia': { 'Moscow': ['Moscow', 'Khimki', 'Mytishchi'], 'Saint Petersburg': ['Saint Petersburg', 'Pushkin', 'Peterhof'], 'Novosibirsk': ['Novosibirsk', 'Berdsk', 'Iskitim'], 'Yekaterinburg': ['Yekaterinburg', 'Nizhny Tagil', 'Pervouralsk'] },
  'Saudi Arabia': { 'Riyadh': ['Riyadh', 'Al Kharj', 'Diriyah'], 'Mecca': ['Mecca', 'Jeddah', 'Taif'], 'Eastern Province': ['Dammam', 'Al Khobar', 'Dhahran'] },
  'Senegal': { 'Dakar': ['Dakar', 'Pikine', 'Guédiawaye'], 'Thiès': ['Thiès', 'Mbour', 'Tivaouane'], 'Saint-Louis': ['Saint-Louis', 'Richard Toll', 'Dagana'] },
  'Singapore': { 'Central Region': ['Orchard', 'Marina Bay', 'Chinatown'], 'East Region': ['Tampines', 'Bedok', 'Pasir Ris'], 'West Region': ['Jurong', 'Clementi', 'Buona Vista'] },
  'South Africa': { 'Gauteng': ['Johannesburg', 'Pretoria', 'Soweto', 'Ekurhuleni', 'Centurion'], 'Western Cape': ['Cape Town', 'Stellenbosch', 'George'], 'KwaZulu-Natal': ['Durban', 'Pietermaritzburg', 'Richards Bay'] },
  'South Korea': { 'Seoul': ['Seoul', 'Gangnam', 'Mapo'], 'Gyeonggi': ['Suwon', 'Seongnam', 'Goyang'], 'Busan': ['Busan', 'Haeundae', 'Seo-gu'], 'Incheon': ['Incheon', 'Bupyeong', 'Namdong'] },
  'Spain': { 'Community of Madrid': ['Madrid', 'Alcalá de Henares', 'Leganés'], 'Catalonia': ['Barcelona', 'Hospitalet', 'Badalona'], 'Andalusia': ['Seville', 'Málaga', 'Córdoba'], 'Valencia': ['Valencia', 'Alicante', 'Elche'] },
  'Sri Lanka': { 'Western': ['Colombo', 'Dehiwala', 'Moratuwa'], 'Central': ['Kandy', 'Matale', 'Nuwara Eliya'], 'Southern': ['Galle', 'Matara', 'Hambantota'] },
  'Sweden': { 'Stockholm': ['Stockholm', 'Solna', 'Sundbyberg'], 'Västra Götaland': ['Gothenburg', 'Borås', 'Mölndal'], 'Skåne': ['Malmö', 'Helsingborg', 'Lund'] },
  'Switzerland': { 'Zurich': ['Zurich', 'Winterthur', 'Uster'], 'Bern': ['Bern', 'Biel', 'Thun'], 'Geneva': ['Geneva', 'Carouge', 'Lancy'] },
  'Taiwan': { 'Taipei': ['Taipei', 'Zhongzheng', 'Xinyi'], 'New Taipei': ['New Taipei', 'Banqiao', 'Zhonghe'], 'Taichung': ['Taichung', 'Xitun', 'Beitun'] },
  'Tanzania': { 'Dar es Salaam': ['Dar es Salaam', 'Kinondoni', 'Ilala'], 'Mwanza': ['Mwanza', 'Ilemela', 'Nyamagana'], 'Arusha': ['Arusha', 'Moshi', 'Karatu'] },
  'Thailand': { 'Bangkok': ['Bangkok', 'Nonthaburi', 'Pathum Thani'], 'Chiang Mai': ['Chiang Mai', 'Lamphun', 'Chiang Rai'], 'Phuket': ['Phuket', 'Patong', 'Kata'] },
  'Turkey': { 'Istanbul': ['Istanbul', 'Kadıköy', 'Beşiktaş'], 'Ankara': ['Ankara', 'Çankaya', 'Keçiören'], 'Izmir': ['Izmir', 'Konak', 'Bornova'], 'Antalya': ['Antalya', 'Alanya', 'Manavgat'] },
  'Uganda': { 'Central': ['Kampala', 'Entebbe', 'Mukono'], 'Eastern': ['Jinja', 'Mbale', 'Soroti'], 'Northern': ['Gulu', 'Lira', 'Arua'] },
  'Ukraine': { 'Kyiv': ['Kyiv', 'Brovary', 'Boryspil'], 'Kharkiv': ['Kharkiv', 'Lozova', 'Chuhuiv'], 'Odessa': ['Odessa', 'Illichivsk', 'Yuzhne'] },
  'United Arab Emirates': { 'Dubai': ['Dubai', 'Deira', 'Bur Dubai'], 'Abu Dhabi': ['Abu Dhabi', 'Al Ain', 'Khalifa City'], 'Sharjah': ['Sharjah', 'Ajman', 'Umm Al Quwain'] },
  'United Kingdom': {
    'England': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Bristol'],
    'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness'],
    'Wales': ['Cardiff', 'Swansea', 'Newport', 'Bangor', 'Wrexham'],
    'Northern Ireland': ['Belfast', 'Derry', 'Lisburn', 'Newry', 'Armagh'],
  },
  'United States': {
    'California': ['San Francisco', 'Los Angeles', 'San Diego', 'Sacramento', 'San Jose'],
    'New York': ['New York City', 'Brooklyn', 'Buffalo', 'Albany', 'Rochester'],
    'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio', 'Fort Worth'],
    'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
    'Washington': ['Seattle', 'Spokane', 'Tacoma', 'Bellevue', 'Olympia'],
    'Illinois': ['Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford'],
    'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'],
    'Ohio': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'],
    'Georgia': ['Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah'],
    'North Carolina': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem'],
    'Michigan': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor'],
    'Arizona': ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale'],
    'Colorado': ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood'],
    'Massachusetts': ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell'],
    'Nevada': ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks'],
  },
  'Uruguay': { 'Montevideo': ['Montevideo', 'Ciudad Vieja', 'Pocitos'], 'Canelones': ['Canelones', 'Las Piedras', 'Pando'], 'Maldonado': ['Maldonado', 'Punta del Este', 'San Carlos'] },
  'Venezuela': { 'Capital District': ['Caracas', 'Petare', 'El Hatillo'], 'Zulia': ['Maracaibo', 'Cabimas', 'Ciudad Ojeda'], 'Miranda': ['Los Teques', 'Guarenas', 'Guatire'] },
  'Vietnam': { 'Hanoi': ['Hanoi', 'Hà Đông', 'Sơn Tây'], 'Ho Chi Minh City': ['Ho Chi Minh City', 'Thủ Đức', 'Bình Dương'], 'Da Nang': ['Da Nang', 'Hội An', 'Tam Kỳ'] },
  'Zambia': { 'Lusaka': ['Lusaka', 'Kafue', 'Chongwe'], 'Copperbelt': ['Ndola', 'Kitwe', 'Chingola'], 'Southern': ['Livingstone', 'Mazabuka', 'Choma'] },
  'Zimbabwe': { 'Harare': ['Harare', 'Chitungwiza', 'Epworth'], 'Bulawayo': ['Bulawayo', 'Nkulumane', 'Pumula'], 'Manicaland': ['Mutare', 'Chipinge', 'Rusape'] },
};

const selectClass = "w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-card transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed";

export default function AddressSelector({ value, onChange }: AddressSelectorProps) {
  const [expanded, setExpanded] = useState(true);
  const [locationHistory, setLocationHistory] = useState<Address[]>([]);

  useEffect(() => {
    setLocationHistory(loadLocationHistory());
  }, []);

  const countries = Object.keys(countryData).sort();
  const states = value.country ? Object.keys(countryData[value.country] || {}) : [];
  const suburbs = value.country && value.state ? (countryData[value.country]?.[value.state] || []) : [];

  const hasFullAddress = value.suburb && value.country;

  const handleSuburbChange = (suburb: string) => {
    const updated = { ...value, suburb, full: '' };
    onChange(updated);
    if (suburb && updated.country) {
      addToLocationHistory(updated);
    }
  };

  const addToLocationHistory = (addr: Address) => {
    const label = addressLabel(addr);
    const filtered = locationHistory.filter(h => addressLabel(h) !== label);
    const updated = [addr, ...filtered].slice(0, MAX_LOCATION_HISTORY);
    setLocationHistory(updated);
    saveLocationHistory(updated);
  };

  const removeLocationItem = (addr: Address, e: React.MouseEvent) => {
    e.stopPropagation();
    const label = addressLabel(addr);
    const updated = locationHistory.filter(h => addressLabel(h) !== label);
    setLocationHistory(updated);
    saveLocationHistory(updated);
  };

  const clearAllLocationHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocationHistory([]);
    saveLocationHistory([]);
  };

  const selectLocationItem = (addr: Address) => {
    onChange(addr);
    addToLocationHistory(addr);
  };

  return (
    <div className={`bg-card border rounded-2xl shadow-sm transition-all duration-200 ${expanded ? 'border-primary/40' : 'border-border'}`}>
      {/* Header row — always visible */}
      <div className="w-full flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2.5 text-left min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${hasFullAddress ? 'bg-primary/10' : 'bg-muted'}`}>
            {hasFullAddress ? (
              <Navigation size={13} className="text-primary" />
            ) : (
              <MapPin size={13} className="text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Delivery Location</span>
            {hasFullAddress ? (
              <span className="text-sm font-medium text-foreground truncate block">
                {value.suburb}, {value.state}, {value.country}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Set your delivery address to see accurate shipping times</span>
            )}
          </div>
        </div>
        {/* Only show collapse arrow when address is filled */}
        {hasFullAddress && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 p-1.5 rounded-lg hover:bg-muted/40 transition-all duration-150 shrink-0"
            aria-label={expanded ? 'Collapse delivery location' : 'Expand delivery location'}
          >
            <ChevronDown size={15} className={`text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
          {/* Location history */}
          {locationHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Clock size={11} />
                  Recent Locations
                </span>
                <button
                  type="button"
                  onClick={clearAllLocationHistory}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  Clear all
                </button>
              </div>
              <ul className="flex flex-wrap gap-2">
                {locationHistory.map((addr, idx) => (
                  <li key={`lh-${idx}`} className="flex items-center gap-1 bg-muted/60 border border-border rounded-lg px-2.5 py-1.5 group">
                    <button
                      type="button"
                      onClick={() => selectLocationItem(addr)}
                      className="text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <MapPin size={11} className="text-muted-foreground" />
                      {addressLabel(addr)}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => removeLocationItem(addr, e)}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors opacity-60 hover:opacity-100"
                    >
                      <X size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Country */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Country</label>
              <select
                value={value.country}
                onChange={e => onChange({ country: e.target.value, state: '', suburb: '', full: '' })}
                className={selectClass}
              >
                <option value="">Select country</option>
                {countries.map(c => (
                  <option key={`country-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">State / Region</label>
              <select
                value={value.state}
                onChange={e => onChange({ ...value, state: e.target.value, suburb: '', full: '' })}
                disabled={!value.country}
                className={selectClass}
              >
                <option value="">Select state</option>
                {states.map(s => (
                  <option key={`state-${s}`} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Suburb */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Suburb / City</label>
              <select
                value={value.suburb}
                onChange={e => handleSuburbChange(e.target.value)}
                disabled={!value.state}
                className={selectClass}
              >
                <option value="">Select suburb</option>
                {suburbs.map(s => (
                  <option key={`suburb-${s}`} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Full address */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Street Address</label>
              <input
                type="text"
                value={value.full}
                onChange={e => onChange({ ...value, full: e.target.value })}
                disabled={!value.suburb}
                placeholder="123 Main St, Unit 4"
                className={selectClass}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}