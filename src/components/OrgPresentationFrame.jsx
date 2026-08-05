// Cadre décoratif pour le template "Présentation" : fond dégradé + bandeau titre vertical
export default function OrgPresentationFrame({ active, company, children }) {
  if (!active) return children;

  return (
    <div
      className="relative rounded-xl border border-slate-200 shadow-lg overflow-hidden mx-auto"
      style={{
        background: 'radial-gradient(circle at 15% 15%, #F1F7F5 0%, #E8F1F4 45%, #FFFFFF 100%)',
        minWidth: 'max-content',
      }}
    >
      {/* Formes décoratives */}
      <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'rgba(15, 118, 110, 0.05)' }} />
      <div className="absolute right-10 bottom-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'rgba(0, 61, 122, 0.04)' }} />

      <div className="flex">
        {/* Bandeau titre vertical */}
        <div
          className="flex-shrink-0 w-12 flex items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #0F766E 0%, #003D7A 100%)' }}
        >
          <span
            className="font-heading font-semibold text-white text-sm tracking-wide whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Organigramme {company?.name ? `— ${company.name}` : "d'entreprise"}
          </span>
        </div>

        {/* Contenu */}
        <div className="flex-1 p-8 pt-10">{children}</div>
      </div>
    </div>
  );
}