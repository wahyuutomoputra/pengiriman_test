import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  // Convert invalid values to 0 to prevent NaN results
  lat1 = parseFloat(lat1.toString()) || 0;
  lon1 = parseFloat(lon1.toString()) || 0;
  lat2 = parseFloat(lat2.toString()) || 0;
  lon2 = parseFloat(lon2.toString()) || 0;
  
  // Log values for debugging
  console.log(`Calculating distance between (${lat1}, ${lon1}) and (${lat2}, ${lon2})`);
  
  // Check if coordinates are valid
  if (lat1 === 0 && lon1 === 0) return 9999; // Very large distance for invalid source
  if (lat2 === 0 && lon2 === 0) return 9999; // Very large distance for invalid destination
  
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  console.log(`Calculated distance: ${distance} km`);
  return distance;
}

// Fetch coordinates for a city from the database
async function getCityCoordinatesFromDB(cityId: string) {
  try {
    // First try to get from regencies table
    const { data: city, error } = await supabase
      .from('regencies')
      .select('id, name, latitude, longitude')
      .eq('id', cityId)
      .single();
    
    if (error) {
      console.error('Error fetching city from regencies table:', error);
      return null;
    }
    
    if (city && city.latitude && city.longitude) {
      console.log(`Found coordinates in regencies table for ${city.name}: ${city.latitude}, ${city.longitude}`);
      return {
        name: city.name,
        latitude: parseFloat(city.latitude),
        longitude: parseFloat(city.longitude)
      };
    }
    
    // If no coordinates in regencies, try the city_coordinates table
    const { data: cityCoord, error: coordError } = await supabase
      .from('city_coordinates')
      .select('city_id, city_name, latitude, longitude')
      .eq('city_id', cityId)
      .single();
    
    if (coordError) {
      console.error('Error fetching from city_coordinates table:', coordError);
      // Try to continue with fallback
    } else if (cityCoord && cityCoord.latitude && cityCoord.longitude) {
      console.log(`Found coordinates in city_coordinates table for ${cityCoord.city_name}: ${cityCoord.latitude}, ${cityCoord.longitude}`);
      return {
        name: cityCoord.city_name,
        latitude: parseFloat(cityCoord.latitude),
        longitude: parseFloat(cityCoord.longitude)
      };
    }
    
    console.log(`No coordinates found in DB for city ID ${cityId}`);
    return null;
  } catch (error) {
    console.error('Exception in getCityCoordinatesFromDB:', error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const villageId = searchParams.get('village_id');
    const cityId = searchParams.get('city_id');
    
    // Get coordinates directly from parameters if available
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat') || '0') : 0;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng') || '0') : 0;

    // If no identifiers are provided, return an error
    if ((!villageId && !cityId) && (lat === 0 || lng === 0)) {
      return NextResponse.json({ error: 'Valid coordinates or location identifiers are required' }, { status: 400 });
    }

    let locationCoords = { latitude: lat, longitude: lng, name: 'User selected location' };

    // If coordinates were provided directly, use them
    if (lat !== 0 && lng !== 0) {
      console.log(`Using provided coordinates: ${lat}, ${lng}`);
    }
    // Otherwise try to get coordinates from village or city ID
    else {
      // If village_id is provided, get coordinates from villages table
      if (villageId) {
        const { data: village, error: errVillage } = await supabase
          .from('villages')
          .select('latitude, longitude, name')
          .eq('id', villageId)
          .single();

        if (errVillage || !village) {
          return NextResponse.json({ error: 'Wilayah tidak ditemukan' }, { status: 404 });
        }

        locationCoords = {
          latitude: village.latitude,
          longitude: village.longitude,
          name: village.name
        };
        
        console.log(`Using village coordinates for ${village.name}: ${JSON.stringify(locationCoords)}`);
      } 
      // If city_id is provided, get coordinates from the database
      else if (cityId) {
        // Attempt to get coordinates from database
        const dbCoordinates = await getCityCoordinatesFromDB(cityId);
        
        if (dbCoordinates) {
          locationCoords = dbCoordinates;
          console.log(`Using DB coordinates for city ${cityId} (${locationCoords.name}): ${locationCoords.latitude}, ${locationCoords.longitude}`);
        } else {
          console.log(`No coordinates found for city ${cityId}, coordinates must be provided`);
          return NextResponse.json({ error: 'Coordinates for this city are not available' }, { status: 400 });
        }
      }
    }

    // Debug: log the location coordinates being used
    console.log(`Final location coordinates used for distance calculation:`, locationCoords);

    // Get all agents with their coordinates from the database
    const { data: agents, error: errAgen } = await supabase
      .from('agen')
      .select('*');

    if (errAgen) {
      return NextResponse.json({ error: errAgen.message }, { status: 500 });
    }

    console.log(`Found ${agents.length} agents`);
    
    // Use agent coordinates directly from the agen table
    const agentsWithDistance = agents.map(agent => {
      // Get coordinates from agen table
      let agentLatitude = 0, agentLongitude = 0;
      
      // Check if agent has valid coordinates in its own record from agen table
      if (agent.latitude && agent.longitude) {
        agentLatitude = parseFloat(agent.latitude.toString());
        agentLongitude = parseFloat(agent.longitude.toString());
        console.log(`Using agent's coordinates for ${agent.nama_agen} (${agent.kode}): ${agentLatitude}, ${agentLongitude}`);
      }
      
      // Calculate distance only if both coordinates are valid
      const distance = (agentLatitude && agentLongitude && locationCoords.latitude && locationCoords.longitude) 
        ? haversine(
            locationCoords.latitude,
            locationCoords.longitude,
            agentLatitude,
            agentLongitude
          )
        : 9999; // Default to very far if no coordinates
      
      console.log(`Agent ${agent.nama_agen} (${agent.kode}) in ${agent.kota}: distance = ${distance.toFixed(2)} km`);
      
      return {
        ...agent,
        distance,
        coordinate: { latitude: agentLatitude, longitude: agentLongitude }
      };
    });

    // Urutkan berdasarkan jarak terdekat
    agentsWithDistance.sort((a, b) => a.distance - b.distance);

    // Log sorted results
    agentsWithDistance.slice(0, 5).forEach((agent, i) => {
      console.log(`Top ${i+1}: ${agent.nama_agen} (${agent.kota}) - ${agent.distance.toFixed(2)} km`);
    });

    // Kembalikan 5 agen terdekat (atau semua jika < 5)
    return NextResponse.json(agentsWithDistance.slice(0, 5));
  } catch (error) {
    console.error('Error in GET agents:', error);
    return NextResponse.json({ error: 'Failed to find nearest agents' }, { status: 500 });
  }
} 