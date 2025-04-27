import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Call RajaOngkir API to get provinces
    const response = await fetch('https://api.rajaongkir.com/starter/province', {
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
    console.error('Error fetching provinces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provinces' },
      { status: 500 }
    );
  }
} 