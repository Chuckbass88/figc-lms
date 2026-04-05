import { MessageSquare } from 'lucide-react'

export default function MessaggiPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-gray-50/50">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#EFF4FF' }}>
        <MessageSquare size={28} style={{ color: '#1565C0' }} />
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">I tuoi messaggi</h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
        Seleziona una conversazione dalla lista oppure inizia una nuova chat con il pulsante <strong>+</strong>.
      </p>
    </div>
  )
}
