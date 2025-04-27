# Cek Ongkir - Shipping Cost Calculator

This application allows users to check shipping costs between locations in Indonesia, find nearby shipping agents, and compare rates across multiple couriers including JNE, POS, and TIKI.

## Features

- **Location Selection**: Search and select destination by province and city
- **Nearby Agent Finder**: Locate nearest shipping agents based on the destination
- **Real-time Shipping Rates**: Get up-to-date rates from multiple couriers
- **Best Rate Recommendation**: Automatically highlight the cheapest shipping option
- **Dynamic Origin**: Uses the shipping agent's location to calculate rates

## Technology Stack

- Next.js 14 (App Router)
- React
- TypeScript
- Supabase (Database)
- RajaOngkir API (Shipping rate calculation)
- Tailwind CSS (UI styling)

## How It Works

1. User selects a destination city
2. Application finds nearby shipping agents
3. User selects a shipping agent and enters package weight
4. Application calculates shipping rates across multiple couriers
5. Results are displayed with the cheapest option highlighted

## API Integration

The application integrates with the RajaOngkir API to retrieve shipping costs. It automatically maps agent locations to the corresponding RajaOngkir city IDs to ensure accurate rate calculations.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with the following:

```
RAJAONGKIR_API_KEY=your_rajaongkir_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Requirements

The application requires the following Supabase tables:
- `agen`: Stores shipping agent data
- `regencies`: Contains city data with ID and coordinates 
- `city_coordinates`: Maps RajaOngkir city IDs to coordinates

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
