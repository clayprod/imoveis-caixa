import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ArrowRight } from 'lucide-react'
import Sidebar from '../components/app/Sidebar'
import PropertyCard from '../components/app/PropertyCard'
import { getFavoriteProperties } from '../lib/mockUserData'

export default function Favorites() {
  const navigate = useNavigate()
  const [items] = useState(() => getFavoriteProperties())

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pl-0">
        <header className="card-glass rise-in flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-amber)] text-[var(--color-ink)]">
            <Heart size={18} className="fill-current" />
          </div>
          <div>
            <h1 className="font-display text-[20px] font-700 leading-tight text-[var(--color-ink)]">
              Favoritos
            </h1>
            <p className="mt-0.5 text-[12px] text-[var(--color-ink-mute)]">
              {items.length} {items.length === 1 ? 'imóvel salvo' : 'imóveis salvos'} pra acompanhar
            </p>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1.5 text-[12px] font-500 text-[var(--color-ink)] hover:border-[var(--color-ink-soft)]"
          >
            Buscar mais <ArrowRight size={12} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="card-paper rise-in flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Heart size={40} strokeWidth={1.4} className="text-[var(--color-ink-mute)]" />
            <h2 className="font-display text-[16px] font-700 text-[var(--color-ink)]">
              Você ainda não favoritou nenhum imóvel
            </h2>
            <p className="max-w-sm text-[13px] text-[var(--color-ink-mute)]">
              Use o coraçãozinho nos cards da busca ou nos detalhes pra salvar imóveis aqui.
            </p>
            <button
              onClick={() => navigate('/search')}
              className="mt-2 rounded-full bg-[var(--color-ink)] px-4 py-2 text-[13px] font-600 text-[var(--color-paper)] hover:bg-[var(--color-moss-700)]"
            >
              Ir para a busca
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((p, i) => (
              <div key={p.id} className="rise-in" style={{ animationDelay: `${50 + i * 40}ms` }}>
                <PropertyCard property={{ ...p, favorited: true }} onClick={() => navigate(`/property/${p.id}`)} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
