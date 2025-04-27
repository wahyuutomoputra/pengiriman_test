import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { agentKode, weight, destination, originCityId, destinationCityId, destinationProvince } = await request.json();

    if (!weight || !agentKode) {
      return NextResponse.json(
        { error: 'Weight and agentKode are required' },
        { status: 400 }
      );
    }

    if (!originCityId || !destinationCityId) {
      return NextResponse.json(
        { error: 'Origin and destination city IDs are required' },
        { status: 400 }
      );
    }

    console.log('API Key:', process.env.RAJAONGKIR_API_KEY ? 'Set' : 'Not set');

    // 1. Ambil data agen
    const { data: agent } = await supabase.from('agen').select('*').eq('kode', agentKode).single();
    if (!agent) return NextResponse.json({ error: 'Agen tidak ditemukan' }, { status: 404 });
    
    // Available couriers
    const couriers = ['jne', 'pos', 'tiki'];
    const allResults = [];

    // 4. Panggil API RajaOngkir untuk masing-masing kurir secara terpisah
    for (const courier of couriers) {
      const rajaOngkirRequestData = {
        origin: originCityId,
        destination: destinationCityId,
        weight: Math.ceil(weight * 1000).toString(), // berat dalam gram
        courier,
      };
      
      console.log(`Request to RajaOngkir for ${courier}:`, rajaOngkirRequestData);

      try {
        const rajaOngkirRes = await fetch('https://api.rajaongkir.com/starter/cost', {
          method: 'POST',
          headers: {
            key: process.env.RAJAONGKIR_API_KEY!,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(rajaOngkirRequestData),
        });

        if (!rajaOngkirRes.ok) {
          const errorText = await rajaOngkirRes.text();
          console.error(`RajaOngkir API error for ${courier}:`, rajaOngkirRes.status, errorText);
          continue; // Skip to next courier on error
        }

        const rajaOngkirData = await rajaOngkirRes.json();
        console.log(`Full RajaOngkir response for ${courier}:`, JSON.stringify(rajaOngkirData));
        
        // If successful, add to results
        if (rajaOngkirData.rajaongkir?.status?.code === 200 && 
            rajaOngkirData.rajaongkir.results && 
            rajaOngkirData.rajaongkir.results.length > 0) {
          
          // Just add to results without storing origin/destination details
          allResults.push(...rajaOngkirData.rajaongkir.results);
        }
      } catch (error) {
        console.error(`Error with ${courier}:`, error);
        // Continue with other couriers
      }
    }

    // Filter valid results with non-empty costs
    const validResults = allResults.filter(result => 
      result.costs && result.costs.length > 0
    );

    // If we have no valid results, use a manual calculation
    if (validResults.length === 0) {
      console.log('No valid shipping costs available, using fallback calculation');
      
      // Get city names from agent data
      const originCity = agent.kota || "Unknown Origin";
      const destinationCity = destination || "Unknown Destination";
      
      // Create fallback rate
      const distance = 10; // Default distance in km
      const baseRate = 10000;
      const perKmRate = 2000;
      const perKgRate = 5000;
      const totalCost = baseRate + (distance * perKmRate) + (parseFloat(weight) * perKgRate);
      
      // Convert to raja ongkir format with mock data for JNE
      const mockResults = [
        {
          code: "jne",
          name: "Jalur Nugraha Ekakurir (JNE)",
          costs: [
            {
              service: "REG",
              description: "Layanan Reguler",
              cost: [
                {
                  value: totalCost,
                  etd: "3-5",
                  note: ""
                }
              ]
            }
          ]
        }
      ];
      
      const mockResponse = {
        rajaOngkir: {
          query: {
            origin: originCityId,
            destination: destinationCityId,
            weight: Math.ceil(weight * 1000),
          },
          origin_details: {
            city_name: originCity,
            province: agent.provinsi || "Unknown",
          },
          destination_details: {
            city_name: destinationCity,
            province: "Unknown",
          },
          results: mockResults,
        }
      };
      
      return NextResponse.json(mockResponse);
    }

    // Attempt to get origin and destination details from one of the original responses
    // In a real app, you'd fetch these from a database or geocoding service
    
    // Create a combined response
    const combinedResponse = {
      rajaOngkir: {
        query: {
          origin: originCityId,
          destination: destinationCityId,
          weight: Math.ceil(weight * 1000),
        },
        origin_details: {
          city_name: agent.kota || "Unknown Origin",
          province: agent.provinsi || "Unknown",
        },
        destination_details: {
          city_name: destination || "Unknown Destination",
          province: destinationProvince || await getProvinceFromCity(destinationCityId) || "Unknown",
        },
        results: validResults,
      }
    };

    return NextResponse.json(combinedResponse);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Gagal cek ongkir', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// Helper function to get province from city ID
async function getProvinceFromCity(cityId: string): Promise<string | null> {
  try {
    // Get city data with province from regencies table
    const { data: city, error } = await supabase
      .from('regencies')
      .select('name, province_id, provinces:provinces(name)')
      .eq('id', cityId)
      .single();
    
    if (error || !city) {
      console.error('Error fetching province from regencies:', error);
      return null;
    }
    
    // Return province name if available
    if (city.provinces && typeof city.provinces === 'object' && 'name' in city.provinces) {
      return city.provinces.name as string;
    }
    return null;
  } catch (error) {
    console.error('Exception in getProvinceFromCity:', error);
    return null;
  }
} 