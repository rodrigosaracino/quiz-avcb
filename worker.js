// worker.js — Cloudflare Worker API para Quiz AVCB
// Vincula ao D1 database com binding name: DB

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ========================
    // POST /api/leads — Salvar lead
    // ========================
    if (url.pathname === '/api/leads' && request.method === 'POST') {
      try {
        const data = await request.json();

        // Validação básica
        if (!data.name || !data.phone) {
          return new Response(
            JSON.stringify({ error: 'name e phone são obrigatórios' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Limpa telefone (só números)
        const cleanPhone = data.phone.replace(/\D/g, '');

        const result = await env.DB.prepare(`
          INSERT INTO leads (name, phone, email, company, total_score, max_score, percentage, answers, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          data.name,
          cleanPhone,
          data.email || null,
          data.company || null,
          data.total_score || 0,
          data.max_score || 70,
          data.percentage || 0,
          data.answers || '[]',
          data.source || 'quiz-avcb'
        ).run();

        return new Response(
          JSON.stringify({ success: true, id: result.meta.last_row_id }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Erro ao salvar', detail: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========================
    // GET /api/leads — Listar leads (protegido por API key simples)
    // ========================
    if (url.pathname === '/api/leads' && request.method === 'GET') {
      // Proteção simples: header x-api-key
      const apiKey = request.headers.get('x-api-key');
      if (apiKey !== env.API_KEY) {
        return new Response(
          JSON.stringify({ error: 'Não autorizado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const { results } = await env.DB.prepare(`
          SELECT * FROM leads ORDER BY created_at DESC LIMIT 100
        `).all();

        return new Response(
          JSON.stringify({ leads: results, total: results.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar', detail: err.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========================
    // GET /api/leads/export — CSV export
    // ========================
    if (url.pathname === '/api/leads/export' && request.method === 'GET') {
      const apiKey = request.headers.get('x-api-key');
      if (apiKey !== env.API_KEY) {
        return new Response('Não autorizado', { status: 401, headers: corsHeaders });
      }

      try {
        const { results } = await env.DB.prepare(`
          SELECT name, phone, email, company, total_score, percentage, source, created_at
          FROM leads ORDER BY created_at DESC
        `).all();

        const header = 'Nome,Telefone,Email,Empresa,Score,Percentual,Fonte,Data\n';
        const rows = results.map(r =>
          `"${r.name}","${r.phone}","${r.email || ''}","${r.company || ''}",${r.total_score},${r.percentage}%,"${r.source}","${r.created_at}"`
        ).join('\n');

        return new Response(header + rows, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="leads-quiz-avcb.csv"'
          }
        });
      } catch (err) {
        return new Response('Erro ao exportar', { status: 500, headers: corsHeaders });
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
};
