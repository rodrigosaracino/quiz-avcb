-- schema.sql — Executar no Cloudflare D1

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 70,
  percentage INTEGER DEFAULT 0,
  answers TEXT DEFAULT '[]',
  source TEXT DEFAULT 'quiz-avcb',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscas por telefone (evitar duplicatas)
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

-- Índice para filtrar por score
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(percentage);

-- Índice para ordenar por data
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
