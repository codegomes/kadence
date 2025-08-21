// ======================== CONFIG ========================
const PLANILHA_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTEm59ceM1AST7Ubw7_d0hOBvmPykiWYoZak9tn-MaoxX7GJMfe8sISmlJXqVgnHfeqU0En-mYSQ-si/pub?output=csv";

// Bloqueia o menu de contexto ao segurar (Android/desktop)
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.btn-primary')) e.preventDefault();
  }, { capture: true });

// (opcional) Evita “arrastar”/selecionar dentro do botão
  ['selectstart', 'dragstart'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      if (e.target.closest('.btn-primary')) e.preventDefault();
    });
  });


// Mapa UF -> Nome por extenso
const UF_NOMES = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul", MT: "Mato Grosso",
  PA: "Pará", PB: "Paraíba", PE: "Pernambuco", PI: "Piauí", PR: "Paraná",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima",
  RS: "Rio Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo",
  TO: "Tocantins"
};

// Meses (valor -> rótulo)
const MESES_PT = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
};

// Nomes "bonitinhos" por chave normalizada de fonte
const FONTE_NOMES_BONITOS = {
  ativo: "Ativo",
  atletis: "Atletis",
  bileto: "Bileto",

  // pedidos
  brasilcorrida: "Brasil Corrida",
  oxyscrono: "Oxys Crono",
  sporttimer: "Sport Timer",
  theridebr: "The Ride BR",
  vemcorrer: "Vem Correr",
  youmovin: "You Movin",
  timeticket: "Time Ticket",

  // demais comuns
  minhasinscricoes: "Minhas Inscrições",
  brasilcorridas: "Brasil Corridas",
  centraldacorrida: "Central da Corrida",
  corridao: "Corridão",
  ticketsports: "Ticket Sports",
  liverun: "Live Run",
  sympla: "Sympla",
  doity: "Doity",
  even3: "Even3",
  tfsports: "TF Sports",
  chiptime: "ChipTime",
  cronochip: "CronoChip"
};

// ======================== ESTADO GLOBAL ========================
let todosEventos = [];
let eventosFiltrados = [];
let eventosExibidos = 0;
const eventosPorPagina = 12;

const filtros = {
  busca: '',
  estado: '', // UF
  cidade: '',
  mes: '',    // '01'..'12'
  fonte: ''   // normalizado
};

// ======================== UTILIDADES ========================
function parseCSVLine(line) {
  const res = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) { res.push(cur); cur = ""; }
    else { cur += ch; }
  }
  res.push(cur);
  return res.map(s => s.trim());
}

// Datas
function parseDataFlex(texto) {
  if (!texto) return null;
  let m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) { const dt = new Date(+m[3], +m[2]-1, +m[1]); if (!isNaN(dt)) return dt; }
  m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) { const dt = new Date(+m[1], +m[2]-1, +m[3]); if (!isNaN(dt)) return dt; }
  const dt = new Date(texto);
  return isNaN(dt) ? null : dt;
}
function mes2(textoData) {
  const dt = parseDataFlex(textoData);
  return dt ? String(dt.getMonth() + 1).padStart(2, "0") : "";
}
function formatarDataBR(textoData) {
  const dt = parseDataFlex(textoData);
  return dt ? dt.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }) : (textoData || "");
}

// Normalização básica
function titleCase(txt = "") {
  // Adiciona normalização para remover acentos antes de aplicar titleCase
  const normalizedTxt = txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalizedTxt
    .toLowerCase()
    .split(/[\s._-]+/)
    .map(p => p ? p[0].toUpperCase() + p.slice(1) : p)
    .join(" ");
}

// Nova função para normalizar strings para comparação (remove acentos e converte para minúsculas)
function normalizeStringForComparison(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


// -------- Local (UF & Cidade) --------
// Mapa de cidades para estados para inferência
const CIDADES_PARA_UF = {
    "araguari": "MG",
    "sao paulo": "SP",
    "rio de janeiro": "RJ",
    "belo horizonte": "MG",
    "porto alegre": "RS",
    "curitiba": "PR",
    "salvador": "BA",
    "recife": "PE",
    "fortaleza": "CE",
    "brasilia": "DF",
    "manaus": "AM",
    "campinas": "SP",
    "ribeirao preto": "SP",
    "uberlandia": "MG",
    "florianopolis": "SC",
    "goiania": "GO",
    "campo grande": "MS",
    "cuiaba": "MT",
    "belem": "PA",
    "joao pessoa": "PB",
    "teresina": "PI",
    "natal": "RN",
    "porto velho": "RO",
    "boa vista": "RR",
    "palmas": "TO",
    "macapa": "AP",
    "maceio": "AL",
    "aracaju": "SE",
    "vitoria": "ES",
    "rio branco": "AC",
    "araxa": "MG",
    "acucareira": "MG",
    "alvinopolis": "MG",
    "antonio carlos": "MG",
    "araujos": "MG",
    "arcos": "MG",
    "astolfo dutra": "MG",
    "barbacena": "MG",
    "betim": "MG",
    "brejo bonito": "MG",
    "bueno brandao": "MG",
    "campanario": "MG"
    // ... adicione mais cidades e seus respectivos estados aqui
};


function extrairEstado(local) {
  const s = (local || "").trim();
  // 1. Tenta extrair UF explícita
  let m = s.match(/(?:^|[\s\-–—\/,(\[])([A-Z]{2})\s*[\])]?$/i);
  if (m) return m[1].toUpperCase();

  // 2. Se não encontrou UF explícita, tenta inferir pela cidade
  const cidadeExtraida = extrairCidade(local);
  if (cidadeExtraida) {
      // Normaliza a cidade extraída antes de consultar o mapa
      const ufInferida = CIDADES_PARA_UF[normalizeStringForComparison(cidadeExtraida)];
      if (ufInferida) return ufInferida;
  }
  return "";
}

const ADDRESS_WORDS = new Set([
  "av","av.","avenida","rua","r","r.","rodovia","estrada","est","travessa","tv","alameda","al.","al",
  "praça","praca","pça","pç","largo","km","quadra","qd","lote","lt","nº","no","sn","s/n","esquina",
  "prox","próx","proximo","próximo","arena","shopping","parque","estádio","estadio","ginásio","ginasio",
  "condominio","condomínio","bairro","portal","residencial","cond.","cond","br",
  "centro", "distrito", "municipal", "nacional", "internacional", "clube", "complexo", "vila", "jardim",
  "setor", "lago", "lagoa", "praia", "serra", "vale", "morro", "ponte", "viaduto", "túnel", "tunel",
  "terminal", "estação", "estacao", "aeroporto", "rodoviária", "rodoviaria", "hospital", "escola",
  "universidade", "faculdade", "igreja", "templo", "mesquita", "sinagoga", "teatro", "museu", "galeria",
  "biblioteca", "prefeitura", "camara", "câmara", "forum", "fórum", "tribunal", "delegacia", "batalhão",
  "batalhao", "quartel", "base", "posto", "parada", "ponto", "passarela", "passagem", "shopping center",
  "mercado", "feira", "supermercado", "hipermercado", "armazém", "armazem", "depósito", "deposito", "fábrica",
  "fabrica", "indústria", "industria", "escritório", "escritorio", "consultório", "consultorio", "clínica",
  "clinica", "laboratório", "laboratorio", "farmácia", "farmacia", "padaria", "restaurante", "bar", "café",
  "cafe", "lanchonete", "pizzaria", "churrascaria", "hotel", "pousada", "motel", "resort",
  "norte", "sul", "leste", "oeste", "central", "principal", "secundário", "secundario", "novo", "velho",
  "antigo", "grande", "pequeno", "alto", "baixo", "primeiro", "segundo", "terceiro", "quarto", "quinto",
  "frente", "fundo", "lateral", "barraca", "barracas", "barracao", "barracão", "santo", "santa", "são", "sao",
  "bi" // Adicionado para Batalhão de Infantaria
]);

function limparTextoBasico(s) {
  // Remove caracteres especiais e múltiplos espaços, e limpa bordas
  return s
    .replace(/[|•]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\d]+/gu, "") // Permite números no início para endereços
    .replace(/[^\p{L}\d]+$/gu, "") // Permite números no final
    .trim();
}

function ehCidadeProvavel(nome) {
  if (!nome) return false;
  
  // Remove números no final que podem ser CEPs ou números de endereço
  let nomeLimpo = nome.replace(/\s*\d{5}-?\d{3}$/, '').trim(); // Remove CEP
  nomeLimpo = nomeLimpo.replace(/\s*\d+$/, '').trim(); // Remove número de endereço

  // --- NOVAS REGRAS DE REJEIÇÃO (mantidas) ---
  // 1. Rejeita padrões como "35º BI", "KM 10", etc.
  if (/\d+º\s*\w+/i.test(nomeLimpo) || /km\s*\d+/i.test(nomeLimpo)) {
      return false;
  }

  const tokens = nomeLimpo.toLowerCase().split(/\s+/); // Define tokens mais cedo para a próxima regra

  // 2. Rejeita segmentos de uma única palavra que são puramente numéricos ou muito curtos (<= 2 caracteres)
  if (tokens.length === 1) {
      const token = tokens[0];
      if (/^\d+$/.test(token) || token.length <= 2) {
          return false;
      }
  }
  // --- FIM DAS NOVAS REGRAS ---

  // Verifica tamanho - cidades raramente têm mais de 30 caracteres
  if (nomeLimpo.length < 3 || nomeLimpo.length > 30) return false;
  
  // Deve conter vogais
  if (!/[aeiouáàâãéèêíìîóòôõúùû]/i.test(nomeLimpo)) return false;

  // Se tem mais de 4 palavras, provavelmente é um endereço completo
  if (tokens.length > 4) return false;
  
  // Conta quantas palavras de endereço existem
  const addressWordCount = tokens.filter(t => ADDRESS_WORDS.has(t)).length;
  
  // Se tem mais de 1 palavra de endereço, provavelmente não é uma cidade
  if (addressWordCount > 1) return false;
  
  // REMOVIDO: if (ADDRESS_WORDS.has(tokens[0])) return false; 
  // Esta regra foi removida porque estava rejeitando cidades válidas que começam com palavras comuns de endereço (ex: "Ponte Nova")
  
  // Verifica se tem palavras muito comuns em endereços mas não em nomes de cidades
  const enderecoCompleto = nomeLimpo.toLowerCase();
  if (enderecoCompleto.includes("em frente") || 
      enderecoCompleto.includes("esquina") ||
      enderecoCompleto.includes("próximo") ||
      enderecoCompleto.includes("proximo") ||
      enderecoCompleto.includes("ao lado") ||
      enderecoCompleto.includes("atrás") ||
      enderecoCompleto.includes("atras")) {
    return false;
  }
  
  // Se passou por todos os filtros, provavelmente é uma cidade
  return true;
}

function extrairCidade(local) {
  let s = (local || "").replace(/[|]+/g, " ").trim();

  // Tenta remover uma UF explícita se presente no final
  s = s.replace(/(?:^|[\s\-–—\/,(\[])([A-Z]{2})\s*[\])]?$/i, "").trim();

  // Divide a string por delimitadores comuns e limpa cada segmento
  const segmentos = s.split(/[-–—\/,>]+/).map(seg => limparTextoBasico(seg)).filter(Boolean);

  // Itera de trás para frente para encontrar a cidade mais provável
  for (let i = segmentos.length - 1; i >= 0; i--) {
    const cand = segmentos[i];
    if (ehCidadeProvavel(cand)) return titleCase(cand);
  }

  // Se não encontrou nada claro, tenta com a string inteira limpa
  const fallback = limparTextoBasico(s);
  if (ehCidadeProvavel(fallback)) return titleCase(fallback);

  return ""; // Retorna vazio se não conseguir extrair uma cidade provável
}

// -------- Fontes --------
function normalizarFonte(f) {
  if (!f) return "";
  const nome = f.trim();
  if (nome.startsWith("http")) {
    try {
      const dominio = new URL(nome).hostname.replace(/^www\./, "");
      return dominio.split(".")[0].toLowerCase();
    } catch {}
  }
  return nome.toLowerCase();
}

function fonteLabelBonitinha(fonte, keyOverride) {
  const key = (keyOverride || normalizarFonte(fonte) || '').toLowerCase();
  if (key && FONTE_NOMES_BONITOS[key]) return FONTE_NOMES_BONITOS[key];

  if (!fonte) return "";
  if (fonte.startsWith("http")) {
    try {
      const dominio = new URL(fonte).hostname.replace(/^www\./, "");
      const slug = dominio.split(".")[0];
      const label = titleCase(slug);
      return label.replace(/\b(De|Da|Do|Dos|Das|E)\b/g, s => s.toLowerCase());
    } catch {}
  }
  return titleCase(fonte).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, s => s.toLowerCase());
}

// -------- URLs (robustas) --------
function looksLikeDomain(token) { return /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(token.trim()); }
function ensureProtocol(u) { return /^https?:\/\//i.test(u) ? u : ("https://" + u); }
function isValidHttpUrl(u) {
  try {
    const url = new URL(u);
    return (url.protocol === "http:" || url.protocol === "https:") && looksLikeDomain(url.hostname);
  } catch { return false; }
}
function sanitizeUrlStrict(raw) {
  if (!raw) return "";
  let u = raw.trim();
  if (looksLikeDomain(u)) u = ensureProtocol(u);
  else if (/^https?:\/\//i.test(u)) {
    // ok
  } else {
    const m = u.match(/([a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s"]*)?/i);
    if (m) u = ensureProtocol(m[0]); else return "";
  }
  return isValidHttpUrl(u) ? u : "";
}
function firstUrlFromText(text) {
  if (!text) return "";
  const m = text.match(/https?:\/\/[^\s"]+/i);
  return m ? sanitizeUrlStrict(m[0]) : "";
}
function pickBestLinkFromColumns(cols) {
  const primary = sanitizeUrlStrict(cols[4] || "");
  if (primary) return primary;

  const candidates = new Set();
  for (const c of cols) {
    const u = firstUrlFromText(c);
    if (u) candidates.add(u);
  }
  for (const c of cols) {
    if (!c) continue;
    const tokens = c.split(/\s+/);
    for (const t of tokens) {
      if (looksLikeDomain(t)) {
        const u = sanitizeUrlStrict(t);
        if (u) candidates.add(u);
      }
    }
  }
  if (candidates.size === 0) return "";

  const list = Array.from(candidates);
  const score = (u) => {
    const s = u.toLowerCase();
    let pts = 0;
    if (/inscri|inscrev|ticket|ingress|cadastro/.test(s)) pts += 10;
    if (/sympla|doity|even3|eventbrite|blueti|minhasinscric|cronochip|chiptime|tckt|ticketsp|ticketeira|run|chip/.test(s)) pts += 6;
    if (/event|evento/.test(s)) pts += 2;
    try { const url = new URL(u); if (url.pathname && url.pathname.length > 1) pts += 2; } catch {}
    return pts;
  };
  list.sort((a,b)=> score(b) - score(a));
  return list[0];
}

// ======================== UI: CARDS ========================
function criarCardEvento(evento) {
  const fonteFormatada = fonteLabelBonitinha(evento.fonte, normalizarFonte(evento.fonte));
  
  // Extrai cidade e estado para exibição padronizada
  const cidade = extrairCidade(evento.local);
  const estado = extrairEstado(evento.local);
  let localFormatado = "";
  
  if (cidade && estado) {
    localFormatado = `${cidade}, ${estado}`;
  } else if (cidade) {
    localFormatado = cidade;
  } else if (estado) {
    localFormatado = UF_NOMES[estado] || estado;
  } else {
    // Se não conseguir extrair nem cidade nem estado, usa o local original truncado
    localFormatado = evento.local.length > 30 ? evento.local.substring(0, 30) + "..." : evento.local;
  }
  
  const iconeLocalizacao = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#0d4550" viewBox="0 0 16 16">
      <path d="M8 0a5.53 5.53 0 0 0-5.5 5.5c0 4.5 5.5 10.5 5.5 10.5S13.5 10 13.5 5.5A5.53 5.53 0 0 0 8 0zm0 8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
    </svg>`;

  const href = evento.link && isValidHttpUrl(evento.link) ? evento.link : "#";

  return `
    <div class="card">
      <div class="card-content">
        <div class="card-header">
          <div class="card-date">${formatarDataBR(evento.data)}</div>
          <div class="card-source">${fonteFormatada}</div>
        </div>
        <h3 class="card-title">${evento.titulo}</h3>
        <div class="card-location">${iconeLocalizacao} ${localFormatado}</div>
        <div class="card-spacer"></div>
        <div class="card-actions">
          <a class="btn-primary" href="${href}" target="_blank" rel="noopener noreferrer">INSCREVA-SE</a>
        </div>
      </div>
    </div>
  `;
}

// utilitário pra achar o botão, qualquer seletor comum
function getLoadMoreEl() {
  return document.querySelector('.load-more') ||
         document.querySelector('#loadMore') ||
         document.querySelector('[data-load-more]') ||
         document.querySelector('.btn-load-more');
}

function atualizarBotaoLoadMore() {
  const btn = getLoadMoreEl();
  if (!btn) return;
  const hasMore = eventosExibidos < eventosFiltrados.length;
  if (hasMore) {
    btn.style.display = "";
    btn.hidden = false;
    btn.setAttribute('aria-hidden', 'false');
    btn.disabled = false;
    btn.style.pointerEvents = "";
    btn.style.opacity = "";
  } else {
    btn.style.display = "none";
    btn.hidden = true;
    btn.setAttribute('aria-hidden', 'true');
    btn.disabled = true;
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0";
  }
}

function renderizarEventos() {
  const grid = document.getElementById('cardsGrid');
  const eventosParaExibir = eventosFiltrados.slice(0, eventosExibidos + eventosPorPagina);
  grid.innerHTML = eventosParaExibir.map(criarCardEvento).join('');
  eventosExibidos = eventosParaExibir.length;

  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) {
    resultsCount.textContent = `Mostrando ${eventosExibidos} de ${eventosFiltrados.length} eventos`;
  }

  atualizarBotaoLoadMore();
}

function loadMore() { renderizarEventos(); }

// ======================== FILTROS & FACETAS ========================
function aplicaFiltrosBase(lista, f, ignorar = null) {
  return lista.filter(ev => {
    const _cidade = extrairCidade(ev.local);
    const _estado = extrairEstado(ev.local);
    const _mes = mes2(ev.data);

    // Normaliza os valores dos filtros para comparação
    const fBuscaNormalizada = normalizeStringForComparison(f.busca);
    const fCidadeNormalizada = normalizeStringForComparison(f.cidade);
    const fEstadoNormalizado = normalizeStringForComparison(f.estado);
    const fFonteNormalizada = normalizeStringForComparison(f.fonte);

    const evTituloNormalizado = normalizeStringForComparison(ev.titulo);
    const evCidadeNormalizada = normalizeStringForComparison(_cidade);
    const evEstadoNormalizado = normalizeStringForComparison(_estado);
    const evFonteNormalizada = normalizeStringForComparison(ev.fonte);

    const matchBusca  = ignorar === 'busca'  || !fBuscaNormalizada  || evTituloNormalizado.includes(fBuscaNormalizada);
    const matchEstado = ignorar === 'estado' || !fEstadoNormalizado || evEstadoNormalizado === fEstadoNormalizado;
    const matchCidade = ignorar === 'cidade' || !fCidadeNormalizada || evCidadeNormalizada === fCidadeNormalizada;
    const matchMes    = ignorar === 'mes'    || !f.mes    || _mes === f.mes;
    const matchFonte  = ignorar === 'fonte'  || !fFonteNormalizada  || evFonteNormalizada === fFonteNormalizada;

    return matchBusca && matchEstado && matchCidade && matchMes && matchFonte;
  });
}

// Estados
function atualizarSelectEstados(select, estadosUFSet) {
  const atual = select.value;
  select.innerHTML = '';
  select.appendChild(new Option('Todos os estados', ''));
  const lista = Array.from(estadosUFSet).sort((a,b)=>{
    const A = UF_NOMES[a] || a, B = UF_NOMES[b] || b;
    return A.localeCompare(B,'pt-BR',{sensitivity:'base'});
  });
  for (const uf of lista) select.appendChild(new Option(UF_NOMES[uf] || uf, uf));
  select.value = (atual && estadosUFSet.has(atual)) ? atual : '';
}

// Cidades (desabilitado até escolher UF)
function atualizarSelectCidades(select, cidadesSet) {
  const atual = select.value;
  select.innerHTML = '';
  select.appendChild(new Option('Todas as cidades', ''));
  // A lista de cidades deve ser exibida em Title Case, mas ordenada pela versão normalizada
  const lista = Array.from(cidadesSet).sort((a,b)=>normalizeStringForComparison(a).localeCompare(normalizeStringForComparison(b),'pt-BR',{sensitivity:'base'}));
  for (const c of lista) select.appendChild(new Option(c, c));
  // A cidade só é habilitada se um estado for selecionado E houver cidades para aquele estado
  select.disabled = !filtros.estado || lista.length === 0;
  select.value = (atual && cidadesSet.has(atual) && !!filtros.estado) ? atual : '';
}

// Meses
function atualizarSelectMeses(select, mesesSet) {
  const atual = select.value;
  select.innerHTML = '';
  select.appendChild(new Option('Todos os meses', ''));
  const lista = Array.from(mesesSet).sort();
  for (const m of lista) select.appendChild(new Option(MESES_PT[m] || m, m));
  select.value = (atual && mesesSet.has(atual)) ? atual : '';
}

// Fontes — COM CONTADOR (N) e nome bonitinho
function atualizarSelectFontes(select, fontesMap, count) {
  const atual = select.value;
  select.innerHTML = '';
  const opt0 = new Option(`Todas as fontes${typeof count === 'number' ? ' (' + count + ')' : ''}`, '');
  select.appendChild(opt0);

  const itens = Array.from(fontesMap.entries())
    .map(([k, r]) => [k, fonteLabelBonitinha(r, k)]);
  itens.sort((a,b)=>a[1].localeCompare(b[1],'pt-BR',{sensitivity:'base'}));

  for (const [key, label] of itens) select.appendChild(new Option(label, key));
  select.value = (atual && fontesMap.has(atual)) ? atual : '';
}

function atualizarFacetas(skipSelectId = null) {
  // Dados para estados: ignora o filtro de estado para mostrar todos os estados possíveis
  const dadosParaEstado = aplicaFiltrosBase(todosEventos, filtros, 'estado');
  const estadosUF = new Set(dadosParaEstado.map(ev => extrairEstado(ev.local)).filter(Boolean));

  // Dados para cidades:
  let baseCidades = aplicaFiltrosBase(todosEventos, { ...filtros, cidade: '' }, 'cidade');
  if (filtros.estado) {
      baseCidades = baseCidades.filter(ev => extrairEstado(ev.local) === filtros.estado);
  }
  // Adiciona as cidades normalizadas ao Set, mas mantém o Title Case para exibição
  const cidadesSet = new Set(baseCidades.map(ev => extrairCidade(ev.local)).filter(Boolean));

  // Meses possíveis
  const dadosParaMes = aplicaFiltrosBase(todosEventos, filtros, 'mes');
  const mesesSet = new Set(dadosParaMes.map(ev => mes2(ev.data)).filter(m => /^\d{2}$/.test(m)));

  // Fontes — ignora APENAS o filtro 'fonte' para contar as disponíveis no contexto
  const fontesBase = aplicaFiltrosBase(todosEventos, filtros, 'fonte');
  const fontesMap = new Map();
  for (const ev of fontesBase) {
    const key = normalizarFonte(ev.fonte);
    if (!key) continue;
    if (!fontesMap.has(key)) {
      let rotulo = ev.fonte;
      if ((ev.fonte || '').startsWith('http')) {
        try { const dominio = new URL(ev.fonte).hostname.replace(/^www\./, ""); rotulo = dominio.split(".")[0]; } catch {}
      }
      fontesMap.set(key, rotulo);
    }
  }
  const fontesCount = fontesMap.size;

  // Atualiza cabeçalho (#totalFontes), se existir
  const totalFontesEl = document.getElementById('totalFontes');
  if (totalFontesEl) totalFontesEl.textContent = fontesCount.toLocaleString('pt-BR');

  const estadoSelect = document.getElementById('estadoFilter');
  const cidadeSelect = document.getElementById('cidadeFilter');
  const mesSelect    = document.getElementById('mesFilter');
  const fonteSelect  = document.getElementById('fonteFilter');

  if (estadoSelect && skipSelectId !== 'estadoFilter') atualizarSelectEstados(estadoSelect, estadosUF);
  if (cidadeSelect && skipSelectId !== 'cidadeFilter') atualizarSelectCidades(cidadeSelect, cidadesSet);
  if (mesSelect && skipSelectId !== 'mesFilter') atualizarSelectMeses(mesSelect, mesesSet);
  if (fonteSelect && skipSelectId !== 'fonteFilter') atualizarSelectFontes(fonteSelect, fontesMap, fontesCount);
}

function aplicarFiltros(eventSourceId = null) {
  const searchInput = document.getElementById('searchInput');
  const estadoSelect = document.getElementById('estadoFilter');
  const cidadeSelect = document.getElementById('cidadeFilter');
  const mesSelect = document.getElementById('mesFilter');
  const fonteSelect = document.getElementById('fonteFilter');

  // Normaliza os valores dos filtros ao serem lidos do DOM
  filtros.busca  = normalizeStringForComparison(searchInput?.value || '');
  filtros.estado = (estadoSelect?.value || '').trim(); // UF já é padronizada
  filtros.cidade = normalizeStringForComparison(cidadeSelect?.value || '');
  filtros.mes    = (mesSelect?.value || '').trim();
  filtros.fonte  = normalizeStringForComparison(fonteSelect?.value || '');

  eventosFiltrados = aplicaFiltrosBase(todosEventos, filtros);
  eventosExibidos = 0;

  const totalEvents = document.getElementById('totalEvents');
  if (totalEvents) totalEvents.textContent = eventosFiltrados.length.toLocaleString('pt-BR');

  renderizarEventos();
  atualizarFacetas(eventSourceId);
}

function clearFilters() {
  ['searchInput','estadoFilter','cidadeFilter','mesFilter','fonteFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
  });

  filtros.busca = filtros.estado = filtros.cidade = filtros.mes = filtros.fonte = '';
  eventosFiltrados = [...todosEventos];
  eventosExibidos = 0;

  const totalEvents = document.getElementById('totalEvents');
  if (totalEvents) totalEvents.textContent = todosEventos.length.toLocaleString('pt-BR');

  atualizarFacetas();
  renderizarEventos();
}

// ======================== CARREGAMENTO ========================
async function carregarEventos() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'block';

  try {
    const resp = await fetch(PLANILHA_CSV, { cache: 'no-store' });
    const texto = await resp.text();

    const linhas = texto.split(/\r?\n/).filter(l => l.trim() !== '');
    const body = linhas.slice(1);

    todosEventos = body
      .map(parseCSVLine)
      .filter(cols => cols.length >= 3)
      .map(cols => {
        const titulo = cols[0] || '';
        const data   = cols[1] || '';
        const local  = cols[2] || '';
        const fonte  = cols[3] || '';
        const melhorLink = pickBestLinkFromColumns(cols);
        const link = melhorLink || "#";
        return { titulo, data, local, fonte, link };
      })
      .filter(ev => (ev.titulo || ev.data || ev.local));

    eventosFiltrados = [...todosEventos];
    eventosExibidos = 0;

    const totalEvents = document.getElementById('totalEvents');
    if (totalEvents) totalEvents.textContent = todosEventos.length.toLocaleString('pt-BR');

    atualizarFacetas();
    renderizarEventos();
  } catch (e) {
    console.error("Erro ao carregar planilha:", e);
    alert("Não foi possível carregar os eventos. Tente novamente mais tarde.");
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

// ======================== DOM ========================
document.addEventListener('DOMContentLoaded', () => {
  carregarEventos();

  const searchInput = document.getElementById('searchInput');
  const estadoSelect = document.getElementById('estadoFilter');
  const cidadeSelect = document.getElementById('cidadeFilter');
  const mesSelect = document.getElementById('mesFilter');
  const fonteSelect = document.getElementById('fonteFilter');

  if (searchInput)  searchInput.addEventListener('input',  () => aplicarFiltros('searchInput'));
  if (estadoSelect) estadoSelect.addEventListener('change', () => {
    const cidadeSel = document.getElementById('cidadeFilter');
    if (cidadeSel) cidadeSel.value = ''; // Limpa a cidade ao mudar o estado
    aplicarFiltros('estadoFilter');
  });
  if (cidadeSelect) cidadeSelect.addEventListener('change', () => aplicarFiltros('cidadeFilter'));
  if (mesSelect)    mesSelect.addEventListener('change',    () => aplicarFiltros('mesFilter'));
  if (fonteSelect)  fonteSelect.addEventListener('change',  () => aplicarFiltros('fonteFilter'));

  const btn = getLoadMoreEl();
  if (btn) btn.addEventListener('click', loadMore);

  const clearBtn = document.getElementById('clearFilters');
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);
});
