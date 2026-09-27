import { ProcessionData } from '../src/types/procession.js';

export const initialProcessionData: ProcessionData = {
  title: "Feast of Our Lady of the Rosary",
  subtitle: "Annual Village Ward-to-Ward Procession",
  villageName: "St. Xavier's Village Parish",
  status: "live",
  currentStopId: "stop-2",
  nextStopId: "stop-3",
  mapProvider: "leaflet",
  googleMapsApiKey: "",
  cartoApiKey: "cb1_406k_1_8a9ea0e9a59d9cf597cf0557",
  adminPin: "1234",
  bannerMessage: "Procession is currently at The Fernandes Family residence. Rosary prayer in progress.",
  lastUpdated: new Date().toISOString(),
  currentLocation: {
    coordinates: { lat: 15.2848, lng: 73.9862 },
    updatedAt: new Date().toISOString(),
    source: "stop_anchor",
    accuracy: 5
  },
  stops: [
    {
      id: "stop-1",
      order: 1,
      familyName: "Parish Sanctuary",
      houseNumber: "Main Church",
      address: "Church Square, Ward 1",
      date: "2026-10-01",
      scheduledArrival: "17:00",
      scheduledDeparture: "17:30",
      actualArrival: "17:00",
      actualDeparture: "17:32",
      status: "visited",
      coordinates: { lat: 15.2830, lng: 73.9845 },
      contactNumber: "+91 98221 00101",
      notes: "Opening Hymn, Statue Blessing, and Procession departure."
    },
    {
      id: "stop-2",
      order: 2,
      familyName: "The Fernandes Family",
      houseNumber: "House #104",
      address: "St. Anne Cross Road, Ward 1",
      date: "2026-10-01",
      scheduledArrival: "17:45",
      scheduledDeparture: "18:15",
      actualArrival: "17:48",
      status: "current",
      coordinates: { lat: 15.2848, lng: 73.9862 },
      contactNumber: "+91 98221 11202",
      notes: "Decade 1 of Rosary & Litany chanting. Traditional floral altar prepared."
    },
    {
      id: "stop-3",
      order: 3,
      familyName: "The D'Silva Family",
      houseNumber: "House #72",
      address: "Main Cross Road, Ward 2",
      date: "2026-10-01",
      scheduledArrival: "18:30",
      scheduledDeparture: "19:00",
      status: "pending",
      coordinates: { lat: 15.2865, lng: 73.9880 },
      contactNumber: "+91 98221 22303",
      notes: "Decade 2 of Rosary. Blessing of sick family elders."
    },
    {
      id: "stop-4",
      order: 4,
      familyName: "The Pereira Homestead",
      houseNumber: "House #45",
      address: "Palm Grove Lane, Ward 2",
      date: "2026-10-01",
      scheduledArrival: "19:15",
      scheduledDeparture: "19:45",
      status: "pending",
      coordinates: { lat: 15.2882, lng: 73.9868 },
      contactNumber: "+91 98221 33404",
      notes: "Outdoor Grotto blessing and special youth choir hymns."
    },
    {
      id: "stop-5",
      order: 5,
      familyName: "The Rodrigues Family",
      houseNumber: "House #18",
      address: "Hillside View Road, Ward 3",
      date: "2026-10-02",
      scheduledArrival: "17:30",
      scheduledDeparture: "18:00",
      status: "pending",
      coordinates: { lat: 15.2898, lng: 73.9842 },
      contactNumber: "+91 98221 44505",
      notes: "Candlelight reception and family consecration."
    },
    {
      id: "stop-6",
      order: 6,
      familyName: "The Coutinho Residence",
      houseNumber: "House #89",
      address: "Riverside Way, Ward 3",
      date: "2026-10-02",
      scheduledArrival: "18:20",
      scheduledDeparture: "18:50",
      status: "pending",
      coordinates: { lat: 15.2880, lng: 73.9820 },
      contactNumber: "+91 98221 55606",
      notes: "Parish fellowship and sweet distribution (Chana & Doce)."
    },
    {
      id: "stop-7",
      order: 7,
      familyName: "The Mascarenhas Family",
      houseNumber: "House #112",
      address: "Market Square Approach, Ward 4",
      date: "2026-10-02",
      scheduledArrival: "19:10",
      scheduledDeparture: "19:40",
      status: "pending",
      coordinates: { lat: 15.2855, lng: 73.9828 },
      contactNumber: "+91 98221 66707",
      notes: "Final ward station prayer before entering chapel grounds."
    },
    {
      id: "stop-8",
      order: 8,
      familyName: "Village Grotto & Chapel",
      houseNumber: "Mount Mary Grotto",
      address: "Chapel Hilltop",
      date: "2026-10-02",
      scheduledArrival: "20:00",
      scheduledDeparture: "21:00",
      status: "pending",
      coordinates: { lat: 15.2838, lng: 73.9835 },
      contactNumber: "+91 98221 77808",
      notes: "Solemn Benediction, Final Blessing & Parish fireworks display."
    }
  ],
  customRouteCoordinates: [
    { lat: 15.2830, lng: 73.9845 },
    { lat: 15.2835, lng: 73.9852 },
    { lat: 15.2842, lng: 73.9858 },
    { lat: 15.2848, lng: 73.9862 }, // Stop 2
    { lat: 15.2854, lng: 73.9870 },
    { lat: 15.2860, lng: 73.9875 },
    { lat: 15.2865, lng: 73.9880 }, // Stop 3
    { lat: 15.2872, lng: 73.9876 },
    { lat: 15.2878, lng: 73.9872 },
    { lat: 15.2882, lng: 73.9868 }, // Stop 4
    { lat: 15.2889, lng: 73.9858 },
    { lat: 15.2894, lng: 73.9850 },
    { lat: 15.2898, lng: 73.9842 }, // Stop 5
    { lat: 15.2892, lng: 73.9832 },
    { lat: 15.2885, lng: 73.9825 },
    { lat: 15.2880, lng: 73.9820 }, // Stop 6
    { lat: 15.2870, lng: 73.9822 },
    { lat: 15.2862, lng: 73.9825 },
    { lat: 15.2855, lng: 73.9828 }, // Stop 7
    { lat: 15.2848, lng: 73.9830 },
    { lat: 15.2842, lng: 73.9832 },
    { lat: 15.2838, lng: 73.9835 }  // Stop 8
  ]
};
