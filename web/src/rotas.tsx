import { createBrowserRouter, Navigate } from 'react-router'
import { CascaPainel } from './superficies/painel/CascaPainel'
import { PainelAps } from './superficies/painel/aps/PainelAps'
import { PainelLideranca } from './superficies/painel/lideranca/PainelLideranca'
import { PainelRh } from './superficies/painel/rh/PainelRh'
import { PainelTotens } from './superficies/painel/totens/PainelTotens'
import { PainelWhatsapp } from './superficies/painel/whatsapp/PainelWhatsapp'
import { EscolhaDeUnidade } from './superficies/totem/EscolhaDeUnidade'
import { PaginaTotem } from './superficies/totem/PaginaTotem'
import { PaginaTrabalhador } from './superficies/trabalhador/PaginaTrabalhador'

// Cada superfície tem público, aparelho e limite de privacidade próprios (docs/produto.md).
// Celular e totem são telas inteiras; os três painéis dividem a mesma casca.
export const rotas = createBrowserRouter([
  { path: '/', element: <Navigate to="/painel/aps" replace /> },

  // Celular do trabalhador: o link pessoal que chega pelo WhatsApp.
  { path: '/t/:token', element: <PaginaTrabalhador /> },

  // Totem na unidade: tela pública no chão de fábrica.
  { path: '/totem', element: <EscolhaDeUnidade /> },
  { path: '/totem/:unidade', element: <PaginaTotem /> },

  {
    path: '/painel',
    element: <CascaPainel />,
    children: [
      { index: true, element: <Navigate to="aps" replace /> },
      { path: 'aps', element: <PainelAps /> },
      { path: 'whatsapp', element: <PainelWhatsapp /> },
      { path: 'totens', element: <PainelTotens /> },
      { path: 'lideranca', element: <PainelLideranca /> },
      { path: 'rh', element: <PainelRh /> },
    ],
  },

  { path: '*', element: <Navigate to="/painel/aps" replace /> },
])
