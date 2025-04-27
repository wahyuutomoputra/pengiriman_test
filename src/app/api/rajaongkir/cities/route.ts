import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get the province ID if provided
    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get('province');
    
    // Create the URL to RajaOngkir API
    let url = 'https://api.rajaongkir.com/starter/city';
    if (provinceId) {
      url += `?province=${provinceId}`;
    }
    
    // Call RajaOngkir API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        key: process.env.RAJAONGKIR_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error(`RajaOngkir API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the response has the expected format
    if (!data.rajaongkir || !data.rajaongkir.results) {
      throw new Error('Unexpected response format from RajaOngkir');
    }
    
    return NextResponse.json(data.rajaongkir.results);
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
} 