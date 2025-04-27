'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Location {
  province_id?: string;
  province?: string;
  city_id?: string;
  city_name?: string;
  type?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

interface WilayahRajaOngkirSelectProps {
  onSelect: (location: Location) => void;
  className?: string;
}

export default function WilayahRajaOngkirSelect({ onSelect, className = '' }: WilayahRajaOngkirSelectProps) {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [loadingCities, setLoadingCities] = useState<boolean>(false);
  const [loadingCoordinates, setLoadingCoordinates] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      setError(null);
      try {
        const response = await fetch('/api/rajaongkir/provinces');
        if (!response.ok) {
          throw new Error('Failed to fetch provinces');
        }
        const data = await response.json();
        setProvinces(data);
      } catch (err) {
        setError('Error loading provinces');
        console.error('Error loading provinces:', err);
      } finally {
        setLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  // Fetch cities when province changes
  useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      return;
    }

    const fetchCities = async () => {
      setLoadingCities(true);
      setError(null);
      try {
        const response = await fetch(`/api/rajaongkir/cities?province=${selectedProvince}`);
        if (!response.ok) {
          throw new Error('Failed to fetch cities');
        }
        const data = await response.json();
        setCities(data);
      } catch (err) {
        setError('Error loading cities');
        console.error('Error loading cities:', err);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [selectedProvince]);

  // Handle province change
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceId = e.target.value;
    setSelectedProvince(provinceId);
    setSelectedCity('');
  };

  // Handle city change
  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = e.target.value;
    setSelectedCity(cityId);
    
    const selectedCityData = cities.find(city => city.city_id === cityId);
    if (selectedCityData) {
      const provinceData = provinces.find(province => province.province_id === selectedProvince);
      
      // Fetch coordinates from the regencies table by name
      let coordinates = { latitude: 0, longitude: 0 };
      setLoadingCoordinates(true);
      try {
        // Clean up city name for search (uppercase and remove type prefix like Kota/Kabupaten)
        const cityName = selectedCityData.city_name.toUpperCase().trim();
        console.log(`Searching for coordinates for: ${cityName}`);
        
        const { data, error } = await supabase
          .from('regencies')
          .select('name, latitude, longitude')
          .ilike('name', `%${cityName}%`)
          .order('name')
          .limit(1);
        
        if (error) {
          console.error('Error fetching coordinates from regencies:', error);
        } else if (data && data.length > 0) {
          coordinates = {
            latitude: data[0].latitude,
            longitude: data[0].longitude
          };
          console.log(`Found coordinates in database for ${data[0].name}: ${coordinates.latitude}, ${coordinates.longitude}`);
        } else {
          console.log(`No coordinates found in database for ${cityName}`);
        }
      } catch (err) {
        console.error('Exception in fetching coordinates:', err);
      } finally {
        setLoadingCoordinates(false);
      }
      
      onSelect({
        province_id: selectedProvince,
        province: provinceData?.province || '',
        city_id: cityId,
        city_name: selectedCityData.city_name,
        type: selectedCityData.type,
        postal_code: selectedCityData.postal_code,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });
      
      console.log(`Selected ${selectedCityData.city_name} with coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
    }
  };

  const isLoading = loadingProvinces || loadingCities || loadingCoordinates;

  return (
    <div className={`space-y-3 ${className}`}>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      
      <div>
        <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
          Provinsi
        </label>
        <div className="relative">
          <select
            id="province"
            value={selectedProvince}
            onChange={handleProvinceChange}
            disabled={isLoading || provinces.length === 0}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Pilih Provinsi</option>
            {provinces.map((province) => (
              <option key={province.province_id} value={province.province_id}>
                {province.province}
              </option>
            ))}
          </select>
          {loadingProvinces && (
            <div className="absolute right-3 top-2">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
          Kota/Kabupaten
        </label>
        <div className="relative">
          <select
            id="city"
            value={selectedCity}
            onChange={handleCityChange}
            disabled={isLoading || !selectedProvince || cities.length === 0}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Pilih Kota/Kabupaten</option>
            {cities.map((city) => (
              <option key={city.city_id} value={city.city_id}>
                {city.type} {city.city_name}
              </option>
            ))}
          </select>
          {loadingCities && (
            <div className="absolute right-3 top-2">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>

      {loadingCoordinates && (
        <div className="flex items-center text-indigo-600">
          <div className="animate-spin h-4 w-4 mr-2 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
          <span className="text-sm">Mencari koordinat lokasi...</span>
        </div>
      )}
    </div>
  );
} 