export interface ShippingAgent {
  kode: string;
  nama_agen: string;
  no_hp: string;
  alamat_lengkap: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  distance?: number;
}

export interface ShippingCalculation {
  weight?: number;
  distance?: number;
  baseRate?: number;
  perKmRate?: number;
  perKgRate?: number;
  totalCost?: number;
  rajaOngkir?: {
    query?: {
      origin: string;
      destination: string;
      weight: number;
      courier: string;
    };
    origin_details?: {
      city_id: string;
      province_id: string;
      province: string;
      type: string;
      city_name: string;
      postal_code: string;
    };
    destination_details?: {
      city_id: string;
      province_id: string;
      province: string;
      type: string;
      city_name: string;
      postal_code: string;
    };
    results?: Array<{
      code: string;
      name: string;
      costs: Array<{
        service: string;
        description: string;
        cost: Array<{
          value: number;
          etd: string;
          note: string;
        }>;
      }>;
    }>;
  };
} 