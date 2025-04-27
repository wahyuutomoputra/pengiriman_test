'use client';

import { useState } from 'react';
import { ShippingAgent, ShippingCalculation } from '../models/ShippingAgent';
import WilayahAutocomplete from '../components/WilayahAutocomplete';
import WilayahRajaOngkirSelect from '../components/WilayahRajaOngkirSelect';
import { ChevronDown } from 'lucide-react';

export default function Home() {
  const [weight, setWeight] = useState('');
  const [nearestAgents, setNearestAgents] = useState<ShippingAgent[]>([]);
  const [calculation, setCalculation] = useState<ShippingCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedWilayah, setSelectedWilayah] = useState<any | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<ShippingAgent | null>(null);
  const [skipVillage, setSkipVillage] = useState(false);
  const [showAgentSection, setShowAgentSection] = useState(true);
  const [showDestinationSection, setShowDestinationSection] = useState(true);
  const [step, setStep] = useState<'address' | 'agent' | 'ongkir'>('address');
  const [selectedRajaOngkirLocation, setSelectedRajaOngkirLocation] = useState<any | null>(null);

  const findNearestAgents = async () => {
    if (!selectedRajaOngkirLocation || !selectedRajaOngkirLocation.city_id) {
      alert('Pilih alamat tujuan (provinsi dan kota) terlebih dahulu');
      return;
    }
    
    setLoadingAgents(true);
    try {
      // Directly send coordinates to the API instead of just city_id
      const agentsResponse = await fetch(`/api/agents?city_id=${selectedRajaOngkirLocation.city_id}&lat=${selectedRajaOngkirLocation.latitude || 0}&lng=${selectedRajaOngkirLocation.longitude || 0}`);
      const agents = await agentsResponse.json();
      setNearestAgents(agents);
      setStep('agent');
    } catch (error) {
      console.error('Error finding nearest agents:', error);
      alert('Gagal mencari agen terdekat. Silakan coba lagi.');
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleLocationChange = (location: any) => {
    setSelectedRajaOngkirLocation(location);
    console.log('Selected RajaOngkir location:', location);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedAgent) {
        alert('Pilih agen pengiriman terlebih dahulu');
        return;
      }

      if (!selectedRajaOngkirLocation || !selectedRajaOngkirLocation.city_id) {
        alert('Pilih kota tujuan terlebih dahulu');
        return;
      }

      // Attempt to get the RajaOngkir city ID for the agent's city
      let originCityId = "";
      try {
        // Try to find the city ID by name
        const cityResponse = await fetch(`/api/rajaongkir/city-by-name?name=${encodeURIComponent(selectedAgent.kota)}`);
        const cityData = await cityResponse.json();
        
        if (cityData && cityData.city_id) {
          originCityId = cityData.city_id;
        } else {
          // Fallback to default ID if city not found
          console.warn(`City ID not found for agent's city: ${selectedAgent.kota}, using default`);
          originCityId = "444"; // Fallback to default
        }
      } catch (cityError) {
        console.error('Error getting city ID:', cityError);
        originCityId = "444"; // Fallback to default
      }

      // Calculate shipping cost using RajaOngkir city IDs
      const calculationResponse = await fetch('/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: selectedRajaOngkirLocation.city_name || '', // Use city name from RajaOngkir
          weight: parseFloat(weight),
          agentKode: selectedAgent.kode,
          originCityId: originCityId, // Now using the dynamically fetched city ID
          destinationCityId: selectedRajaOngkirLocation.city_id,
          destinationProvince: selectedRajaOngkirLocation.province || '',
        }),
      });
      const result = await calculationResponse.json();
      console.log('RajaOngkir response:', result);
      setCalculation(result);
      setStep('ongkir');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sort and transform RajaOngkir results to easily find the cheapest rate
  const transformRajaOngkirResults = (results: any[]) => {
    if (!results || !Array.isArray(results)) return [];
    
    // Create a flat array of all shipping options with their prices
    const allOptions: Array<{
      courier: string;
      service: string;
      description: string;
      price: number;
      etd: string;
    }> = [];
    
    results.forEach(courier => {
      if (courier.costs && Array.isArray(courier.costs)) {
        courier.costs.forEach((cost: any) => {
          if (cost.cost && Array.isArray(cost.cost)) {
            cost.cost.forEach((c: any) => {
              allOptions.push({
                courier: courier.name,
                service: cost.service,
                description: cost.description,
                price: c.value,
                etd: c.etd
              });
            });
          }
        });
      }
    });
    
    // Sort by price (lowest first)
    return allOptions.sort((a, b) => a.price - b.price);
  };

  // Normalize the RajaOngkir/rajaOngkir object naming inconsistency
  const normalizeOngkirData = (calculation: any) => {
    if (!calculation) return null;
    
    // If already has normalized property, use it
    if (calculation.rajaOngkir) {
      return calculation.rajaOngkir;
    }
    
    // Check for the other case
    if (calculation.RajaOngkir) {
      return calculation.RajaOngkir;
    }
    
    // Handle the manual calculation case
    if (calculation.weight !== undefined && calculation.totalCost !== undefined) {
      return null;
    }
    
    // Return null if not recognized
    return null;
  };

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Cek Ongkir</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Address Selection */}
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <button 
              type="button"
              className="w-full p-5 text-left flex justify-between items-center"
              onClick={() => setShowDestinationSection(!showDestinationSection)}
            >
              <span className="text-2xl text-gray-400">Alamat Tujuan</span>
              <ChevronDown className={`transform transition-transform ${showDestinationSection ? 'rotate-180' : ''}`} />
            </button>
            
            {showDestinationSection && (
              <div className="p-4 bg-rose-50">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="skipVillageDest"
                    checked={skipVillage}
                    onChange={() => setSkipVillage(!skipVillage)}
                    className="h-5 w-5"
                  />
                  <label htmlFor="skipVillageDest" className="text-xl">Tanpa Kelurahan</label>
                  <button type="button" className="text-blue-500 bg-blue-50 rounded-full h-6 w-6 flex items-center justify-center">
                    i
                  </button>
                </div>
                
                <WilayahRajaOngkirSelect onSelect={handleLocationChange} />

                <button
                  type="button"
                  onClick={findNearestAgents}
                  disabled={loadingAgents || !selectedRajaOngkirLocation?.city_id}
                  className="w-full mt-4 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loadingAgents ? 'Mencari Agen...' : 'Cari Agen Terdekat'}
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Agent Selection */}
          {step !== 'address' && (
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              <button 
                type="button"
                className="w-full p-5 text-left flex justify-between items-center"
                onClick={() => setShowAgentSection(!showAgentSection)}
              >
                <span className="text-2xl text-gray-400">Pilih Agen Pengiriman</span>
                <ChevronDown className={`transform transition-transform ${showAgentSection ? 'rotate-180' : ''}`} />
              </button>
              
              {showAgentSection && (
                <div className="p-4 bg-rose-50">
                  {nearestAgents.length > 0 ? (
                    <div className="space-y-2">
                      {nearestAgents.map((agent, index) => (
                        <div 
                          key={agent.kode} 
                          className={`p-3 rounded border cursor-pointer ${
                            selectedAgent?.kode === agent.kode 
                              ? 'bg-blue-50 border-blue-500' 
                              : index === 0 
                                ? 'bg-green-50 border-green-500' 
                                : 'bg-white'
                          }`}
                          onClick={() => setSelectedAgent(agent)}
                        >
                          <div className="flex items-start">
                            <div className="flex-1">
                              {index === 0 && (
                                <div className="mb-1">
                                  <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">REKOMENDASI</span>
                                  <span className="text-xs text-green-700 ml-2">Agen Terdekat</span>
                                </div>
                              )}
                              <h3 className={`font-medium ${index === 0 ? 'text-green-800' : ''}`}>{agent.nama_agen}</h3>
                              <p className="text-gray-600">{agent.alamat_lengkap}</p>
                              <p className="text-sm text-gray-500">
                                {agent.kelurahan}, {agent.kecamatan}, {agent.kota}, {agent.provinsi}
                              </p>
                              <p className="text-sm text-gray-500">No. HP: {agent.no_hp}</p>
                              {agent.distance && (
                                <p className={`text-sm font-medium mt-1 ${index === 0 ? 'text-green-600' : 'text-indigo-600'}`}>
                                  Jarak: {typeof agent.distance === 'number' ? agent.distance.toFixed(2) : '-'} km
                                </p>
                              )}
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 ${
                              selectedAgent?.kode === agent.kode 
                                ? 'border-blue-500' 
                                : index === 0 
                                  ? 'border-green-500' 
                                  : 'border-gray-300'
                            } flex-shrink-0 flex items-center justify-center`}>
                              {selectedAgent?.kode === agent.kode && (
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Belum ada agen terdekat. Pilih alamat tujuan terlebih dahulu.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Weight Input and Calculate */}
          {step !== 'address' && selectedAgent && (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    id="weight"
                    value={weight}
                    onChange={(e) => {
                      // Allow only numbers and one decimal point
                      const value = e.target.value;
                      if (/^([0-9]*[.])?[0-9]*$/.test(value)) {
                        setWeight(value);
                      }
                    }}
                    className="w-full p-4 border rounded-lg"
                    placeholder="Berat"
                    required
                  />
                </div>
                <div className="w-24 bg-white flex items-center justify-center border rounded-lg">
                  <span className="text-xl">Kg</span>
                </div>
              </div>
              <div className="text-gray-500 text-sm">
                Berat {"<"}1kg gunakan titik, contoh: 400 gr = 0.4 kg
              </div>

              <button
                type="submit"
                disabled={loading || !weight}
                className="w-full bg-yellow-400 text-white py-5 rounded-lg text-xl hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Menghitung...' : 'Cek Ongkir'}
              </button>
            </>
          )}
        </form>

        {/* Shipping Cost Results */}
        {calculation && step === 'ongkir' && (
          <div className="mt-8 p-4 bg-white rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Perhitungan Ongkir</h2>
            
            {/* Debug Information - You can remove this in production */}
            {/* <pre className="text-xs bg-gray-100 p-2 mb-4 overflow-auto max-h-60">
              {JSON.stringify(calculation, null, 2)}
            </pre> */}
            
            {(() => {
              // Normalize the inconsistent property name
              const rajaOngkirData = normalizeOngkirData(calculation);
              
              if (rajaOngkirData) {
                return (
                  <>
                    <div className="space-y-2">
                      <p>Asal: {rajaOngkirData.origin_details?.city_name || '-'}, {rajaOngkirData.origin_details?.province || '-'}</p>
                      <p>Tujuan: {rajaOngkirData.destination_details?.city_name || '-'}, {rajaOngkirData.destination_details?.province || '-'}</p>
                      <p>Berat: {rajaOngkirData.query?.weight ? rajaOngkirData.query.weight / 1000 : 0} kg</p>
                      
                      {/* Cheapest Option */}
                      {rajaOngkirData.results && rajaOngkirData.results.length > 0 && (
                        <div className="p-4 bg-green-50 border-green-500 border-2 rounded-md my-4 shadow-sm">
                          <h3 className="font-bold text-green-800 text-lg">✅ TERMURAH</h3>
                          {(() => {
                            const sortedOptions = transformRajaOngkirResults(rajaOngkirData.results || []);
                            if (sortedOptions.length > 0) {
                              const cheapest = sortedOptions[0];
                              return (
                                <div className="mt-2">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="font-bold text-lg">{cheapest.courier}</span>
                                      <span className="text-sm text-gray-600 ml-2">{cheapest.service}</span>
                                      <p className="text-xs text-gray-500">{cheapest.description}</p>
                                    </div>
                                    <div className="text-xl font-bold text-green-600">
                                      Rp {cheapest.price.toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center mt-2">
                                    <p className="text-sm font-medium">Estimasi: {cheapest.etd} hari</p>
                                    <button 
                                      type="button"
                                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                                      onClick={() => {
                                        // Handle pilih tarif
                                        alert(`Anda memilih pengiriman ${cheapest.courier} - ${cheapest.service} dengan biaya Rp ${cheapest.price.toLocaleString()}`);
                                      }}
                                    >
                                      Pilih Tarif Ini
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            return <p>Tidak ada opsi pengiriman tersedia</p>;
                          })()}
                        </div>
                      )}
                      
                      <h3 className="font-semibold text-lg mt-4">Semua Opsi Pengiriman</h3>
                      {(() => {
                        const sortedOptions = transformRajaOngkirResults(rajaOngkirData.results || []);
                        return (
                          <div className="space-y-2 mt-2">
                            {sortedOptions.map((option, index) => (
                              <div key={index} className="p-3 bg-white rounded-md border">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">{option.courier}</span>
                                    <span className="text-sm text-gray-600 ml-2">{option.service}</span>
                                    <p className="text-xs text-gray-500">{option.description}</p>
                                  </div>
                                  <div className="text-lg font-bold">
                                    Rp {option.price.toLocaleString()}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600">Estimasi: {option.etd} hari</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                );
              } else {
                // Manual calculation fallback
                return (
                  <div className="space-y-2">
                    <p>Berat: {calculation.weight} kg</p>
                    <p>Jarak: {typeof calculation.distance === 'number' ? calculation.distance.toFixed(2) : '-'} km</p>
                    <p>Biaya Dasar: Rp {typeof calculation.baseRate === 'number' ? calculation.baseRate.toLocaleString() : '-'}</p>
                    <p>Biaya per KM: Rp {typeof calculation.perKmRate === 'number' ? calculation.perKmRate.toLocaleString() : '-'}</p>
                    <p>Biaya per KG: Rp {typeof calculation.perKgRate === 'number' ? calculation.perKgRate.toLocaleString() : '-'}</p>
                    <p className="font-bold text-lg">
                      Total Biaya: Rp {typeof calculation.totalCost === 'number' ? calculation.totalCost.toLocaleString() : '-'}
                    </p>
                  </div>
                );
              }
            })()}
          </div>
        )}
        </div>
      </main>
  );
}
