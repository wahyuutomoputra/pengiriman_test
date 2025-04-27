import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const level = searchParams.get('level') || 'villages'; // villages, districts, regencies, provinces

  if (!q) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from(level)
    .select('*')
    .ilike('name', `%${q}%`)
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
} 