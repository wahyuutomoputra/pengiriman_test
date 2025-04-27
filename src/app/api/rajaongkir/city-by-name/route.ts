import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityName = searchParams.get('name');
    
    if (!cityName) {
      return NextResponse.json(
        { error: 'City name is required' },
        { status: 400 }
      );
    }
    
    console.log(`Looking up RajaOngkir city ID for: ${cityName}`);
    
  
    
    // If not found in database, try to fetch from RajaOngkir API
    // This requires an API call to list all cities and filter
    const response = await fetch('https://api.rajaongkir.com/starter/city', {
      method: 'GET',
      headers: {
        key: process.env.RAJAONGKIR_API_KEY!,
      },
    });
    
    if (!response.ok) {
      throw new Error(`RajaOngkir API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.rajaongkir || !data.rajaongkir.results) {
      throw new Error('Unexpected response format from RajaOngkir');
    }
    
    // Find a city that matches (case-insensitive, partial match)
    const cities = data.rajaongkir.results;
    const matchedCity = cities.find((city: any) => 
      city.city_name.toLowerCase().includes(cityName.toLowerCase()) ||
      `${city.type} ${city.city_name}`.toLowerCase().includes(cityName.toLowerCase())
    );
    
    if (matchedCity) {
      return NextResponse.json({
        city_id: matchedCity.city_id,
        city_name: matchedCity.city_name,
        type: matchedCity.type,
        province: matchedCity.province
      });
    }
    
    // If no match found, return not found
    return NextResponse.json(
      { error: 'City not found in RajaOngkir data' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error looking up city:', error);
    return NextResponse.json(
      { error: 'Failed to look up city' },
      { status: 500 }
    );
  }
} 