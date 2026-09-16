export type ClassifiedCategory =
  | "animals"
  | "home-family"
  | "sports-leisure"
  | "fashion-beauty"
  | "electronics"
  | "motoring"
  | "trades-services"
  | "free";

export type ClassifiedType = "offer" | "wanted";

export type ClassifiedUrgency = "asap" | "this-week" | "this-month" | "flexible";

export interface SubcategoryGroup {
  label: string;
  items: string[];
}

export interface ClassifiedAd {
  id: number;
  title: string;
  description: string;
  category: ClassifiedCategory;
  subcategory?: string;
  type: ClassifiedType;
  price?: number;
  priceLabel?: string;
  negotiable?: boolean;
  location: string;
  postedAt: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  image?: string;
  images?: string[];
  tags?: string[];
  urgency?: ClassifiedUrgency;
  condition?: string;
  externalLink?: string;
}

function flatItems(groups: SubcategoryGroup[]): string[] {
  return groups.flatMap(g => g.items);
}

const ANIMALS_GROUPS: SubcategoryGroup[] = [
  { label: "Pets", items: ["All Pets", "Dogs", "Cats", "Birds", "Reptiles", "Rabbits", "Rodents", "Fish", "Exotics", "Accessories", "Kennels & Catteries"] },
  { label: "Animal Services", items: ["All Animal Services", "Animal Welfare & Rescue", "Vets", "Charities for Animals"] },
];

const HOME_FAMILY_GROUPS: SubcategoryGroup[] = [
  { label: "Furniture & Fittings", items: ["All Furniture & Fittings", "Household Furniture", "Beds & Bedding", "Kitchen Furniture", "Bathroom Furniture", "Office Furniture", "Antique & Period Furniture", "Lighting", "Curtains & Blinds", "Fires & Heaters", "Seasonal Decorations"] },
  { label: "Homeware & Decor", items: ["Antiques & Ornaments", "Art, Paintings & Pictures", "Carpets & Flooring", "Vacuums & Floor Cleaners", "Clocks", "Telephones & Answer Machines"] },
  { label: "Mobility & Disabilities", items: ["All Disabilities", "Disability Aids", "Mobility Scooters", "Wheelchairs", "Electric Wheelchairs"] },
  { label: "Kitchen & Dining", items: ["All Kitchen & Dining", "Cookers, Hobs & Ovens", "Fridges & Freezers", "Washing Machines & Dryers", "Dishwashers", "Cutlery & Crockery", "Food & Drink Appliances"] },
  { label: "Wedding & Marriage", items: ["All Marriage", "Wedding Clothes & Bridal Wear", "Wedding Decorations & Accessories", "Wedding Services", "Wedding Cars", "Photography & Video", "Catering"] },
  { label: "Garden & Outdoor", items: ["All Garden", "Garden Tools & Equipment", "Garden Furniture", "Plants & Turfing", "Sheds, Greenhouses & Buildings", "Ponds & Water Features", "Gates & Fencing", "Conservatories", "Gardening Services"] },
  { label: "Home Improvements", items: ["All Home Improvements", "Tools & Equipment", "DIY & Building Materials", "Electrical", "Plumbing & Central Heating", "Windows & Doors", "Painting & Decorating", "Home Security", "Cleaning Services"] },
  { label: "Baby & Kids", items: ["All Children's", "Toys & Games", "Children's & Baby Clothes", "Baby Items", "Prams & Pushchairs", "Cots & Bedding", "Baby & Child Car Seats", "Childcare Services"] },
];

const SPORTS_LEISURE_GROUPS: SubcategoryGroup[] = [
  { label: "Sports", items: ["All Kit & Equipment", "Gym", "Golf", "Fishing", "Winter Sports", "Football", "Paintball", "Diving", "Swimming Pools", "Other Sports"] },
  { label: "Books & Games", items: ["All Books", "All Games", "Board Games", "Jigsaws & Puzzles"] },
  { label: "Cycling", items: ["All Cycling", "Bicycles", "Spares & Accessories"] },
  { label: "Hobbies & Crafts", items: ["All Hobbies", "Knitting, Sewing & Textiles", "Arts & Crafts", "Model Making & Engineering", "Radio Controlled", "Binoculars", "Metal Detecting", "Transmitters & Receivers", "Telescopes", "Microscopes"] },
  { label: "Water Activities", items: ["All Boats & Watersports", "Boat Supplies", "Engines and Outboards", "Kayaks and Canoes", "Wet Suits", "Yachts and Motorsailers", "Dinghies", "Windsurfing Equipment", "Inflatables", "Motor Cruisers", "Fishing Boats"] },
  { label: "Camping & Caravans", items: ["All Caravans & Camping", "Caravan Accessories", "Camping Equipment", "Camper Vans", "Touring Caravans", "Tents", "Camping & Caravan Sites", "Trailer Tents"] },
  { label: "Collecting", items: ["All Collecting", "China & Glass", "Memorabilia", "Toys & Models", "Coins & Medals", "Militaria", "Comics & Magazines", "Badges", "Dolls & Doll Houses", "Stamps", "Other Collecting"] },
  { label: "Events & Activities", items: ["All Events & Activities", "Outdoor Activity Events", "Children's Events", "Jumble Sales", "Classical Music Concerts", "Events for the Over 50s", "Event Services"] },
  { label: "Making Music", items: ["All Making Music", "Sheet Music", "Electric Guitars", "Acoustic Guitars", "Studio & Recording Equipment", "Keyboards, Synthesizers & Organs", "Drums & Percussion", "DJ & Karaoke Equipment", "Pianos", "String Instruments", "Violins, Violas & Cellos"] },
  { label: "Music & Video Media", items: ["All Music & Video", "Vinyl Records", "CDs", "DVDs", "VHS Videos", "Cassettes", "Minidiscs"] },
  { label: "Photography & Film", items: ["All Photography & Film", "Camera Accessories", "Cameras", "Cinematography", "Lenses", "Camcorders", "Photography Services"] },
];

const FASHION_BEAUTY_GROUPS: SubcategoryGroup[] = [
  { label: "Health & Beauty", items: ["All Health & Beauty", "Cosmetic & Skincare", "Massage", "Natural Remedies", "Diet & Nutrition", "Wigs & Hair Extensions", "Saunas & Toning Tables", "Sunbeds"] },
  { label: "Clothing & Footwear", items: ["Women's Clothing", "Women's Footwear", "Men's Clothing", "Men's Footwear"] },
  { label: "Jewellery & Accessories", items: ["Jewellery", "Bags, Purses & Wallets", "Watches", "Glasses & Sunglasses"] },
  { label: "Fancy Dress & Performance", items: ["Fancy Dress", "Dancewear & Performance Costume"] },
  { label: "Wedding Attire", items: ["Wedding Clothes & Bridal Wear", "Wedding Decorations & Accessories"] },
];

const ELECTRONICS_GROUPS: SubcategoryGroup[] = [
  { label: "Computing", items: ["All Computing", "Printers", "Monitors", "Modems", "Scanners", "Disk Drives", "CD ROM Drives", "Other Peripherals"] },
  { label: "Gaming & Consoles", items: ["All Games & Consoles", "Games", "Consoles", "Accessories", "Arcade, Fruit & Slot Machines"] },
  { label: "Classic Computing", items: ["Desktops", "Laptops", "Windows Desktop", "Windows Laptop", "Apple Macs", "Other Computers"] },
  { label: "Tablets & Handhelds", items: ["All Tablets & Handhelds", "Tablets", "Handheld Computers", "eBook Readers"] },
  { label: "Mobiles & Telephones", items: ["All Mobiles", "Mobile Phones", "Landlines & Accessories"] },
  { label: "Components & Software", items: ["Desktop Components", "Laptop Components", "Consumables", "Home Software", "Business Software", "Games Software", "Other Software"] },
  { label: "Home Entertainment", items: ["All Home Entertainment", "Music & Hi Fi", "TV, Satellite & Home Cinema", "DVD Players", "Video Players"] },
];

const MOTORING_GROUPS: SubcategoryGroup[] = [
  { label: "Cars", items: ["All Cars", "Ford", "Land Rover", "Vauxhall", "Volkswagen", "Nissan", "Fiat", "Audi", "BMW", "Mercedes-Benz", "Toyota", "Peugeot", "Citroen", "Other Makes"] },
  { label: "Spares & Accessories", items: ["All Spares & Accessories", "Car Spares", "Car Accessories", "Wheels, Tyres & Alloys", "Car Audio", "Satellite Navigation", "Customising & Performance", "Car Security"] },
  { label: "Motorcycles", items: ["All Motorcycles", "Motorcycle Spares & Accessories", "Motorcycle Clothing", "Mopeds & Scooters", "Trikes & Quad Bikes"] },
  { label: "Trailers", items: ["All Trailers"] },
  { label: "Services & Miscellaneous", items: ["Number Plates", "Motor Salvage & Breakers", "Car & Van Hire", "Dealers"] },
  { label: "Classic & Specialist", items: ["All Classic & Specialist", "Classic Cars", "Adapted Cars", "Agricultural Vehicles", "Kit Cars & Replicas", "Military Vehicles", "Electric Vehicles", "Rally & Race Cars"] },
  { label: "Commercial Vehicles", items: ["All Commercial Vehicles", "Vans", "Lorries & Trucks", "Commercial Spares", "Buses"] },
  { label: "Caravans & Campers", items: ["All Caravans & Camping", "Touring Caravans", "Camper Vans", "Caravan Accessories", "Camping Equipment"] },
];

const TRADES_SERVICES_GROUPS: SubcategoryGroup[] = [
  { label: "Property & Accommodation", items: ["All Property & Accommodation", "Properties to Rent", "Properties to Buy", "Rooms to Rent", "House Boats", "Flats & Houseshare", "Student Accommodation", "Board & Lodging"] },
  { label: "Home Services", items: ["Building Renovations", "Joinery & Carpentry", "Gardening Services", "Cleaning Services"] },
  { label: "Employment & Education", items: ["Professional Jobs", "Full Time Courses"] },
  { label: "Childcare & Family Services", items: ["Childcare Services", "Care & Support Equipment"] },
  { label: "Office & Business", items: ["Office & Business", "Industrial Equipment"] },
  { label: "Animal Services", items: ["All Animal Services", "Animal Welfare & Rescue", "Kennels & Catteries"] },
  { label: "Travel & Leisure Services", items: ["Holidays & Travel", "Camping & Caravan Sites"] },
  { label: "Wedding & Event Services", items: ["All Wedding Services", "Wedding Photography & Video", "Wedding Catering", "Wedding Cars", "Entertainers", "Event Services", "Photography Services"] },
  { label: "Motor Services", items: ["All Motor Services", "Motor Salvage & Breakers", "Car & Van Hire", "Parking Spaces to Rent", "Motor Dealers"] },
];

const FREE_GROUPS: SubcategoryGroup[] = [
  { label: "Free Items", items: ["All Free", "Free Stuff", "Give Away", "Swap & Exchange"] },
];

export const CLASSIFIED_CATEGORIES: {
  slug: ClassifiedCategory;
  label: string;
  icon: string;
  description: string;
  color: string;
  subcategoryGroups: SubcategoryGroup[];
  subcategories: string[];
}[] = [
  {
    slug: "animals",
    label: "Animals",
    icon: "Heart",
    description: "Pets, livestock & animal services",
    color: "#10B981",
    subcategoryGroups: ANIMALS_GROUPS,
    subcategories: flatItems(ANIMALS_GROUPS),
  },
  {
    slug: "home-family",
    label: "Home & Family",
    icon: "Home",
    description: "Furniture, appliances, garden & kids",
    color: "#8B5CF6",
    subcategoryGroups: HOME_FAMILY_GROUPS,
    subcategories: flatItems(HOME_FAMILY_GROUPS),
  },
  {
    slug: "sports-leisure",
    label: "Sports & Leisure",
    icon: "Dumbbell",
    description: "Sports gear, hobbies, music & collecting",
    color: "#3B82F6",
    subcategoryGroups: SPORTS_LEISURE_GROUPS,
    subcategories: flatItems(SPORTS_LEISURE_GROUPS),
  },
  {
    slug: "fashion-beauty",
    label: "Fashion & Beauty",
    icon: "Sparkles",
    description: "Clothing, jewellery, beauty & accessories",
    color: "#EC4899",
    subcategoryGroups: FASHION_BEAUTY_GROUPS,
    subcategories: flatItems(FASHION_BEAUTY_GROUPS),
  },
  {
    slug: "electronics",
    label: "Electronics",
    icon: "Monitor",
    description: "Computing, gaming, phones & entertainment",
    color: "#F59E0B",
    subcategoryGroups: ELECTRONICS_GROUPS,
    subcategories: flatItems(ELECTRONICS_GROUPS),
  },
  {
    slug: "motoring",
    label: "Motoring",
    icon: "Car",
    description: "Cars, bikes, vans, parts & services",
    color: "#EF4444",
    subcategoryGroups: MOTORING_GROUPS,
    subcategories: flatItems(MOTORING_GROUPS),
  },
  {
    slug: "trades-services",
    label: "Trades & Services",
    icon: "Wrench",
    description: "Property, jobs, trades & local services",
    color: "#F26B21",
    subcategoryGroups: TRADES_SERVICES_GROUPS,
    subcategories: flatItems(TRADES_SERVICES_GROUPS),
  },
  {
    slug: "free",
    label: "Free",
    icon: "Gift",
    description: "Free stuff, give-aways & swaps",
    color: "#84CC16",
    subcategoryGroups: FREE_GROUPS,
    subcategories: flatItems(FREE_GROUPS),
  },
];

export const MOCK_ADS: ClassifiedAd[] = [];
