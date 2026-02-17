import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // RLS entscheidet: Select liefert nur, wenn der User berechtigt ist
  const { data: material, error } = await supabase
    .from('materials')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (error || !material) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('materials')
    .createSignedUrl(material.storage_path, 60 * 60); // 1h

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not sign url' }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
