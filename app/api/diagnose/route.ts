import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchBibliotecaProjects } from '@/lib/biblioteca';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING',
      supabaseConfigured: isSupabaseConfigured(),
      supabaseClientNull: supabase === null,
    },
    bibliotecaTest: null as any,
    error: null as string | null,
  };

  // If Supabase is configured, try to fetch projects
  if (isSupabaseConfigured() && supabase !== null) {
    try {
      const projects = await fetchBibliotecaProjects();
      diagnostics.bibliotecaTest = {
        success: true,
        projectCount: projects.length,
        projects: projects,
      };
    } catch (err: any) {
      diagnostics.bibliotecaTest = {
        success: false,
        error: err?.message || String(err),
        code: err?.code,
        details: err?.details || err?.hint,
        status: err?.status,
      };
      diagnostics.error = err?.message || String(err);
    }
  }

  return NextResponse.json(diagnostics);
}
